import {
  type JsonObject,
  ServiceNowClient,
  ServiceNowError,
} from "./servicenow.js";

const SYS_ID_RE = /^[0-9a-f]{32}$/i;
const SCOPE_RE = /^(global|[a-z][a-z0-9_]{0,79})$/;
const UPDATE_NAME_RE = /^[A-Za-z0-9_.:-]+$/;

export interface PreferenceSnapshot {
  name: string;
  existed: boolean;
  sys_id: string | null;
  value: string | null;
}

export interface DevelopmentContextSnapshot {
  version: 1;
  profile: string;
  instance: string;
  user_sys_id: string;
  scope_sys_id: string;
  preferences: PreferenceSnapshot[];
}

export interface SetUpdateSetContextInput {
  scope: string;
  updateSetSysId?: string;
  name?: string;
  description?: string;
}

export async function getDevelopmentContext(
  client: ServiceNowClient,
  requestedScope?: string,
): Promise<JsonObject> {
  const identity = await authenticatedIdentity(client);
  const appPreference = await findPreference(
    client,
    identity.userSysId,
    "apps.current_app",
  );
  const updateSetPreference = await findPreference(
    client,
    identity.userSysId,
    "sys_update_set",
  );

  const scopeInput = requestedScope ??
    scalar(appPreference?.value);
  const scope = scopeInput
    ? await resolveScope(client, scopeInput)
    : null;
  const scopedPreference = scope
    ? await findPreference(
        client,
        identity.userSysId,
        scopedPreferenceName(scope.sysId),
      )
    : null;
  const updateSetSysId = scalar(
    updateSetPreference?.value,
  );
  const currentUpdateSet = updateSetSysId &&
      SYS_ID_RE.test(updateSetSysId)
    ? await client.get(
        "sys_update_set",
        updateSetSysId,
        [
          "sys_id",
          "name",
          "state",
          "application",
          "sys_updated_on",
        ],
        "all",
      )
    : null;

  return {
    profile: client.profile,
    instance: client.instance.origin,
    authenticated_user: identity.user,
    scope: scope
      ? {
          sys_id: scope.sysId,
          scope: scope.scope,
          name: scope.name,
        }
      : null,
    preferences: {
      apps_current_app: appPreference,
      sys_update_set: updateSetPreference,
      scoped_update_set: scopedPreference,
    },
    current_update_set: currentUpdateSet,
  };
}

export async function setUpdateSetContext(
  client: ServiceNowClient,
  input: SetUpdateSetContextInput,
): Promise<JsonObject> {
  const scope = await resolveScope(client, input.scope);
  const identity = await authenticatedIdentity(client);
  const preferenceNames = [
    "apps.current_app",
    "sys_update_set",
    scopedPreferenceName(scope.sysId),
  ];
  const snapshot: DevelopmentContextSnapshot = {
    version: 1,
    profile: client.profile,
    instance: client.instance.origin,
    user_sys_id: identity.userSysId,
    scope_sys_id: scope.sysId,
    preferences: await Promise.all(
      preferenceNames.map(async name => {
        const preference = await findPreference(
          client,
          identity.userSysId,
          name,
        );

        return {
          name,
          existed: Boolean(preference),
          sys_id: scalar(preference?.sys_id) ?? null,
          value: scalar(preference?.value) ?? null,
        };
      }),
    ),
  };

  let createdUpdateSet: JsonObject | null = null;

  try {
    await setPreference(
      client,
      identity.userSysId,
      "apps.current_app",
      scope.sysId,
    );

    const updateSet = input.updateSetSysId
      ? await requireUpdateSet(
          client,
          input.updateSetSysId,
          scope.sysId,
        )
      : await createUpdateSet(
          client,
          scope.sysId,
          input.name ?? "",
          input.description ?? "",
        );

    if (!input.updateSetSysId) {
      createdUpdateSet = updateSet;
    }

    validateUpdateSet(updateSet, scope.sysId);

    const updateSetSysId = requireSysId(
      scalar(updateSet.sys_id),
      "Created update set did not return a valid sys_id",
    );

    await setPreference(
      client,
      identity.userSysId,
      scopedPreferenceName(scope.sysId),
      updateSetSysId,
    );
    await setPreference(
      client,
      identity.userSysId,
      "sys_update_set",
      updateSetSysId,
    );

    const context = await getDevelopmentContext(
      client,
      scope.sysId,
    );
    const currentUpdateSet = context.current_update_set;

    if (
      !currentUpdateSet ||
      typeof currentUpdateSet !== "object" ||
      scalar(
        (currentUpdateSet as JsonObject).sys_id,
      ) !== updateSetSysId
    ) {
      throw new ServiceNowError(
        "Update-set context verification failed",
        409,
      );
    }

    return {
      snapshot,
      scope: {
        sys_id: scope.sysId,
        scope: scope.scope,
        name: scope.name,
      },
      update_set: updateSet,
      created: !input.updateSetSysId,
      context,
    };
  } catch (error) {
    if (createdUpdateSet) {
      const createdSysId = scalar(
        createdUpdateSet.sys_id,
      );

      if (createdSysId && SYS_ID_RE.test(createdSysId)) {
        try {
          await client.update(
            "sys_update_set",
            createdSysId,
            { state: "ignore" },
          );
        } catch {
          // Preference restoration below is still required.
        }
      }
    }

    let rollbackMessage = "Context preferences restored.";

    try {
      await restoreDevelopmentContext(client, snapshot);
    } catch (rollbackError) {
      rollbackMessage =
        `Context rollback failed: ${errorMessage(rollbackError)}`;
    }

    throw new ServiceNowError(
      `${errorMessage(error)} ${rollbackMessage}`,
      error instanceof ServiceNowError
        ? error.status
        : 500,
    );
  }
}

export async function restoreDevelopmentContext(
  client: ServiceNowClient,
  snapshot: DevelopmentContextSnapshot,
): Promise<JsonObject> {
  const identity = await authenticatedIdentity(client);
  validateSnapshot(client, identity.userSysId, snapshot);
  const actions: JsonObject[] = [];

  for (const saved of snapshot.preferences) {
    const current = await findPreference(
      client,
      identity.userSysId,
      saved.name,
    );
    const currentSysId = scalar(current?.sys_id);

    if (saved.existed) {
      if (currentSysId) {
        await client.update(
          "sys_user_preference",
          currentSysId,
          { value: saved.value ?? "" },
        );
        actions.push({
          name: saved.name,
          action: "restored",
          sys_id: currentSysId,
        });
      } else {
        const created = await client.create(
          "sys_user_preference",
          {
            user: identity.userSysId,
            name: saved.name,
            value: saved.value ?? "",
          },
        );
        actions.push({
          name: saved.name,
          action: "recreated",
          sys_id: scalar(created.sys_id) ?? null,
        });
      }
    } else if (currentSysId) {
      await client.removeTemporaryUserPreference(
        currentSysId,
      );
      actions.push({
        name: saved.name,
        action: "removed_temporary_preference",
        sys_id: currentSysId,
      });
    } else {
      actions.push({
        name: saved.name,
        action: "already_absent",
        sys_id: null,
      });
    }
  }

  for (const saved of snapshot.preferences) {
    const current = await findPreference(
      client,
      identity.userSysId,
      saved.name,
    );

    if (
      saved.existed &&
      scalar(current?.value) !== (saved.value ?? "")
    ) {
      throw new ServiceNowError(
        `Preference '${saved.name}' was not restored`,
        409,
      );
    }

    if (!saved.existed && current) {
      throw new ServiceNowError(
        `Temporary preference '${saved.name}' still exists`,
        409,
      );
    }
  }

  return {
    restored: true,
    profile: client.profile,
    user_sys_id: identity.userSysId,
    actions,
  };
}

export async function confirmUpdateCapture(
  client: ServiceNowClient,
  updateSetSysId: string,
  expectedApplication?: string,
  names?: string[],
): Promise<JsonObject> {
  requireSysId(
    updateSetSysId,
    "update_set_sys_id must be 32 hexadecimal characters",
  );
  const expectedScope = expectedApplication
    ? await resolveScope(client, expectedApplication)
    : null;
  const safeNames = names?.map(name => {
    if (!UPDATE_NAME_RE.test(name)) {
      throw new ServiceNowError(
        `Invalid customer update name '${name}'`,
        400,
      );
    }
    return name;
  });
  const query = `update_set=${updateSetSysId}` +
    (safeNames?.length
      ? `^nameIN${safeNames.join(",")}`
      : "");
  const rows = await client.query("sys_update_xml", {
    query,
    fields: [
      "sys_id",
      "name",
      "update_set",
      "application",
      "target_name",
      "type",
      "sys_created_on",
      "sys_updated_on",
    ],
    limit: 100,
    displayValue: "all",
  });
  const applications = [...new Set(
    rows
      .map(row => scalar(row.application))
      .filter((value): value is string => Boolean(value)),
  )];
  const foundNames = new Set(
    rows
      .map(row => scalar(row.name))
      .filter((value): value is string => Boolean(value)),
  );
  const missingNames = safeNames?.filter(
    name => !foundNames.has(name),
  ) ?? [];
  const wrongApplications = expectedScope
    ? applications.filter(
        application => application !== expectedScope.sysId,
      )
    : [];

  return {
    ok:
      missingNames.length === 0 &&
      wrongApplications.length === 0,
    count: rows.length,
    applications,
    expected_application: expectedScope?.sysId ?? null,
    missing_names: missingNames,
    wrong_applications: wrongApplications,
    rows,
  };
}

export function parseDevelopmentContextSnapshot(
  value: unknown,
): DevelopmentContextSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ServiceNowError(
      "snapshot must be an object returned by servicenow_set_update_set_context",
      400,
    );
  }

  const input = value as JsonObject;

  if (
    input.version !== 1 ||
    typeof input.profile !== "string" ||
    typeof input.instance !== "string" ||
    typeof input.user_sys_id !== "string" ||
    typeof input.scope_sys_id !== "string" ||
    !Array.isArray(input.preferences)
  ) {
    throw new ServiceNowError(
      "snapshot has an invalid shape",
      400,
    );
  }

  const preferences = input.preferences.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ServiceNowError(
        "snapshot preferences have an invalid shape",
        400,
      );
    }

    const saved = item as JsonObject;

    if (
      typeof saved.name !== "string" ||
      typeof saved.existed !== "boolean" ||
      !(typeof saved.sys_id === "string" || saved.sys_id === null) ||
      !(typeof saved.value === "string" || saved.value === null)
    ) {
      throw new ServiceNowError(
        "snapshot preferences have an invalid shape",
        400,
      );
    }

    return {
      name: saved.name,
      existed: saved.existed,
      sys_id: saved.sys_id,
      value: saved.value,
    };
  });

  return {
    version: 1,
    profile: input.profile,
    instance: input.instance,
    user_sys_id: input.user_sys_id,
    scope_sys_id: input.scope_sys_id,
    preferences,
  };
}

async function authenticatedIdentity(
  client: ServiceNowClient,
): Promise<{
  user: JsonObject;
  userSysId: string;
}> {
  const health = await client.health();
  const user = health.authenticated_user;

  if (!user || typeof user !== "object" || Array.isArray(user)) {
    throw new ServiceNowError(
      "Authenticated ServiceNow user could not be resolved",
      409,
    );
  }

  const userRecord = user as JsonObject;
  const userSysId = requireSysId(
    scalar(userRecord.sys_id),
    "Authenticated ServiceNow user has no valid sys_id",
  );

  return { user: userRecord, userSysId };
}

async function resolveScope(
  client: ServiceNowClient,
  input: string,
): Promise<{
  sysId: string;
  scope: string;
  name: string;
}> {
  const normalized = input.trim().toLowerCase();

  if (!SYS_ID_RE.test(normalized) && !SCOPE_RE.test(normalized)) {
    throw new ServiceNowError(
      "scope must be global, a technical scope name, or a 32-character sys_id",
      400,
    );
  }

  if (normalized === "global") {
    return {
      sysId: "global",
      scope: "global",
      name: "Global",
    };
  }

  const record = SYS_ID_RE.test(normalized)
    ? await client.get(
        "sys_scope",
        normalized,
        ["sys_id", "scope", "name"],
        "false",
      )
    : (await client.query("sys_scope", {
        query: `scope=${normalized}`,
        fields: ["sys_id", "scope", "name"],
        limit: 1,
      }))[0] ?? null;

  if (!record) {
    throw new ServiceNowError(
      `ServiceNow scope '${input}' was not found`,
      404,
    );
  }

  return {
    sysId: requireSysId(
      scalar(record.sys_id),
      "Resolved scope has no valid sys_id",
    ),
    scope: scalar(record.scope) ?? normalized,
    name: scalar(record.name) ?? normalized,
  };
}

async function findPreference(
  client: ServiceNowClient,
  userSysId: string,
  name: string,
): Promise<JsonObject | null> {
  return (await client.query("sys_user_preference", {
    query: `user=${userSysId}^name=${name}`,
    fields: ["sys_id", "name", "value", "user"],
    limit: 1,
  }))[0] ?? null;
}

async function setPreference(
  client: ServiceNowClient,
  userSysId: string,
  name: string,
  value: string,
): Promise<JsonObject> {
  const existing = await findPreference(
    client,
    userSysId,
    name,
  );
  const sysId = scalar(existing?.sys_id);

  return sysId
    ? client.update(
        "sys_user_preference",
        sysId,
        { value },
      )
    : client.create("sys_user_preference", {
        user: userSysId,
        name,
        value,
      });
}

async function requireUpdateSet(
  client: ServiceNowClient,
  updateSetSysId: string,
  expectedScopeSysId: string,
): Promise<JsonObject> {
  const sysId = requireSysId(
    updateSetSysId,
    "update_set_sys_id must be 32 hexadecimal characters",
  );
  const updateSet = await client.get(
    "sys_update_set",
    sysId,
    ["sys_id", "name", "state", "application", "description"],
    "all",
  );

  if (!updateSet) {
    throw new ServiceNowError(
      `Update set '${sysId}' was not found`,
      404,
    );
  }

  validateUpdateSet(updateSet, expectedScopeSysId);
  return updateSet;
}

async function createUpdateSet(
  client: ServiceNowClient,
  expectedScopeSysId: string,
  name: string,
  description: string,
): Promise<JsonObject> {
  if (!name.trim()) {
    throw new ServiceNowError(
      "name is required when update_set_sys_id is omitted",
      400,
    );
  }

  const updateSet = await client.create("sys_update_set", {
    name: name.trim(),
    description,
    application: expectedScopeSysId,
    state: "in progress",
  });

  return updateSet;
}

function validateUpdateSet(
  updateSet: JsonObject,
  expectedScopeSysId: string,
): void {
  const application = scalar(updateSet.application);
  const state = scalar(updateSet.state)?.toLowerCase();

  if (application !== expectedScopeSysId) {
    throw new ServiceNowError(
      `Update set application '${application ?? "unknown"}' does not match scope '${expectedScopeSysId}'`,
      409,
    );
  }

  if (state !== "in progress") {
    throw new ServiceNowError(
      "Update set must be in progress",
      409,
    );
  }
}

function validateSnapshot(
  client: ServiceNowClient,
  currentUserSysId: string,
  snapshot: DevelopmentContextSnapshot,
): void {
  if (
    snapshot.version !== 1 ||
    snapshot.profile !== client.profile ||
    snapshot.instance !== client.instance.origin ||
    snapshot.user_sys_id !== currentUserSysId
  ) {
    throw new ServiceNowError(
      "Snapshot does not belong to the selected profile, instance, and authenticated user",
      403,
    );
  }

  const allowed = new Set([
    "apps.current_app",
    "sys_update_set",
    scopedPreferenceName(snapshot.scope_sys_id),
  ]);

  if (
    snapshot.preferences.length !== 3 ||
    snapshot.preferences.some(saved => !allowed.has(saved.name)) ||
    new Set(snapshot.preferences.map(saved => saved.name)).size !== 3
  ) {
    throw new ServiceNowError(
      "Snapshot contains unexpected preference names",
      400,
    );
  }
}

function scopedPreferenceName(scopeSysId: string): string {
  return `updateSetForScope${scopeSysId}`;
}

function requireSysId(
  value: string | undefined,
  message: string,
): string {
  if (!value || !SYS_ID_RE.test(value)) {
    throw new ServiceNowError(message, 400);
  }

  return value;
}

function scalar(value: unknown): string | undefined {
  if (typeof value === "string") return value;

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const wrapped = value as JsonObject;

    if (typeof wrapped.value === "string") {
      return wrapped.value;
    }

    if (typeof wrapped.display_value === "string") {
      return wrapped.display_value;
    }
  }

  return undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

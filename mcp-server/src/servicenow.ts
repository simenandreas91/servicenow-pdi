import { env } from "./env.js";

export type JsonObject = Record<string, unknown>;
type FetchLike = typeof fetch;

const TABLE_RE = /^[A-Za-z0-9_]+$/;
const FIELD_RE = /^[A-Za-z0-9_]+$/;
const SYS_ID_RE = /^[0-9a-f]{32}$/i;
const SCOPE_RE = /^(global|[a-z][a-z0-9_]{0,79})$/;
const XPLORE_SCRIPT_MAX_LENGTH = 20_000;

const BLOCKED_TABLES = new Set([
  "oauth_credential",
  "sys_auth_profile_basic",
  "sys_user_token",
  "sys_certificate",
  "sys_credentials",
]);

const SECRET_FIELD_RE =
  /(^|_)(password|passwd|secret|access_token|refresh_token|private_key|credential|credentials)($|_)/i;

const SECRET_VALUE_HINT_RE =
  /(password|passwd|secret|token|private.?key|credential|api.?key)/i;

export class ServiceNowError extends Error {
  constructor(
    message: string,
    readonly status = 500,
    readonly detail?: unknown,
  ) {
    super(message);
  }
}

export interface ServiceNowOptions {
  profile?: string;
  instance?: string;
  username?: string;
  password?: string;
  fetchImpl?: FetchLike;
  writeEnabled?: boolean;
  deleteEnabled?: boolean;
  xploreEnabled?: boolean;
  writeTables?: string | string[];
  deleteTables?: string | string[];
  additionalBlockedTables?: string | string[];
}

export interface ServiceNowProfileSummary {
  profile: string;
  label: string;
  default: boolean;
  instance: string | null;
  configured: boolean;
  write_enabled: boolean;
  delete_enabled: boolean;
  xplore_enabled: boolean;
}

export interface TableShapeOptions {
  fields?: string[];
  includeChoices?: boolean;
}

export class ServiceNowClient {
  readonly profile: string;
  readonly profileLabel: string;
  readonly instance: URL;
  readonly writeEnabled: boolean;
  readonly deleteEnabled: boolean;
  readonly xploreEnabled: boolean;

  private readonly username: string;
  private readonly password: string;
  private readonly fetchImpl: FetchLike;
  private readonly writeTables: Set<string>;
  private readonly deleteTables: Set<string>;
  private readonly additionalBlockedTables: Set<string>;

  constructor(options: ServiceNowOptions = {}) {
    this.profile = resolveProfileName(options.profile);
    this.profileLabel =
      profileEnv(this.profile, "LABEL") ?? this.profile;

    this.instance = new URL(
      options.instance ?? requiredProfileEnv(this.profile, "INSTANCE"),
    );

    if (this.instance.protocol !== "https:") {
      throw new Error("ServiceNow instance must use HTTPS");
    }

    if (
      !this.instance.hostname.endsWith(
        ".service-now.com",
      )
    ) {
      throw new Error(
        "ServiceNow instance must be a service-now.com host",
      );
    }

    this.username =
      options.username ?? requiredProfileEnv(this.profile, "USERNAME");

    this.password =
      options.password ?? requiredProfileEnv(this.profile, "PASSWORD");

    this.fetchImpl = options.fetchImpl ?? fetch;

    this.writeEnabled =
      options.writeEnabled ??
      profileEnvFlag(this.profile, "WRITE_ENABLED");

    this.deleteEnabled =
      options.deleteEnabled ??
      profileEnvFlag(this.profile, "DELETE_ENABLED");

    this.xploreEnabled =
      options.xploreEnabled ??
      profileEnvFlag(this.profile, "XPLORE_ENABLED");

    this.writeTables = valueSet(
      options.writeTables ??
        profileEnv(this.profile, "WRITE_TABLES"),
    );

    this.deleteTables = valueSet(
      options.deleteTables ??
        profileEnv(this.profile, "DELETE_TABLES"),
    );

    this.additionalBlockedTables = valueSet(
      options.additionalBlockedTables ??
        profileEnv(
          this.profile,
          "ADDITIONAL_BLOCKED_TABLES",
        ),
    );
  }

  private validateTable(table: string): void {
    if (!TABLE_RE.test(table)) {
      throw new ServiceNowError(
        "Invalid table name",
        400,
      );
    }

    if (
      BLOCKED_TABLES.has(table) ||
      this.additionalBlockedTables.has(table) ||
      /(credential|password|user_token|certificate|private_key)/i.test(
        table,
      )
    ) {
      throw new ServiceNowError(
        `Access to ${table} is blocked`,
        403,
      );
    }
  }

  private validateSysId(sysId: string): void {
    if (!SYS_ID_RE.test(sysId)) {
      throw new ServiceNowError(
        "sys_id must be 32 hexadecimal characters",
        400,
      );
    }
  }

  private validateFieldList(fields: string[]): void {
    if (!fields.length) {
      throw new ServiceNowError(
        "fields must contain at least one field name",
        400,
      );
    }

    if (fields.length > 50) {
      throw new ServiceNowError(
        "table shape supports at most 50 requested fields",
        400,
      );
    }

    for (const field of fields) {
      if (!FIELD_RE.test(field)) {
        throw new ServiceNowError(
          `Invalid field name '${field}'`,
          400,
        );
      }
    }
  }

  private validateWrite(record: JsonObject): void {
    for (const key of Object.keys(record)) {
      if (SECRET_FIELD_RE.test(key)) {
        throw new ServiceNowError(
          `Writing secret-like field '${key}' is blocked`,
          403,
        );
      }
    }
  }

  private validateTablePermission(
    table: string,
    kind: "write" | "delete",
  ): void {
    const configured =
      kind === "write"
        ? this.writeTables
        : this.deleteTables;

    if (
      !configured.has("*") &&
      !configured.has(table)
    ) {
      throw new ServiceNowError(
        `${
          kind === "write"
            ? "Writes"
            : "Deletes"
        } to ${table} are not allowlisted`,
        403,
      );
    }
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const url = new URL(path, this.instance);
    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      30_000,
    );

    try {
      const response = await this.fetchImpl(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          Authorization:
            `Basic ${Buffer.from(
              `${this.username}:${this.password}`,
            ).toString("base64")}`,
          ...(init.body
            ? { "Content-Type": "application/json" }
            : {}),
          ...init.headers,
        },
      });

      const text = await response.text();
      const payload = text ? safeJson(text) : null;

      if (!response.ok) {
        const detail =
          typeof payload === "object" &&
          payload !== null
            ? redact(payload)
            : String(text).slice(0, 1000);

        throw new ServiceNowError(
          `ServiceNow returned HTTP ${response.status}`,
          response.status,
          detail,
        );
      }

      return sanitizeTablePayload(
        tableFromPath(path),
        payload,
      );
    } catch (error) {
      if (error instanceof ServiceNowError) {
        throw error;
      }

      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw new ServiceNowError(
          "ServiceNow request timed out",
          504,
        );
      }

      throw new ServiceNowError(
        "ServiceNow request failed",
        502,
        error instanceof Error
          ? error.message
          : String(error),
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async health(): Promise<JsonObject> {
    const users = await this.query("sys_user", {
      query: "sys_id=javascript:gs.getUserID()",
      fields: [
        "sys_id",
        "user_name",
        "name",
        "active",
      ],
      limit: 1,
    });

    return {
      profile: this.profile,
      profile_label: this.profileLabel,
      instance: this.instance.origin,
      authenticated_user: users[0] ?? null,
      write_enabled: this.writeEnabled,
      delete_enabled: this.deleteEnabled,
      xplore_enabled: this.xploreEnabled,
    };
  }

  async executeXplore(
    script: string,
    scope = "global",
  ): Promise<JsonObject> {
    this.requireXploreAccess();
    const code = script.trim();

    if (!code) {
      throw new ServiceNowError(
        "script must not be empty",
        400,
      );
    }

    if (code.length > XPLORE_SCRIPT_MAX_LENGTH) {
      throw new ServiceNowError(
        `script exceeds ${XPLORE_SCRIPT_MAX_LENGTH} characters`,
        400,
      );
    }

    if (!SCOPE_RE.test(scope)) {
      throw new ServiceNowError(
        "scope must be global or a technical application scope name",
        400,
      );
    }

    validateXploreScript(code);
    return this.runXplore(code, scope);
  }

  async saveCustomerUpdate(
    table: string,
    sysId: string,
    updateSetSysId: string,
  ): Promise<JsonObject> {
    this.requireXploreAccess();
    this.validateTable(table);
    this.validateSysId(sysId);
    this.validateSysId(updateSetSysId);
    this.requireWriteAccess(table);
    this.requireWriteAccess("sys_update_xml");

    const [record, updateSet] = await Promise.all([
      this.get(
        table,
        sysId,
        [
          "sys_id",
          "sys_class_name",
          "sys_updated_on",
          "sys_updated_by",
        ],
      ),
      this.get(
        "sys_update_set",
        updateSetSysId,
        ["sys_id", "name", "state", "application"],
        "all",
      ),
    ]);

    if (!record) {
      throw new ServiceNowError(
        `Record '${table}:${sysId}' was not found`,
        404,
      );
    }

    if (!updateSet) {
      throw new ServiceNowError(
        `Update set '${updateSetSysId}' was not found`,
        404,
      );
    }

    if (tableApiScalar(updateSet.state)?.toLowerCase() !== "in progress") {
      throw new ServiceNowError(
        "Update set must be in progress",
        409,
      );
    }

    const updateName = `${table}_${sysId}`;
    const xplore = await this.runXplore(
      buildCustomerUpdateScript(
        table,
        sysId,
        updateSetSysId,
        updateName,
      ),
      "global",
    );
    const xploreResult = xplore.result;

    if (
      !xploreResult ||
      typeof xploreResult !== "object" ||
      Array.isArray(xploreResult) ||
      (xploreResult as JsonObject).saved !== true
    ) {
      throw new ServiceNowError(
        "Xplore did not confirm that the source record was saved",
        409,
        xplore,
      );
    }

    const captured = await this.query("sys_update_xml", {
      query:
        `name=${updateName}` +
        `^update_set=${updateSetSysId}` +
        "^ORDERBYDESCsys_created_on",
      fields: [
        "sys_id",
        "name",
        "update_set",
        "application",
        "target_name",
        "type",
        "sys_created_on",
      ],
      limit: 1,
      displayValue: "all",
    });

    if (!captured[0]) {
      throw new ServiceNowError(
        `Customer update '${updateName}' was not captured in the requested update set`,
        409,
        xplore,
      );
    }

    const updateSetApplication = tableApiScalar(
      updateSet.application,
    );
    const capturedApplication = tableApiScalar(
      captured[0].application,
    );

    if (
      updateSetApplication &&
      capturedApplication !== updateSetApplication
    ) {
      throw new ServiceNowError(
        `Customer update application '${capturedApplication ?? "unknown"}' does not match update set application '${updateSetApplication}'`,
        409,
        captured[0],
      );
    }

    return {
      saved: true,
      profile: this.profile,
      table,
      sys_id: sysId,
      source_record: record,
      update_set: updateSet,
      customer_update: captured[0],
      xplore,
    };
  }

  private async runXplore(
    script: string,
    scope: string,
  ): Promise<JsonObject> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      30_000,
    );
    const payload = new URLSearchParams({
      data: JSON.stringify({
        debug_mode: false,
        target: "server",
        scope,
        code: script,
        user_data: "",
        user_data_type: "String",
        breadcrumb: "",
        no_quotes: true,
        show_props: false,
        max_depth: 1,
        show_strings: true,
        html_messages: false,
        fix_gslog: true,
        support_hoisting: false,
        use_es_latest: false,
        id: "codex",
        loaded_id: "",
      }),
    });

    try {
      const response = await this.fetchImpl(
        new URL("/snd_xplore.do?action=run", this.instance),
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization:
              `Basic ${Buffer.from(
                `${this.username}:${this.password}`,
              ).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Codex-ServiceNow-PDI/2.0",
          },
          body: payload.toString(),
        },
      );
      const text = await response.text();

      if (text.length > 1_000_000) {
        throw new ServiceNowError(
          "Xplore response exceeded the maximum size",
          502,
        );
      }

      const parsed = text ? safeJson(text) : null;

      if (!response.ok) {
        throw new ServiceNowError(
          `Xplore returned HTTP ${response.status}`,
          response.status,
          redact(parsed),
        );
      }

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new ServiceNowError(
          "Xplore did not return a JSON object",
          502,
        );
      }

      const responseObject = parsed as JsonObject;

      if (responseObject.$success !== true) {
        throw new ServiceNowError(
          "Xplore execution failed",
          502,
          redact(
            responseObject.$error ??
            responseObject.error ??
            "Unknown Xplore error",
          ),
        );
      }

      return extractXploreResult(responseObject);
    } catch (error) {
      if (error instanceof ServiceNowError) {
        throw error;
      }

      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw new ServiceNowError(
          "Xplore execution timed out",
          504,
        );
      }

      throw new ServiceNowError(
        "Xplore execution failed",
        502,
        error instanceof Error
          ? error.message
          : String(error),
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async query(
    table: string,
    input: {
      query?: string;
      fields?: string[];
      limit?: number;
      offset?: number;
      displayValue?: "true" | "false" | "all";
    } = {},
  ): Promise<JsonObject[]> {
    this.validateTable(table);

    const params = new URLSearchParams();

    if (input.query) {
      params.set("sysparm_query", input.query);
    }

    if (input.fields?.length) {
      params.set(
        "sysparm_fields",
        input.fields.join(","),
      );
    }

    params.set(
      "sysparm_limit",
      String(
        Math.min(
          Math.max(input.limit ?? 20, 1),
          100,
        ),
      ),
    );

    params.set(
      "sysparm_offset",
      String(Math.max(input.offset ?? 0, 0)),
    );

    params.set(
      "sysparm_display_value",
      input.displayValue ?? "false",
    );

    params.set(
      "sysparm_exclude_reference_link",
      "true",
    );

    const payload = await this.request(
      `/api/now/table/${table}?${params}`,
    ) as { result?: JsonObject[] };

    return payload?.result ?? [];
  }

  async get(
    table: string,
    sysId: string,
    fields?: string[],
    displayValue: "true" | "false" | "all" = "false",
  ): Promise<JsonObject | null> {
    this.validateTable(table);
    this.validateSysId(sysId);

    const params = new URLSearchParams({
      sysparm_display_value: displayValue,
      sysparm_exclude_reference_link: "true",
    });

    if (fields?.length) {
      params.set(
        "sysparm_fields",
        fields.join(","),
      );
    }

    try {
      const payload = await this.request(
        `/api/now/table/${table}/${sysId}?${params}`,
      ) as { result?: JsonObject };

      return payload?.result ?? null;
    } catch (error) {
      if (
        error instanceof ServiceNowError &&
        error.status === 404
      ) {
        return null;
      }

      throw error;
    }
  }

  async create(
    table: string,
    record: JsonObject,
  ): Promise<JsonObject> {
    this.requireWriteAccess(table);
    this.validateWrite(record);

    const payload = await this.request(
      `/api/now/table/${table}`,
      {
        method: "POST",
        body: JSON.stringify(record),
      },
    ) as { result?: JsonObject };

    return payload.result ?? {};
  }

  async update(
    table: string,
    sysId: string,
    record: JsonObject,
  ): Promise<JsonObject> {
    this.validateSysId(sysId);
    this.requireWriteAccess(table);
    this.validateWrite(record);

    const payload = await this.request(
      `/api/now/table/${table}/${sysId}`,
      {
        method: "PATCH",
        body: JSON.stringify(record),
      },
    ) as { result?: JsonObject };

    return payload.result ?? {};
  }

  async delete(
    table: string,
    sysId: string,
  ): Promise<JsonObject> {
    this.validateTable(table);
    this.validateSysId(sysId);

    if (!this.deleteEnabled) {
      throw new ServiceNowError(
        "ServiceNow deletes are disabled",
        403,
      );
    }

    this.validateTablePermission(table, "delete");

    await this.request(
      `/api/now/table/${table}/${sysId}`,
      { method: "DELETE" },
    );

    return {
      deleted: true,
      table,
      sys_id: sysId,
    };
  }

  private requireWriteAccess(table: string): void {
    this.validateTable(table);

    if (!this.writeEnabled) {
      throw new ServiceNowError(
        "ServiceNow writes are disabled",
        403,
      );
    }

    this.validateTablePermission(table, "write");
  }

  private requireXploreAccess(): void {
    if (!this.writeEnabled) {
      throw new ServiceNowError(
        "ServiceNow writes are disabled",
        403,
      );
    }

    if (!this.xploreEnabled) {
      throw new ServiceNowError(
        "ServiceNow Xplore execution is disabled for this profile",
        403,
      );
    }
  }

  async removeTemporaryUserPreference(
    sysId: string,
  ): Promise<JsonObject> {
    this.validateSysId(sysId);

    if (!this.writeEnabled) {
      throw new ServiceNowError(
        "ServiceNow writes are disabled",
        403,
      );
    }

    this.validateTablePermission(
      "sys_user_preference",
      "write",
    );

    await this.request(
      `/api/now/table/sys_user_preference/${sysId}`,
      { method: "DELETE" },
    );

    return {
      removed: true,
      table: "sys_user_preference",
      sys_id: sysId,
    };
  }

  async tableShape(
    table: string,
    input: TableShapeOptions = {},
  ): Promise<JsonObject> {
    this.validateTable(table);

    const requestedFields =
      input.fields !== undefined
        ? [...new Set(input.fields)]
        : undefined;

    if (requestedFields !== undefined) {
      this.validateFieldList(requestedFields);
    }

    const includeChoices =
      input.includeChoices ?? true;

    const fieldFilter =
      requestedFields?.length
        ? `^elementIN${requestedFields.join(",")}`
        : "";

    const definitionPromise = this.query(
      "sys_db_object",
      {
        query: `name=${table}`,
        fields: [
          "sys_id",
          "name",
          "label",
          "super_class",
          "sys_scope",
        ],
        limit: 1,
      },
    );

    const fieldsPromise = this.query(
      "sys_dictionary",
      {
        query:
          `name=${table}` +
          "^elementISNOTEMPTY" +
          fieldFilter +
          "^ORDERBYposition",
        fields: [
          "sys_id",
          "element",
          "column_label",
          "internal_type",
          "reference",
          "mandatory",
          "read_only",
          "max_length",
          "attributes",
        ],
        limit: requestedFields?.length ?? 100,
      },
    );

    const choicesPromise = includeChoices
      ? this.query("sys_choice", {
          query:
            `name=${table}` +
            "^inactive=false" +
            fieldFilter +
            "^ORDERBYelement" +
            "^ORDERBYsequence",
          fields: [
            "element",
            "value",
            "label",
            "sequence",
            "dependent_value",
          ],
          limit: 100,
        })
      : Promise.resolve([] as JsonObject[]);

    const [definition, fields, choices] =
      await Promise.all([
        definitionPromise,
        fieldsPromise,
        choicesPromise,
      ]);

    return {
      table: definition[0] ?? null,
      fields,
      choices,
    };
  }
}

export function listServiceNowProfiles(): ServiceNowProfileSummary[] {
  const defaultProfile = defaultProfileName();

  return configuredProfileNames().map((profile) => {
    const rawInstance = profileEnv(profile, "INSTANCE");
    const origin = instanceOrigin(rawInstance);
    const username = profileEnv(profile, "USERNAME");
    const password = profileEnv(profile, "PASSWORD");

    return {
      profile,
      label: profileEnv(profile, "LABEL") ?? profile,
      default: profile === defaultProfile,
      instance: origin,
      configured: Boolean(origin && username && password),
      write_enabled: profileEnvFlag(profile, "WRITE_ENABLED"),
      delete_enabled: profileEnvFlag(profile, "DELETE_ENABLED"),
      xplore_enabled: profileEnvFlag(profile, "XPLORE_ENABLED"),
    };
  });
}

function validateXploreScript(script: string): void {
  const blocked = [
    /\b(deleteRecord|deleteMultiple|setWorkflow|autoSysFields|gs\.sleep)\s*\(/i,
    /\b(RESTMessageV2|SOAPMessageV2|GlideEncrypter|Password2)\b/i,
    /\b(gs\.getProperty|SNC\.CredentialStore)\s*\(/i,
    /\b(oauth_credential|sys_auth_profile_basic|sys_user_token|sys_certificate|sys_credentials)\b/i,
  ];

  if (blocked.some(pattern => pattern.test(script))) {
    throw new ServiceNowError(
      "Xplore script contains a blocked high-risk API or table",
      403,
    );
  }
}

function buildCustomerUpdateScript(
  table: string,
  sysId: string,
  updateSetSysId: string,
  updateName: string,
): string {
  return `(function () {
  var result = { saved: false, name: '${updateName}', update_set: '${updateSetSysId}' };
  var currentSet = gs.getUser().getPreference('sys_update_set');
  if (currentSet !== '${updateSetSysId}') {
    result.error = 'wrong_update_set_context';
    result.current_update_set = currentSet || '';
    gs.print('SN_RESULT_START' + JSON.stringify(result) + 'SN_RESULT_END');
    return;
  }
  var gr = new GlideRecord('${table}');
  if (!gr.get('${sysId}')) {
    result.error = 'record_not_found';
    gs.print('SN_RESULT_START' + JSON.stringify(result) + 'SN_RESULT_END');
    return;
  }
  new GlideUpdateManager2().saveRecord(gr);
  result.saved = true;
  gs.print('SN_RESULT_START' + JSON.stringify(result) + 'SN_RESULT_END');
})();`;
}

function extractXploreResult(
  response: JsonObject,
): JsonObject {
  const result = response.result;
  const resultObject =
    result && typeof result === "object" && !Array.isArray(result)
      ? result as JsonObject
      : {};
  const candidates: string[] = [];
  const resultText = tableApiScalar(resultObject.string);

  if (resultText) candidates.push(resultText);

  for (const key of ["messages", "logs"]) {
    const entries = resultObject[key];

    if (!Array.isArray(entries)) continue;

    for (const entry of entries.slice(0, 20)) {
      if (typeof entry === "string") {
        candidates.push(entry);
      } else if (
        entry &&
        typeof entry === "object" &&
        !Array.isArray(entry)
      ) {
        const message = tableApiScalar(
          (entry as JsonObject).message,
        );
        if (message) candidates.push(message);
      }
    }
  }

  for (const candidate of candidates) {
    const match = /(?:SN_RESULT_START|CODEX_RESULT_START)\s*([\s\S]*?)\s*(?:SN_RESULT_END|CODEX_RESULT_END)/
      .exec(candidate);

    if (match?.[1]) {
      return {
        result: redact(safeJson(match[1].trim())),
        scope_output: "marked",
      };
    }
  }

  return {
    result: redact(resultText?.slice(0, 8_000) ?? null),
    messages: candidates.slice(0, 20).map(item => item.slice(0, 1_000)),
    scope_output: "unmarked",
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function redact(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const output: JsonObject = {};

    for (
      const [key, item] of Object.entries(value)
    ) {
      output[key] = SECRET_FIELD_RE.test(key)
        ? "[REDACTED]"
        : redact(item);
    }

    return output;
  }

  return value;
}

function sanitizeTablePayload(
  table: string | undefined,
  value: unknown,
): unknown {
  const clean = redact(value);

  if (
    table !== "sys_properties" ||
    !clean ||
    typeof clean !== "object"
  ) {
    return clean;
  }

  const visit = (item: unknown): void => {
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }

    if (
      !item ||
      typeof item !== "object"
    ) {
      return;
    }

    const record = item as JsonObject;

    const propertyName = tableApiScalar(record.name);

    if (
      propertyName !== undefined &&
      SECRET_VALUE_HINT_RE.test(propertyName) &&
      "value" in record
    ) {
      record.value = "[REDACTED]";
    }

    Object.values(record).forEach(visit);
  };

  visit(clean);
  return clean;
}

function tableApiScalar(
  value: unknown,
): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object"
  ) {
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

function tableFromPath(
  path: string,
): string | undefined {
  return /^\/api\/now\/table\/([A-Za-z0-9_]+)/
    .exec(path)?.[1];
}

function csvSet(
  value: string | undefined,
): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

const PROFILE_RE = /^[a-z][a-z0-9_]{0,31}$/;

function defaultProfileName(): string {
  return normalizeProfileName(
    env("SN_DEFAULT_PROFILE") ?? "pdi",
  );
}

function configuredProfileNames(): string[] {
  const raw = env("SN_PROFILES");
  const profiles = raw
    ? [...new Set(
        raw
          .split(",")
          .map(normalizeProfileName),
      )]
    : [defaultProfileName()];

  if (!profiles.includes(defaultProfileName())) {
    throw new Error(
      "SN_DEFAULT_PROFILE must be included in SN_PROFILES",
    );
  }

  return profiles;
}

function resolveProfileName(
  requested: string | undefined,
): string {
  const profile = requested
    ? normalizeProfileName(requested)
    : defaultProfileName();

  if (!configuredProfileNames().includes(profile)) {
    throw new ServiceNowError(
      `Unknown ServiceNow profile '${profile}'`,
      400,
    );
  }

  return profile;
}

function normalizeProfileName(value: string): string {
  const profile = value.trim().toLowerCase();

  if (!PROFILE_RE.test(profile)) {
    throw new Error(
      `Invalid ServiceNow profile name '${value}'`,
    );
  }

  return profile;
}

function profileEnv(
  profile: string,
  suffix: string,
): string | undefined {
  const scopedName =
    `SN_${profile.toUpperCase()}_${suffix}`;
  const scoped = env(scopedName);

  if (scoped !== undefined) {
    return scoped.trim();
  }

  if (profile === defaultProfileName()) {
    return env(`SN_${suffix}`)?.trim();
  }

  return undefined;
}

function requiredProfileEnv(
  profile: string,
  suffix: string,
): string {
  const value = profileEnv(profile, suffix);

  if (value) return value;

  const scopedName =
    `SN_${profile.toUpperCase()}_${suffix}`;

  throw new Error(
    `Missing required environment variable: ${scopedName}`,
  );
}

function profileEnvFlag(
  profile: string,
  suffix: string,
): boolean {
  const value = profileEnv(profile, suffix);

  return value === undefined
    ? false
    : /^(1|true|yes|on)$/i.test(value);
}

function valueSet(
  value: string | string[] | undefined,
): Set<string> {
  return Array.isArray(value)
    ? new Set(
        value
          .map((item) => item.trim())
          .filter(Boolean),
      )
    : csvSet(value);
}

function instanceOrigin(
  value: string | undefined,
): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

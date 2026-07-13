import assert from "node:assert/strict";
import test from "node:test";
import {
  confirmUpdateCapture,
  restoreDevelopmentContext,
  setUpdateSetContext,
} from "../src/development-context.js";
import {
  type JsonObject,
  ServiceNowClient,
} from "../src/servicenow.js";

const USER_ID = "a".repeat(32);
const SCOPE_ID = "b".repeat(32);
const DEFAULT_SET_ID = "c".repeat(32);

test("scoped context is set after the current app and restores cleanly", async () => {
  const fake = new FakeContextClient();
  const result = await setUpdateSetContext(
    fake as unknown as ServiceNowClient,
    {
      scope: "sn_mh",
      name: "Manager Hub - Small change",
      description: "One reversible configuration change.",
    },
  );
  const updateSet = result.update_set as JsonObject;
  const snapshot = result.snapshot as never;
  const updateSetSysId = scalar(updateSet.sys_id);

  assert.equal(scalar(updateSet.application), SCOPE_ID);
  assert.equal(scalar(updateSet.state), "in progress");
  assert.equal(fake.preferenceValue("apps.current_app"), SCOPE_ID);
  assert.equal(fake.preferenceValue("sys_update_set"), updateSetSysId);
  assert.equal(
    fake.preferenceValue(`updateSetForScope${SCOPE_ID}`),
    updateSetSysId,
  );
  assert.ok(
    fake.calls.indexOf("set:apps.current_app") <
      fake.calls.indexOf("create:sys_update_set"),
  );

  await restoreDevelopmentContext(
    fake as unknown as ServiceNowClient,
    snapshot,
  );

  assert.equal(fake.preferenceValue("apps.current_app"), "global");
  assert.equal(
    fake.preferenceValue("sys_update_set"),
    DEFAULT_SET_ID,
  );
  assert.equal(
    fake.preferenceValue(`updateSetForScope${SCOPE_ID}`),
    undefined,
  );
  assert.equal(fake.removedPreferences, 1);
});

test("context setup rejects a wrong-scope update set and restores preferences", async () => {
  const fake = new FakeContextClient();
  const wrongSetId = "d".repeat(32);
  fake.updateSets.set(wrongSetId, {
    sys_id: wrongSetId,
    name: "Wrong scope",
    state: "in progress",
    application: "global",
  });

  await assert.rejects(
    () => setUpdateSetContext(
      fake as unknown as ServiceNowClient,
      {
        scope: "sn_mh",
        updateSetSysId: wrongSetId,
      },
    ),
    /does not match scope/i,
  );

  assert.equal(fake.preferenceValue("apps.current_app"), "global");
  assert.equal(
    fake.preferenceValue("sys_update_set"),
    DEFAULT_SET_ID,
  );
  assert.equal(
    fake.preferenceValue(`updateSetForScope${SCOPE_ID}`),
    undefined,
  );
});

test("a newly created wrong-scope update set is ignored before rollback", async () => {
  const fake = new FakeContextClient();
  fake.createdUpdateSetApplicationOverride = "global";

  await assert.rejects(
    () => setUpdateSetContext(
      fake as unknown as ServiceNowClient,
      {
        scope: "sn_mh",
        name: "Wrongly scoped create",
      },
    ),
    /does not match scope/i,
  );

  const created = [...fake.updateSets.values()]
    .find(updateSet =>
      scalar(updateSet.name) === "Wrongly scoped create"
    );

  assert.ok(created);
  assert.equal(scalar(created.state), "ignore");
  assert.equal(fake.preferenceValue("apps.current_app"), "global");
  assert.equal(
    fake.preferenceValue("sys_update_set"),
    DEFAULT_SET_ID,
  );
});

test("capture confirmation reports missing names and mixed applications", async () => {
  const fake = new FakeContextClient();
  const updateSetId = "e".repeat(32);
  fake.customerUpdates.push(
    {
      sys_id: "f".repeat(32),
      name: "sp_instance_" + "1".repeat(32),
      update_set: updateSetId,
      application: SCOPE_ID,
      type: "Instance",
    },
    {
      sys_id: "1".repeat(32),
      name: "sys_script_" + "2".repeat(32),
      update_set: updateSetId,
      application: "global",
      type: "Business Rule",
    },
  );

  const result = await confirmUpdateCapture(
    fake as unknown as ServiceNowClient,
    updateSetId,
    "sn_mh",
    [
      "sp_instance_" + "1".repeat(32),
      "sp_widget_" + "3".repeat(32),
    ],
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing_names, [
    "sp_widget_" + "3".repeat(32),
  ]);
  assert.deepEqual(result.wrong_applications, []);

  const allRows = await confirmUpdateCapture(
    fake as unknown as ServiceNowClient,
    updateSetId,
    "sn_mh",
  );

  assert.deepEqual(allRows.wrong_applications, ["global"]);
});

class FakeContextClient {
  readonly profile = "pdi";
  readonly instance = new URL(
    "https://dev000000.service-now.com",
  );
  readonly calls: string[] = [];
  readonly preferences = new Map<string, JsonObject>();
  readonly updateSets = new Map<string, JsonObject>();
  readonly customerUpdates: JsonObject[] = [];
  createdUpdateSetApplicationOverride?: string;
  removedPreferences = 0;
  private nextId = 10;

  constructor() {
    this.preferences.set("apps.current_app", {
      sys_id: "2".repeat(32),
      name: "apps.current_app",
      value: "global",
      user: USER_ID,
    });
    this.preferences.set("sys_update_set", {
      sys_id: "3".repeat(32),
      name: "sys_update_set",
      value: DEFAULT_SET_ID,
      user: USER_ID,
    });
    this.updateSets.set(DEFAULT_SET_ID, {
      sys_id: DEFAULT_SET_ID,
      name: "Default",
      state: "in progress",
      application: "global",
    });
  }

  async health(): Promise<JsonObject> {
    return {
      profile: this.profile,
      instance: this.instance.origin,
      authenticated_user: {
        sys_id: USER_ID,
        user_name: "integration.user",
      },
    };
  }

  async query(
    table: string,
    input: { query?: string } = {},
  ): Promise<JsonObject[]> {
    if (table === "sys_scope") {
      return [{
        sys_id: SCOPE_ID,
        scope: "sn_mh",
        name: "Manager Hub",
      }];
    }

    if (table === "sys_user_preference") {
      const name = /(?:^|\^)name=([^\^]+)/
        .exec(input.query ?? "")?.[1];
      const preference = name
        ? this.preferences.get(name)
        : undefined;
      return preference ? [{ ...preference }] : [];
    }

    if (table === "sys_update_xml") {
      const updateSet = /(?:^|\^)update_set=([0-9a-f]{32})/i
        .exec(input.query ?? "")?.[1];
      const names = /(?:^|\^)nameIN([^\^]+)/
        .exec(input.query ?? "")?.[1]?.split(",");

      return this.customerUpdates.filter(row =>
        scalar(row.update_set) === updateSet &&
        (!names || names.includes(scalar(row.name) ?? ""))
      );
    }

    return [];
  }

  async get(
    table: string,
    sysId: string,
  ): Promise<JsonObject | null> {
    if (table === "sys_scope" && sysId === SCOPE_ID) {
      return {
        sys_id: SCOPE_ID,
        scope: "sn_mh",
        name: "Manager Hub",
      };
    }

    if (table === "sys_update_set") {
      return this.updateSets.get(sysId) ?? null;
    }

    return null;
  }

  async create(
    table: string,
    record: JsonObject,
  ): Promise<JsonObject> {
    this.calls.push(`create:${table}`);

    if (table === "sys_user_preference") {
      const name = String(record.name);
      const created = {
        ...record,
        sys_id: this.id(),
      };
      this.preferences.set(name, created);
      return created;
    }

    if (table === "sys_update_set") {
      const sysId = this.id();
      const created = {
        ...record,
        sys_id: sysId,
        application: this.createdUpdateSetApplicationOverride ??
          this.preferenceValue("apps.current_app") ??
          "global",
      };
      this.updateSets.set(sysId, created);
      return created;
    }

    return { ...record, sys_id: this.id() };
  }

  async update(
    table: string,
    sysId: string,
    record: JsonObject,
  ): Promise<JsonObject> {
    if (table === "sys_user_preference") {
      const entry = [...this.preferences.entries()]
        .find(([, preference]) =>
          scalar(preference.sys_id) === sysId
        );
      assert.ok(entry);
      const [name, existing] = entry;
      const updated = { ...existing, ...record };
      this.preferences.set(name, updated);
      this.calls.push(`set:${name}`);
      return updated;
    }

    if (table === "sys_update_set") {
      const existing = this.updateSets.get(sysId) ?? {};
      const updated = { ...existing, ...record };
      this.updateSets.set(sysId, updated);
      return updated;
    }

    return { ...record, sys_id: sysId };
  }

  async removeTemporaryUserPreference(
    sysId: string,
  ): Promise<JsonObject> {
    const entry = [...this.preferences.entries()]
      .find(([, preference]) =>
        scalar(preference.sys_id) === sysId
      );
    assert.ok(entry);
    this.preferences.delete(entry[0]);
    this.removedPreferences += 1;
    return { removed: true, sys_id: sysId };
  }

  preferenceValue(name: string): string | undefined {
    return scalar(this.preferences.get(name)?.value);
  }

  private id(): string {
    this.nextId += 1;
    return this.nextId.toString(16).padStart(32, "0");
  }
}

function scalar(value: unknown): string | undefined {
  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    const wrapped = value as JsonObject;
    return typeof wrapped.value === "string"
      ? wrapped.value
      : undefined;
  }

  return undefined;
}

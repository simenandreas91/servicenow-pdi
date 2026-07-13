import assert from "node:assert/strict";
import test from "node:test";
import { handleMcp, TOOLS } from "../src/mcp.js";
import type { KeyValueStore } from "../src/oauth.js";

process.env.MCP_TOKEN_PEPPER = "test-pepper-that-is-not-used-in-production";

test("initialize and tools/list are available before OAuth", async () => {
  const initialize = await handleMcp(
    rpc("initialize", { protocolVersion: "2025-06-18" }, 1),
  );
  const initialized = await initialize.json() as {
    result: { serverInfo: { name: string } };
  };

  assert.equal(initialized.result.serverInfo.name, "servicenow-pdi");

  const list = await handleMcp(rpc("tools/list", {}, 2));
  const listed = await list.json() as {
    result: { tools: unknown[] };
  };

  assert.equal(listed.result.tools.length, TOOLS.length);
  assert.ok(
    TOOLS.some(
      tool =>
        tool.name === "servicenow_delete_record" &&
        tool.annotations.destructiveHint === true,
    ),
  );
  assert.deepEqual(
    [
      "servicenow_get_development_context",
      "servicenow_set_update_set_context",
      "servicenow_restore_development_context",
      "servicenow_confirm_update_capture",
    ].filter(name =>
      !TOOLS.some(tool => tool.name === name)
    ),
    [],
  );
  assert.ok(
    TOOLS.every((tool) =>
      tool.name === "servicenow_list_profiles" ||
      Object.hasOwn(
        tool.inputSchema.properties as object,
        "profile",
      ),
    ),
  );
  assert.ok(
    TOOLS.every((tool) =>
      tool.name === "servicenow_list_profiles" ||
      ((tool.inputSchema.required as unknown[]) ?? []).includes("profile"),
    ),
  );

  const future = await handleMcp(
    rpc("initialize", { protocolVersion: "2099-01-01" }, 9),
  );
  const negotiated = await future.json() as {
    result: { protocolVersion: string };
  };

  assert.equal(negotiated.result.protocolVersion, "2025-06-18");
});

test("invalid JSON-RPC values and unexpected browser origins are rejected", async () => {
  const nullRequest = new Request("https://mcp.example.com/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "null",
  });

  assert.equal((await handleMcp(nullRequest)).status, 400);

  const badOrigin = rpc(
    "tools/list",
    {},
    10,
    { Origin: "https://evil.example" },
  );

  assert.equal((await handleMcp(badOrigin)).status, 403);
});

test("tool calls return an OAuth challenge when unauthenticated", async () => {
  const emptyStore: KeyValueStore = {
    async get() {
      return null;
    },
    async set() {},
    async delete() {},
  };

  const response = await handleMcp(
    rpc(
      "tools/call",
      { name: "servicenow_health", arguments: {} },
      3,
    ),
    { authStore: emptyStore },
  );

  assert.equal(response.status, 401);
  assert.match(
    response.headers.get("www-authenticate") ?? "",
    /oauth-protected-resource/,
  );
});

test("read tools accept a scoped bearer token and explicit profile", async () => {
  const authStore = readAuthStore();
  const fakeClient = {
    health: async () => ({ ok: true }),
  };

  const request = rpc(
    "tools/call",
    { name: "servicenow_health", arguments: { profile: "pdi" } },
    4,
    { Authorization: "Bearer valid" },
  );

  const response = await handleMcp(request, {
    authStore,
    client: fakeClient as never,
  });

  assert.equal(response.status, 200);

  const body = await response.json() as {
    result: {
      content: Array<{ type: string; text: string }>;
      structuredContent: {
        result: { ok: boolean };
      };
    };
  };

  assert.equal(body.result.content[0]?.text, "Action completed.");
  assert.equal(body.result.structuredContent.result.ok, true);
});

test("all instance-bound tools require an explicit profile", async () => {
  const response = await handleMcp(
    rpc(
      "tools/call",
      { name: "servicenow_health", arguments: {} },
      45,
      { Authorization: "Bearer valid" },
    ),
    {
      authStore: readAuthStore(),
      client: { health: async () => ({ ok: true }) } as never,
    },
  );

  const body = await response.json() as {
    result: { isError?: boolean; content: Array<{ text: string }> };
  };

  assert.equal(body.result.isError, true);
  assert.match(body.result.content[0]?.text ?? "", /profile is required/i);
});

test("tool calls route to the explicitly selected profile", async () => {
  const authStore = readAuthStore();
  let selectedProfile: string | undefined;

  const response = await handleMcp(
    rpc(
      "tools/call",
      {
        name: "servicenow_health",
        arguments: { profile: "varenergi_dev" },
      },
      40,
      { Authorization: "Bearer valid" },
    ),
    {
      authStore,
      clientFactory(profile) {
        selectedProfile = profile;
        return {
          health: async () => ({ profile, ok: true }),
        } as never;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(selectedProfile, "varenergi_dev");

  const body = await response.json() as {
    result: {
      structuredContent: {
        result: { profile: string };
      };
    };
  };

  assert.equal(
    body.result.structuredContent.result.profile,
    "varenergi_dev",
  );
});

test("profile listing exposes only non-secret configuration", async () => {
  const response = await handleMcp(
    rpc(
      "tools/call",
      {
        name: "servicenow_list_profiles",
        arguments: {},
      },
      41,
      { Authorization: "Bearer valid" },
    ),
    {
      authStore: readAuthStore(),
      profileLister: () => [
        {
          profile: "pdi",
          label: "PDI",
          default: true,
          instance: "https://dev000000.service-now.com",
          configured: true,
          write_enabled: true,
          delete_enabled: false,
        },
      ],
    },
  );

  const body = await response.json() as {
    result: {
      structuredContent: {
        result: Array<Record<string, unknown>>;
      };
    };
  };

  assert.deepEqual(
    body.result.structuredContent.result[0],
    {
      profile: "pdi",
      label: "PDI",
      default: true,
      instance: "https://dev000000.service-now.com",
      configured: true,
      write_enabled: true,
      delete_enabled: false,
    },
  );
  assert.equal(
    "password" in body.result.structuredContent.result[0]!,
    false,
  );
});

test("write tools require a profile and delete confirmation binds it", async () => {
  const missingProfile = await handleMcp(
    rpc(
      "tools/call",
      {
        name: "servicenow_create_record",
        arguments: {
          table: "incident",
          record: { short_description: "Demo" },
        },
      },
      42,
      { Authorization: "Bearer valid" },
    ),
    {
      authStore: writeAuthStore(),
      client: {
        create: async () => ({ sys_id: "a".repeat(32) }),
      } as never,
    },
  );
  const missingBody = await missingProfile.json() as {
    result: { isError?: boolean; content: Array<{ text: string }> };
  };

  assert.equal(missingBody.result.isError, true);
  assert.match(
    missingBody.result.content[0]?.text ?? "",
    /profile is required/i,
  );

  let deleted = false;
  const deleteClient = {
    profile: "varenergi_dev",
    delete: async () => {
      deleted = true;
      return { deleted: true };
    },
  } as never;

  const oldConfirmation = await handleMcp(
    rpc(
      "tools/call",
      {
        name: "servicenow_delete_record",
        arguments: {
          profile: "varenergi_dev",
          table: "incident",
          sys_id: "a".repeat(32),
          confirmation: `DELETE incident ${"a".repeat(32)}`,
        },
      },
      43,
      { Authorization: "Bearer valid" },
    ),
    {
      authStore: writeAuthStore(),
      client: deleteClient,
    },
  );
  const oldBody = await oldConfirmation.json() as {
    result: { isError?: boolean };
  };

  assert.equal(oldBody.result.isError, true);
  assert.equal(deleted, false);

  const exactConfirmation = await handleMcp(
    rpc(
      "tools/call",
      {
        name: "servicenow_delete_record",
        arguments: {
          profile: "varenergi_dev",
          table: "incident",
          sys_id: "a".repeat(32),
          confirmation:
            `DELETE varenergi_dev incident ${"a".repeat(32)}`,
        },
      },
      44,
      { Authorization: "Bearer valid" },
    ),
    {
      authStore: writeAuthStore(),
      client: deleteClient,
    },
  );

  assert.equal(exactConfirmation.status, 200);
  assert.equal(deleted, true);
});

test("table shape forwards field and choice filters", async () => {
  const authStore = readAuthStore();

  let receivedTable: string | undefined;
  let receivedOptions: {
    fields?: string[];
    includeChoices?: boolean;
  } | undefined;

  const fakeClient = {
    tableShape: async (
      table: string,
      options: {
        fields?: string[];
        includeChoices?: boolean;
      },
    ) => {
      receivedTable = table;
      receivedOptions = options;

      return {
        table: {
          name: "incident",
          label: "Incident",
        },
        fields: [],
        choices: [],
      };
    },
  };

  const request = rpc(
    "tools/call",
    {
      name: "servicenow_table_shape",
      arguments: {
        profile: "pdi",
        table: "incident",
        fields: ["short_description", "priority"],
        include_choices: false,
      },
    },
    5,
    { Authorization: "Bearer valid" },
  );

  const response = await handleMcp(request, {
    authStore,
    client: fakeClient as never,
  });

  assert.equal(response.status, 200);
  assert.equal(receivedTable, "incident");
  assert.deepEqual(receivedOptions, {
    fields: ["short_description", "priority"],
    includeChoices: false,
  });
});

function readAuthStore(): KeyValueStore {
  return authStore("servicenow.read");
}

function writeAuthStore(): KeyValueStore {
  return authStore("servicenow.read servicenow.write");
}

function authStore(scope: string): KeyValueStore {
  return {
    async get<T>() {
      return {
        kind: "access",
        clientId: "client",
        scope,
        resource: "https://mcp.example.com/mcp",
        expiresAt: Date.now() + 60_000,
      } as T;
    },
    async set() {},
    async delete() {},
  };
}

function rpc(
  method: string,
  params: unknown,
  id: number,
  headers: Record<string, string> = {},
): Request {
  return new Request("https://mcp.example.com/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params,
    }),
  });
}

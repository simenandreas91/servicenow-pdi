import assert from "node:assert/strict";
import test from "node:test";
import { handleMcp, TOOLS } from "../src/mcp.js";
import type { KeyValueStore } from "../src/oauth.js";

process.env.MCP_TOKEN_PEPPER = "test-pepper-that-is-not-used-in-production";

test("initialize and tools/list are available before OAuth", async () => {
  const initialize = await handleMcp(rpc("initialize", { protocolVersion: "2025-06-18" }, 1));
  const initialized = await initialize.json() as { result: { serverInfo: { name: string } } };
  assert.equal(initialized.result.serverInfo.name, "servicenow-pdi");
  const list = await handleMcp(rpc("tools/list", {}, 2));
  const listed = await list.json() as { result: { tools: unknown[] } };
  assert.equal(listed.result.tools.length, TOOLS.length);
  assert.ok(TOOLS.some(tool => tool.name === "servicenow_delete_record" && tool.annotations.destructiveHint === true));
  const future = await handleMcp(rpc("initialize", { protocolVersion: "2099-01-01" }, 9));
  const negotiated = await future.json() as { result: { protocolVersion: string } };
  assert.equal(negotiated.result.protocolVersion, "2025-06-18");
});

test("invalid JSON-RPC values and unexpected browser origins are rejected", async () => {
  const nullRequest = new Request("https://mcp.example.com/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: "null" });
  assert.equal((await handleMcp(nullRequest)).status, 400);
  const badOrigin = rpc("tools/list", {}, 10, { Origin: "https://evil.example" });
  assert.equal((await handleMcp(badOrigin)).status, 403);
});

test("tool calls return an OAuth challenge when unauthenticated", async () => {
  const emptyStore: KeyValueStore = { async get() { return null; }, async set() {}, async delete() {} };
  const response = await handleMcp(rpc("tools/call", { name: "servicenow_health", arguments: {} }, 3), { authStore: emptyStore });
  assert.equal(response.status, 401);
  assert.match(response.headers.get("www-authenticate") ?? "", /oauth-protected-resource/);
});

test("read tools accept a scoped bearer token", async () => {
  const authStore: KeyValueStore = {
    async get<T>() { return { kind: "access", clientId: "client", scope: "servicenow.read", resource: "https://mcp.example.com/mcp", expiresAt: Date.now() + 60_000 } as T; },
    async set() {}, async delete() {},
  };
  const fakeClient = { health: async () => ({ ok: true }) };
  const request = rpc("tools/call", { name: "servicenow_health", arguments: {} }, 4, { Authorization: "Bearer valid" });
  const response = await handleMcp(request, { authStore, client: fakeClient as never });
  assert.equal(response.status, 200);
    const body = await response.json() as {
    result: {
      content: Array<{ type: string; text: string }>;
      structuredContent: { result: { ok: boolean } };
    };
  };

assert.equal(body.result.content[0]?.text, "Action completed.");
assert.equal(body.result.structuredContent.result.ok, true);
});

function rpc(method: string, params: unknown, id: number, headers: Record<string, string> = {}): Request {
  return new Request("https://mcp.example.com/mcp", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ jsonrpc: "2.0", id, method, params }) });
}

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { handleOAuth, type KeyValueStore } from "../src/oauth.js";

process.env.MCP_OWNER_PASSWORD = "owner-password";
process.env.MCP_TOKEN_PEPPER = "test-pepper-that-is-not-used-in-production";

class MemoryStore implements KeyValueStore {
  values = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | null> { return (this.values.get(key) as T | undefined) ?? null; }
  async set<T>(key: string, value: T): Promise<void> { this.values.set(key, value); }
  async delete(key: string): Promise<void> { this.values.delete(key); }
}

test("OAuth DCR, PKCE authorization, and token exchange work end to end", async () => {
  const store = new MemoryStore();
  const redirectUri = "https://chatgpt.com/connector/oauth/test-callback";
  const registration = await handleOAuth(new Request("https://mcp.example.com/oauth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ redirect_uris: [redirectUri], client_name: "ChatGPT" }) }), store);
  assert.equal(registration.status, 201);
  const registered = await registration.json() as { client_id: string };

  const verifier = "a".repeat(64);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const form = new URLSearchParams({ response_type: "code", client_id: registered.client_id, redirect_uri: redirectUri, code_challenge: challenge, code_challenge_method: "S256", scope: "servicenow.read servicenow.write", resource: "https://mcp.example.com/mcp", state: "state-1", owner_password: "owner-password" });
  const authorization = await handleOAuth(new Request("https://mcp.example.com/oauth/authorize", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form }), store);
  assert.equal(authorization.status, 302);
  const callback = new URL(authorization.headers.get("location") ?? "");
  assert.equal(callback.searchParams.get("state"), "state-1");
  const code = callback.searchParams.get("code") ?? "";

  const tokenForm = new URLSearchParams({ grant_type: "authorization_code", code, client_id: registered.client_id, redirect_uri: redirectUri, code_verifier: verifier, resource: "https://mcp.example.com/mcp" });
  const tokenResponse = await handleOAuth(new Request("https://mcp.example.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: tokenForm }), store);
  assert.equal(tokenResponse.status, 200);
  const token = await tokenResponse.json() as { access_token: string; refresh_token: string; scope: string };
  assert.ok(token.access_token.length > 30);
  assert.ok(token.refresh_token.length > 30);
  assert.match(token.scope, /servicenow.write/);

  const replay = await handleOAuth(new Request("https://mcp.example.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: tokenForm }), store);
  assert.equal(replay.status, 400);
});

test("dynamic registration rejects non-ChatGPT redirect URIs", async () => {
  const store = new MemoryStore();
  const response = await handleOAuth(new Request("https://mcp.example.com/oauth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ redirect_uris: ["https://evil.example/callback"] }) }), store, "203.0.113.1");
  assert.equal(response.status, 400);
});

test("authorization rejects a token resource for a different MCP server", async () => {
  const store = new MemoryStore();
  const redirectUri = "https://chatgpt.com/connector/oauth/resource-test";
  const registration = await handleOAuth(new Request("https://mcp.example.com/oauth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ redirect_uris: [redirectUri] }) }), store, "203.0.113.2");
  const clientId = ((await registration.json()) as { client_id: string }).client_id;
  const params = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirectUri, code_challenge: "challenge", code_challenge_method: "S256", resource: "https://other.example/mcp" });
  const response = await handleOAuth(new Request(`https://mcp.example.com/oauth/authorize?${params}`), store, "203.0.113.2");
  assert.equal(response.status, 400);
});

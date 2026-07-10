import assert from "node:assert/strict";
import test from "node:test";
import { ServiceNowClient, ServiceNowError, redact } from "../src/servicenow.js";

test("query sends narrow Table API parameters and redacts secret fields", async () => {
  let requested: URL | undefined;
  const client = new ServiceNowClient({
    instance: "https://dev000000.service-now.com",
    username: "admin",
    password: "pw",
    fetchImpl: async input => {
      requested = new URL(input.toString());
      return new Response(JSON.stringify({ result: [{ sys_id: "a".repeat(32), name: "Demo", client_secret: "hidden" }] }), { status: 200 });
    },
  });
  const result = await client.query("sys_script", { query: "active=true", fields: ["sys_id", "name"], limit: 500 });
  assert.equal(requested?.pathname, "/api/now/table/sys_script");
  assert.equal(requested?.searchParams.get("sysparm_limit"), "100");
  assert.equal(requested?.searchParams.get("sysparm_fields"), "sys_id,name");
  assert.equal(result[0]?.client_secret, "[REDACTED]");
});

test("writes are gated and secret-like fields are blocked", async () => {
  const disabled = new ServiceNowClient({ instance: "https://dev000000.service-now.com", username: "admin", password: "pw", writeEnabled: false, fetchImpl: async () => new Response("{}") });
  await assert.rejects(() => disabled.create("incident", { short_description: "test" }), /writes are disabled/i);
  process.env.SN_WRITE_TABLES = "sys_user";
  const enabled = new ServiceNowClient({ instance: "https://dev000000.service-now.com", username: "admin", password: "pw", writeEnabled: true, fetchImpl: async () => new Response("{}") });
  await assert.rejects(() => enabled.create("sys_user", { password: "nope" }), (error: unknown) => error instanceof ServiceNowError && error.status === 403);
  delete process.env.SN_WRITE_TABLES;
});

test("credential tables and nested response secrets are blocked or redacted", async () => {
  const client = new ServiceNowClient({ instance: "https://dev000000.service-now.com", username: "admin", password: "pw", fetchImpl: async () => new Response("{}") });
  await assert.rejects(() => client.query("oauth_credential"), /blocked/i);
  assert.deepEqual(redact({ outer: { refresh_token: "secret", safe: "yes" } }), { outer: { refresh_token: "[REDACTED]", safe: "yes" } });
});

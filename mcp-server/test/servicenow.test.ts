import assert from "node:assert/strict";
import test from "node:test";
import {
  listServiceNowProfiles,
  ServiceNowClient,
  ServiceNowError,
  redact,
} from "../src/servicenow.js";

test("named profiles keep credentials and safety gates separate", async () => {
  const names = [
    "SN_PROFILES",
    "SN_DEFAULT_PROFILE",
    "SN_PDI_INSTANCE",
    "SN_PDI_USERNAME",
    "SN_PDI_PASSWORD",
    "SN_PDI_WRITE_ENABLED",
    "SN_VARENERGI_DEV_LABEL",
    "SN_VARENERGI_DEV_INSTANCE",
    "SN_VARENERGI_DEV_USERNAME",
    "SN_VARENERGI_DEV_PASSWORD",
    "SN_VARENERGI_DEV_WRITE_ENABLED",
    "SN_VARENERGI_DEV_WRITE_TABLES",
  ];
  const previous = new Map(
    names.map((name) => [name, process.env[name]]),
  );

  Object.assign(process.env, {
    SN_PROFILES: "pdi,varenergi_dev",
    SN_DEFAULT_PROFILE: "pdi",
    SN_PDI_INSTANCE: "https://dev000000.service-now.com",
    SN_PDI_USERNAME: "pdi-user",
    SN_PDI_PASSWORD: "pdi-password",
    SN_PDI_WRITE_ENABLED: "false",
    SN_VARENERGI_DEV_LABEL: "Var Energi DEV",
    SN_VARENERGI_DEV_INSTANCE: "https://varenergidev.service-now.com",
    SN_VARENERGI_DEV_USERNAME: "client-user",
    SN_VARENERGI_DEV_PASSWORD: "client-password",
    SN_VARENERGI_DEV_WRITE_ENABLED: "true",
    SN_VARENERGI_DEV_WRITE_TABLES: "*",
  });

  try {
    const profiles = listServiceNowProfiles();

    assert.deepEqual(
      profiles.map(({ profile, instance, write_enabled }) => ({
        profile,
        instance,
        write_enabled,
      })),
      [
        {
          profile: "pdi",
          instance: "https://dev000000.service-now.com",
          write_enabled: false,
        },
        {
          profile: "varenergi_dev",
          instance: "https://varenergidev.service-now.com",
          write_enabled: true,
        },
      ],
    );

    const client = new ServiceNowClient({
      profile: "varenergi_dev",
      fetchImpl: async () => jsonResponse({ result: {} }),
    });

    assert.equal(client.profile, "varenergi_dev");
    assert.equal(client.profileLabel, "Var Energi DEV");
    assert.equal(
      client.instance.origin,
      "https://varenergidev.service-now.com",
    );

    await client.create("sys_script", { name: "Demo" });

    assert.throws(
      () => new ServiceNowClient({ profile: "unknown" }),
      /unknown servicenow profile/i,
    );
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("query sends narrow Table API parameters and redacts secret fields", async () => {
  let requested: URL | undefined;

  const client = new ServiceNowClient({
    instance: "https://dev000000.service-now.com",
    username: "admin",
    password: "pw",
    fetchImpl: async input => {
      requested = new URL(input.toString());

      return new Response(
        JSON.stringify({
          result: [
            {
              sys_id: "a".repeat(32),
              name: "Demo",
              client_secret: "hidden",
            },
          ],
        }),
        { status: 200 },
      );
    },
  });

  const result = await client.query("sys_script", {
    query: "active=true",
    fields: ["sys_id", "name"],
    limit: 500,
  });

  assert.equal(requested?.pathname, "/api/now/table/sys_script");
  assert.equal(requested?.searchParams.get("sysparm_limit"), "100");
  assert.equal(
    requested?.searchParams.get("sysparm_fields"),
    "sys_id,name",
  );
  assert.equal(
    requested?.searchParams.get("sysparm_display_value"),
    "false",
  );
  assert.equal(result[0]?.client_secret, "[REDACTED]");
});

test("sys_properties redaction handles display_value all wrappers", async () => {
  const client = new ServiceNowClient({
    instance: "https://dev000000.service-now.com",
    username: "admin",
    password: "pw",
    fetchImpl: async () => jsonResponse({
      result: [
        {
          name: {
            display_value: "integration.password",
            value: "integration.password",
          },
          value: {
            display_value: "visible-secret",
            value: "visible-secret",
          },
        },
      ],
    }),
  });

  const result = await client.query("sys_properties", {
    fields: ["name", "value"],
    displayValue: "all",
  });

  assert.equal(result[0]?.value, "[REDACTED]");
});

test("get defaults to raw display values", async () => {
  let requested: URL | undefined;
  const client = new ServiceNowClient({
    instance: "https://dev000000.service-now.com",
    username: "admin",
    password: "pw",
    fetchImpl: async input => {
      requested = new URL(input.toString());
      return jsonResponse({ result: { sys_id: "a".repeat(32) } });
    },
  });

  await client.get("incident", "a".repeat(32), ["sys_id"]);

  assert.equal(
    requested?.searchParams.get("sysparm_display_value"),
    "false",
  );
});

test("writes are gated and secret-like fields are blocked", async () => {
  const disabled = new ServiceNowClient({
    instance: "https://dev000000.service-now.com",
    username: "admin",
    password: "pw",
    writeEnabled: false,
    fetchImpl: async () => new Response("{}"),
  });

  await assert.rejects(
    () => disabled.create("incident", { short_description: "test" }),
    /writes are disabled/i,
  );

  process.env.SN_WRITE_TABLES = "sys_user";

  const enabled = new ServiceNowClient({
    instance: "https://dev000000.service-now.com",
    username: "admin",
    password: "pw",
    writeEnabled: true,
    fetchImpl: async () => new Response("{}"),
  });

  await assert.rejects(
    () => enabled.create("sys_user", { password: "nope" }),
    (error: unknown) =>
      error instanceof ServiceNowError &&
      error.status === 403,
  );

  delete process.env.SN_WRITE_TABLES;
});

test("temporary preference cleanup uses the write gate without broad delete access", async () => {
  let method: string | undefined;
  process.env.SN_WRITE_TABLES = "sys_user_preference";

  try {
    const client = new ServiceNowClient({
      instance: "https://dev000000.service-now.com",
      username: "admin",
      password: "pw",
      writeEnabled: true,
      deleteEnabled: false,
      fetchImpl: async (_input, init) => {
        method = init?.method;
        return new Response(null, { status: 204 });
      },
    });

    const result = await client.removeTemporaryUserPreference(
      "a".repeat(32),
    );

    assert.equal(method, "DELETE");
    assert.equal(result.removed, true);
  } finally {
    delete process.env.SN_WRITE_TABLES;
  }
});

test("Xplore execution requires its separate profile gate", async () => {
  const client = new ServiceNowClient({
    instance: "https://dev000000.service-now.com",
    username: "admin",
    password: "pw",
    writeEnabled: true,
    xploreEnabled: false,
    writeTables: "*",
    fetchImpl: async () => {
      throw new Error("Xplore should not be called");
    },
  });

  await assert.rejects(
    () => client.executeXplore("gs.print('ok');"),
    /Xplore execution is disabled/i,
  );
});

test("guarded Xplore execution posts form data and parses marked output", async () => {
  let requested: URL | undefined;
  let requestBody = "";

  const client = new ServiceNowClient({
    instance: "https://dev000000.service-now.com",
    username: "admin",
    password: "pw",
    writeEnabled: true,
    xploreEnabled: true,
    writeTables: "*",
    fetchImpl: async (input, init) => {
      requested = new URL(input.toString());
      requestBody = String(init?.body ?? "");

      return jsonResponse({
        $success: true,
        result: {
          string:
            'SN_RESULT_START{"ok":true}SN_RESULT_END',
        },
      });
    },
  });

  const result = await client.executeXplore(
    "gs.print('SN_RESULT_START' + JSON.stringify({ok: true}) + 'SN_RESULT_END');",
    "global",
  );

  assert.equal(requested?.pathname, "/snd_xplore.do");
  assert.equal(requested?.searchParams.get("action"), "run");
  assert.match(
    decodeURIComponent(requestBody),
    /SN_RESULT_START/,
  );
  assert.deepEqual(result.result, { ok: true });
  assert.equal(result.scope_output, "marked");
});

test("Xplore blocks destructive and secret-access APIs", async () => {
  const client = new ServiceNowClient({
    instance: "https://dev000000.service-now.com",
    username: "admin",
    password: "pw",
    writeEnabled: true,
    xploreEnabled: true,
    writeTables: "*",
    fetchImpl: async () => {
      throw new Error("Blocked scripts must not be sent");
    },
  });

  await assert.rejects(
    () => client.executeXplore(
      "new GlideRecord('sys_credentials').query();",
    ),
    /blocked high-risk/i,
  );
  await assert.rejects(
    () => client.executeXplore("current.deleteRecord();"),
    /blocked high-risk/i,
  );
});

test("customer-update save verifies source, context result, and captured row", async () => {
  const sourceId = "a".repeat(32);
  const updateSetId = "b".repeat(32);
  let xploreCode = "";

  const client = new ServiceNowClient({
    instance: "https://dev000000.service-now.com",
    username: "admin",
    password: "pw",
    writeEnabled: true,
    xploreEnabled: true,
    writeTables: "*",
    fetchImpl: async (input, init) => {
      const url = new URL(input.toString());

      if (
        url.pathname ===
          `/api/now/table/sn_cd_content_portal/${sourceId}`
      ) {
        return jsonResponse({
          result: { sys_id: sourceId },
        });
      }

      if (
        url.pathname ===
          `/api/now/table/sys_update_set/${updateSetId}`
      ) {
        return jsonResponse({
          result: {
            sys_id: updateSetId,
            state: {
              value: "in progress",
              display_value: "In progress",
            },
            application: {
              value: "c".repeat(32),
              display_value: "Manager Hub",
            },
          },
        });
      }

      if (url.pathname === "/snd_xplore.do") {
        const form = new URLSearchParams(String(init?.body ?? ""));
        const data = JSON.parse(form.get("data") ?? "{}") as {
          code?: string;
        };
        xploreCode = data.code ?? "";

        return jsonResponse({
          $success: true,
          result: {
            string:
              'SN_RESULT_START{"saved":true}SN_RESULT_END',
          },
        });
      }

      if (url.pathname === "/api/now/table/sys_update_xml") {
        return jsonResponse({
          result: [{
            sys_id: "d".repeat(32),
            name: `sn_cd_content_portal_${sourceId}`,
            update_set: updateSetId,
            application: {
              value: "c".repeat(32),
              display_value: "Manager Hub",
            },
          }],
        });
      }

      return new Response("Not found", { status: 404 });
    },
  });

  const result = await client.saveCustomerUpdate(
    "sn_cd_content_portal",
    sourceId,
    updateSetId,
  );

  assert.equal(result.saved, true);
  assert.match(xploreCode, /GlideUpdateManager2/);
  assert.match(xploreCode, new RegExp(updateSetId));
  assert.equal(
    (result.customer_update as Record<string, unknown>).name,
    `sn_cd_content_portal_${sourceId}`,
  );
});

test("credential tables and nested response secrets are blocked or redacted", async () => {
  const client = new ServiceNowClient({
    instance: "https://dev000000.service-now.com",
    username: "admin",
    password: "pw",
    fetchImpl: async () => new Response("{}"),
  });

  await assert.rejects(
    () => client.query("oauth_credential"),
    /blocked/i,
  );

  assert.deepEqual(
    redact({
      outer: {
        refresh_token: "secret",
        safe: "yes",
      },
    }),
    {
      outer: {
        refresh_token: "[REDACTED]",
        safe: "yes",
      },
    },
  );
});

test("table shape filters fields and can skip choice queries", async () => {
  const requested: URL[] = [];

  const client = new ServiceNowClient({
    instance: "https://dev000000.service-now.com",
    username: "admin",
    password: "pw",
    fetchImpl: async input => {
      const url = new URL(input.toString());
      requested.push(url);

      if (url.pathname === "/api/now/table/sys_db_object") {
        return jsonResponse({
          result: [
            {
              sys_id: "a".repeat(32),
              name: "incident",
              label: "Incident",
            },
          ],
        });
      }

      if (url.pathname === "/api/now/table/sys_dictionary") {
        return jsonResponse({
          result: [
            {
              sys_id: "b".repeat(32),
              element: "short_description",
              column_label: "Short description",
              internal_type: "string",
            },
          ],
        });
      }

      if (url.pathname === "/api/now/table/sys_choice") {
        throw new Error(
          "sys_choice should not be requested when includeChoices is false",
        );
      }

      return new Response("Not found", { status: 404 });
    },
  });

  const result = await client.tableShape("incident", {
    fields: ["short_description", "priority"],
    includeChoices: false,
  });

  const dictionaryRequest = requested.find(
    url => url.pathname === "/api/now/table/sys_dictionary",
  );

  assert.ok(dictionaryRequest);
  assert.match(
    dictionaryRequest.searchParams.get("sysparm_query") ?? "",
    /elementINshort_description,priority/,
  );

  assert.equal(
    requested.some(
      url => url.pathname === "/api/now/table/sys_choice",
    ),
    false,
  );

  assert.deepEqual(result.choices, []);
  assert.equal(requested.length, 2);
});

test("table shape rejects unsafe field names before making requests", async () => {
  let requestCount = 0;

  const client = new ServiceNowClient({
    instance: "https://dev000000.service-now.com",
    username: "admin",
    password: "pw",
    fetchImpl: async () => {
      requestCount += 1;
      return jsonResponse({ result: [] });
    },
  });

  await assert.rejects(
    () =>
      client.tableShape("incident", {
        fields: ["short_description^ORactive=true"],
      }),
    (error: unknown) =>
      error instanceof ServiceNowError &&
      error.status === 400,
  );

  assert.equal(requestCount, 0);
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

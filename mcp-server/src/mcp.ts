import type { KeyValueStore } from "./oauth.js";
import { validateBearer } from "./oauth.js";
import {
  listServiceNowProfiles,
  ServiceNowClient,
  ServiceNowError,
  type JsonObject,
  type ServiceNowProfileSummary,
} from "./servicenow.js";

interface RpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

interface McpDependencies {
  client?: ServiceNowClient;
  clientFactory?: (profile?: string) => ServiceNowClient;
  profileLister?: () => ServiceNowProfileSummary[];
  authStore?: KeyValueStore;
}

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonObject;
  annotations: JsonObject;
  securitySchemes: JsonObject[];
  _meta: JsonObject;
};

const READ_SECURITY = [
  { type: "oauth2", scopes: ["servicenow.read"] },
];

const WRITE_SECURITY = [
  { type: "oauth2", scopes: ["servicenow.write"] },
];

const TOOLS: ToolDefinition[] = [
  tool(
    "servicenow_list_profiles",
    "List ServiceNow profiles",
    "List configured ServiceNow instance profiles and their non-secret connection status and safety gates. Use the returned profile key explicitly on subsequent calls.",
    {},
    true,
  ),

  tool(
    "servicenow_health",
    "Check ServiceNow connection",
    "Verify a configured ServiceNow profile, authenticated user, and whether writes and deletes are enabled.",
    {
      profile: profileProperty(),
    },
    true,
    ["profile"],
  ),

  tool(
    "servicenow_query_records",
    "Query ServiceNow records",
    "Read a narrow set of records through the ServiceNow Table API. Always provide fields and a small limit when possible.",
    {
      profile: profileProperty(),
      table: str("ServiceNow table name"),
      query: str("Encoded query", false),
      fields: arr("Explicit fields to return"),
      limit: int("Maximum records, capped at 100", false, 1, 100),
      offset: int("Pagination offset", false),
      display_value: enumString(["true", "false", "all"], false),
    },
    true,
    ["profile", "table", "fields"],
  ),

  tool(
    "servicenow_get_record",
    "Get one ServiceNow record",
    "Read one record by table and sys_id.",
    {
      profile: profileProperty(),
      table: str("ServiceNow table name"),
      sys_id: str("32-character sys_id"),
      fields: arr("Explicit fields to return"),
      display_value: enumString(["true", "false", "all"], false),
    },
    true,
    ["profile", "table", "sys_id", "fields"],
  ),

  tool(
    "servicenow_table_shape",
    "Inspect ServiceNow table shape",
    "Inspect a table definition, selected direct dictionary fields, and optionally active choices before writing unfamiliar records.",
    {
      profile: profileProperty(),
      table: str("ServiceNow table name"),
      fields: arr(
        "Optional field names to inspect; omit to return all direct fields",
        false,
      ),
      include_choices: bool(
        "Whether to include active choices; defaults to true",
      ),
    },
    true,
    ["profile", "table"],
  ),

  tool(
    "servicenow_create_record",
    "Create a ServiceNow record",
    "Create exactly one record through the Table API. Set application scope and update-set context first when creating configuration.",
    {
      profile: profileProperty(),
      table: str("ServiceNow table name"),
      record: obj("Field/value object"),
    },
    false,
    ["profile", "table", "record"],
  ),

  tool(
    "servicenow_update_record",
    "Update a ServiceNow record",
    "Patch exactly one record by sys_id. Read it first and send only changed fields.",
    {
      profile: profileProperty(),
      table: str("ServiceNow table name"),
      sys_id: str("32-character sys_id"),
      record: obj("Fields to change"),
    },
    false,
    ["profile", "table", "sys_id", "record"],
  ),

  tool(
    "servicenow_delete_record",
    "Delete a ServiceNow record",
    "Delete exactly one record when deletes are enabled. Requires an exact confirmation string and should only be used for throwaway data or an explicitly approved deletion.",
    {
      profile: profileProperty(),
      table: str("ServiceNow table name"),
      sys_id: str("32-character sys_id"),
      confirmation: str("Must equal DELETE <profile> <table> <sys_id>"),
    },
    false,
    ["profile", "table", "sys_id", "confirmation"],
    true,
  ),
];

export async function handleMcp(
  req: Request,
  deps: McpDependencies = {},
): Promise<Response> {
  const origin = req.headers.get("origin");

  if (
    origin &&
    ![
      "https://chatgpt.com",
      "https://chat.openai.com",
      new URL(req.url).origin,
    ].includes(origin)
  ) {
    return new Response("Forbidden origin", { status: 403 });
  }

  if (req.method === "GET") {
    return new Response(
      "Streamable HTTP GET is not used by this stateless server.",
      {
        status: 405,
        headers: { Allow: "POST" },
      },
    );
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  const contentLength = Number(
    req.headers.get("content-length") ?? "0",
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > 1_000_000
  ) {
    return new Response("Request too large", { status: 413 });
  }

  const raw = await req.text();

  if (raw.length > 1_000_000) {
    return new Response("Request too large", { status: 413 });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return rpcResponse(
      null,
      undefined,
      { code: -32700, message: "Parse error" },
      400,
    );
  }

  if (!isObject(parsed)) {
    return rpcResponse(
      null,
      undefined,
      { code: -32600, message: "Invalid Request" },
      400,
    );
  }

  const rpc = parsed as RpcRequest;

  if (rpc.jsonrpc !== "2.0" || !rpc.method) {
    return rpcResponse(
      rpc.id ?? null,
      undefined,
      { code: -32600, message: "Invalid Request" },
      400,
    );
  }

  if (rpc.method === "initialize") {
    return rpcResponse(rpc.id ?? null, {
      protocolVersion: "2025-06-18",
      capabilities: {
        tools: { listChanged: false },
      },
      serverInfo: {
        name: "servicenow-pdi",
        title: "ServiceNow Development",
        version: "2.0.0",
      },
      instructions:
        "List profiles first and pass the intended profile explicitly. Inspect before writing. Prefer supported OOTB ServiceNow configuration. Use narrow reads with explicit fields. Before writes, verify profile health, read the target, set scope/update set when needed, patch one sys_id, and validate afterward. Never request or return credentials or secret fields.",
    });
  }

  if (
    rpc.method === "notifications/initialized" ||
    rpc.method.startsWith("notifications/")
  ) {
    return new Response(null, { status: 202 });
  }

  if (rpc.method === "ping") {
    return rpcResponse(rpc.id ?? null, {});
  }

  if (rpc.method === "tools/list") {
    return rpcResponse(rpc.id ?? null, { tools: TOOLS });
  }

  if (rpc.method !== "tools/call") {
    return rpcResponse(
      rpc.id ?? null,
      undefined,
      { code: -32601, message: "Method not found" },
      404,
    );
  }

  const params = isObject(rpc.params) ? rpc.params : {};
  const name =
    typeof params.name === "string" ? params.name : "";

  const definition = TOOLS.find(
    (item) => item.name === name,
  );

  if (!definition) {
    return rpcResponse(
      rpc.id ?? null,
      undefined,
      { code: -32602, message: "Unknown tool" },
      400,
    );
  }

  const requiredScope =
    definition.annotations.readOnlyHint === true
      ? "servicenow.read"
      : "servicenow.write";

  if (
    !await validateBearer(
      req,
      requiredScope,
      deps.authStore,
    )
  ) {
    return unauthorized(
      rpc.id ?? null,
      req.url,
      requiredScope,
    );
  }

  const args = isObject(params.arguments)
    ? params.arguments
    : {};

  let requestedProfile: string | undefined;
  const started = Date.now();

  try {
    requestedProfile = profileArg(args);

    if (
      name !== "servicenow_list_profiles" &&
      !requestedProfile
    ) {
      throw new ServiceNowError(
        "profile is required for every instance-bound ServiceNow tool",
        400,
      );
    }

    const result = name === "servicenow_list_profiles"
      ? (deps.profileLister ?? listServiceNowProfiles)()
      : await callTool(
          deps.clientFactory?.(requestedProfile) ??
            deps.client ??
            new ServiceNowClient({
              ...(requestedProfile
                ? { profile: requestedProfile }
                : {}),
            }),
          name,
          args,
        );

    console.log(
      JSON.stringify({
        event: "mcp_tool",
        tool: name,
        profile: requestedProfile || "none",
        table: stringArg(args, "table", false),
        sys_id: stringArg(args, "sys_id", false),
        ok: true,
        duration_ms: Date.now() - started,
      }),
    );

    return rpcResponse(
      rpc.id ?? null,
      toolResult(result),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      JSON.stringify({
        event: "mcp_tool",
        tool: name,
        profile: requestedProfile || "none",
        table: stringArg(args, "table", false),
        sys_id: stringArg(args, "sys_id", false),
        ok: false,
        status:
          error instanceof ServiceNowError
            ? error.status
            : 500,
        duration_ms: Date.now() - started,
      }),
    );

    return rpcResponse(
      rpc.id ?? null,
      toolResult({ error: message }, true),
    );
  }
}

async function callTool(
  client: ServiceNowClient,
  name: string,
  args: JsonObject,
): Promise<unknown> {
  switch (name) {
    case "servicenow_health":
      return client.health();

    case "servicenow_query_records": {
      const query = optionalString(args, "query");
      const fields = requiredStringArrayArg(
        args,
        "fields",
      );
      const limit = numberArg(args, "limit");
      const offset = numberArg(args, "offset");
      const displayValue = displayValueArg(args);

      return client.query(
        stringArg(args, "table"),
        {
          ...(query !== undefined ? { query } : {}),
          fields,
          ...(limit !== undefined ? { limit } : {}),
          ...(offset !== undefined ? { offset } : {}),
          ...(displayValue !== undefined
            ? { displayValue }
            : {}),
        },
      );
    }

    case "servicenow_get_record":
      return client.get(
        stringArg(args, "table"),
        stringArg(args, "sys_id"),
        requiredStringArrayArg(args, "fields"),
        displayValueArg(args) ?? "false",
      );

    case "servicenow_table_shape": {
      const fields = stringArrayArg(args, "fields");
      const includeChoices = booleanArg(
        args,
        "include_choices",
      );

      return client.tableShape(
        stringArg(args, "table"),
        {
          ...(fields !== undefined ? { fields } : {}),
          ...(includeChoices !== undefined
            ? { includeChoices }
            : {}),
        },
      );
    }

    case "servicenow_create_record":
      return client.create(
        stringArg(args, "table"),
        objectArg(args, "record"),
      );

    case "servicenow_update_record":
      return client.update(
        stringArg(args, "table"),
        stringArg(args, "sys_id"),
        objectArg(args, "record"),
      );

    case "servicenow_delete_record": {
      const table = stringArg(args, "table");
      const sysId = stringArg(args, "sys_id");

      if (
        stringArg(args, "confirmation") !==
        `DELETE ${client.profile} ${table} ${sysId}`
      ) {
        throw new ServiceNowError(
          "Delete confirmation does not match the target",
          400,
        );
      }

      return client.delete(table, sysId);
    }

    default:
      throw new ServiceNowError(
        "Unknown tool",
        400,
      );
  }
}

function tool(
  name: string,
  title: string,
  description: string,
  properties: JsonObject,
  readOnly: boolean,
  required: string[] = [],
  destructive = false,
): ToolDefinition {
  const security = readOnly
    ? READ_SECURITY
    : WRITE_SECURITY;

  return {
    name,
    title,
    description,
    inputSchema: {
      type: "object",
      properties,
      additionalProperties: false,
      ...(required.length ? { required } : {}),
    },
    annotations: {
      readOnlyHint: readOnly,
      destructiveHint: destructive,
      idempotentHint:
        name.includes("get") ||
        name.includes("list") ||
        name.includes("query") ||
        name.includes("shape") ||
        name.includes("health"),
      openWorldHint: true,
    },
    securitySchemes: security,
    _meta: {
      securitySchemes: security,
    },
  };
}

function profileProperty(): JsonObject {
  return {
    type: "string",
    description:
      "Profile key returned by servicenow_list_profiles; required on every instance-bound call.",
    pattern: "^[a-z][a-z0-9_]{0,31}$",
  };
}

function str(
  description: string,
  required = true,
): JsonObject {
  return {
    type: "string",
    description,
    ...(required ? { minLength: 1 } : {}),
  };
}

function arr(
  description: string,
  required = true,
): JsonObject {
  return {
    type: "array",
    description,
    items: { type: "string" },
    maxItems: 100,
    ...(required ? { minItems: 1 } : {}),
  };
}

function int(
  description: string,
  required = true,
  minimum = 0,
  maximum?: number,
): JsonObject {
  return {
    type: "integer",
    description,
    minimum,
    ...(maximum !== undefined ? { maximum } : {}),
    ...(required ? {} : {}),
  };
}

function bool(description: string): JsonObject {
  return {
    type: "boolean",
    description,
  };
}

function obj(description: string): JsonObject {
  return {
    type: "object",
    description,
    additionalProperties: true,
    minProperties: 1,
  };
}

function enumString(
  values: string[],
  required = true,
): JsonObject {
  return {
    type: "string",
    enum: values,
    ...(required ? {} : {}),
  };
}

function isObject(
  value: unknown,
): value is JsonObject {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value),
  );
}

function stringArg(
  args: JsonObject,
  key: string,
  required = true,
): string {
  const value = args[key];

  if (
    typeof value === "string" &&
    (!required || value.length > 0)
  ) {
    return value;
  }

  if (!required) {
    return "";
  }

  throw new ServiceNowError(
    `${key} must be a non-empty string`,
    400,
  );
}

function optionalString(
  args: JsonObject,
  key: string,
): string | undefined {
  const value = args[key];

  return typeof value === "string" && value
    ? value
    : undefined;
}

function profileArg(
  args: JsonObject,
): string | undefined {
  const value = args.profile;

  if (value === undefined) return undefined;

  if (
    typeof value === "string" &&
    /^[a-z][a-z0-9_]{0,31}$/.test(value)
  ) {
    return value;
  }

  throw new ServiceNowError(
    "profile must be a configured lowercase profile key",
    400,
  );
}

function numberArg(
  args: JsonObject,
  key: string,
): number | undefined {
  const value = args[key];

  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value)
  ) {
    throw new ServiceNowError(
      `${key} must be an integer`,
      400,
    );
  }

  return value;
}

function booleanArg(
  args: JsonObject,
  key: string,
): boolean | undefined {
  const value = args[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new ServiceNowError(
      `${key} must be a boolean`,
      400,
    );
  }

  return value;
}

function stringArrayArg(
  args: JsonObject,
  key: string,
): string[] | undefined {
  const value = args[key];

  if (value === undefined) {
    return undefined;
  }

  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string")
  ) {
    throw new ServiceNowError(
      `${key} must be an array of strings`,
      400,
    );
  }

  return value;
}

function requiredStringArrayArg(
  args: JsonObject,
  key: string,
): string[] {
  const value = stringArrayArg(args, key);

  if (!value?.length) {
    throw new ServiceNowError(
      `${key} must be a non-empty array of strings`,
      400,
    );
  }

  return value;
}

function objectArg(
  args: JsonObject,
  key: string,
): JsonObject {
  const value = args[key];

  if (
    !isObject(value) ||
    !Object.keys(value).length
  ) {
    throw new ServiceNowError(
      `${key} must be a non-empty object`,
      400,
    );
  }

  return value;
}

function displayValueArg(
  args: JsonObject,
): "true" | "false" | "all" | undefined {
  const value = args.display_value;

  if (value === undefined) {
    return undefined;
  }

  if (
    value === "true" ||
    value === "false" ||
    value === "all"
  ) {
    return value;
  }

  throw new ServiceNowError(
    "display_value must be true, false, or all",
    400,
  );
}

function toolResult(
  data: unknown,
  isError = false,
): JsonObject {
  const text =
    isError &&
    isObject(data) &&
    typeof data.error === "string"
      ? data.error
      : isError
        ? "ServiceNow operation failed."
        : "Action completed.";

  return {
    content: [{ type: "text", text }],
    structuredContent: { result: data },
    ...(isError ? { isError: true } : {}),
  };
}

function rpcResponse(
  id: string | number | null,
  result?: unknown,
  error?: JsonObject,
  status = 200,
): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id,
      ...(error ? { error } : { result }),
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}

function unauthorized(
  id: string | number | null,
  requestUrl: string,
  scope: string,
): Response {
  const origin = new URL(requestUrl).origin;

  const challenge =
    `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource", scope="${scope}"`;

  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32001,
        message: "Authorization required",
        data: {
          _meta: {
            "mcp/www_authenticate": [challenge],
          },
        },
      },
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": challenge,
        "Cache-Control": "no-store",
      },
    },
  );
}

export { TOOLS };

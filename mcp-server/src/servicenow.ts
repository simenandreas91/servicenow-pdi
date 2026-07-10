import { env, envFlag, requiredEnv } from "./env.js";

export type JsonObject = Record<string, unknown>;
type FetchLike = typeof fetch;

const TABLE_RE = /^[A-Za-z0-9_]+$/;
const SYS_ID_RE = /^[0-9a-f]{32}$/i;
const BLOCKED_TABLES = new Set([
  "oauth_credential",
  "sys_auth_profile_basic",
  "sys_user_token",
  "sys_certificate",
  "sys_credentials",
]);
const SECRET_FIELD_RE = /(^|_)(password|passwd|secret|access_token|refresh_token|private_key|credential|credentials)($|_)/i;
const SECRET_VALUE_HINT_RE = /(password|passwd|secret|token|private.?key|credential|api.?key)/i;

export class ServiceNowError extends Error {
  constructor(message: string, readonly status = 500, readonly detail?: unknown) {
    super(message);
  }
}

export interface ServiceNowOptions {
  instance?: string;
  username?: string;
  password?: string;
  fetchImpl?: FetchLike;
  writeEnabled?: boolean;
  deleteEnabled?: boolean;
}

export class ServiceNowClient {
  readonly instance: URL;
  readonly writeEnabled: boolean;
  readonly deleteEnabled: boolean;
  private readonly username: string;
  private readonly password: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: ServiceNowOptions = {}) {
    this.instance = new URL(options.instance ?? requiredEnv("SN_INSTANCE"));
    if (this.instance.protocol !== "https:") throw new Error("SN_INSTANCE must use HTTPS");
    if (!this.instance.hostname.endsWith(".service-now.com")) throw new Error("SN_INSTANCE must be a service-now.com host");
    this.username = options.username ?? requiredEnv("SN_USERNAME");
    this.password = options.password ?? requiredEnv("SN_PASSWORD");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.writeEnabled = options.writeEnabled ?? envFlag("SN_WRITE_ENABLED");
    this.deleteEnabled = options.deleteEnabled ?? envFlag("SN_DELETE_ENABLED");
  }

  private validateTable(table: string): void {
    if (!TABLE_RE.test(table)) throw new ServiceNowError("Invalid table name", 400);
    const additionalBlocked = csvSet(env("SN_ADDITIONAL_BLOCKED_TABLES"));
    if (BLOCKED_TABLES.has(table) || additionalBlocked.has(table) || /(credential|password|user_token|certificate|private_key)/i.test(table)) throw new ServiceNowError(`Access to ${table} is blocked`, 403);
  }

  private validateSysId(sysId: string): void {
    if (!SYS_ID_RE.test(sysId)) throw new ServiceNowError("sys_id must be 32 hexadecimal characters", 400);
  }

  private validateWrite(record: JsonObject): void {
    for (const key of Object.keys(record)) {
      if (SECRET_FIELD_RE.test(key)) throw new ServiceNowError(`Writing secret-like field '${key}' is blocked`, 403);
    }
  }

  private validateTablePermission(table: string, kind: "write" | "delete"): void {
    const configured = csvSet(env(kind === "write" ? "SN_WRITE_TABLES" : "SN_DELETE_TABLES"));
    if (!configured.has("*") && !configured.has(table)) throw new ServiceNowError(`${kind === "write" ? "Writes" : "Deletes"} to ${table} are not allowlisted`, 403);
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const url = new URL(path, this.instance);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await this.fetchImpl(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(`${this.username}:${this.password}`).toString("base64")}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      });
      const text = await response.text();
      const payload = text ? safeJson(text) : null;
      if (!response.ok) {
        const detail = typeof payload === "object" && payload !== null ? redact(payload) : String(text).slice(0, 1000);
        throw new ServiceNowError(`ServiceNow returned HTTP ${response.status}`, response.status, detail);
      }
      return sanitizeTablePayload(tableFromPath(path), payload);
    } catch (error) {
      if (error instanceof ServiceNowError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new ServiceNowError("ServiceNow request timed out", 504);
      throw new ServiceNowError("ServiceNow request failed", 502, error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timer);
    }
  }

  async health(): Promise<JsonObject> {
    const users = await this.query("sys_user", {
      query: "sys_id=javascript:gs.getUserID()",
      fields: ["sys_id", "user_name", "name", "active"],
      limit: 1,
    });
    return {
      instance: this.instance.origin,
      authenticated_user: users[0] ?? null,
      write_enabled: this.writeEnabled,
      delete_enabled: this.deleteEnabled,
    };
  }

  async query(table: string, input: { query?: string; fields?: string[]; limit?: number; offset?: number; displayValue?: "true" | "false" | "all" } = {}): Promise<JsonObject[]> {
    this.validateTable(table);
    const params = new URLSearchParams();
    if (input.query) params.set("sysparm_query", input.query);
    if (input.fields?.length) params.set("sysparm_fields", input.fields.join(","));
    params.set("sysparm_limit", String(Math.min(Math.max(input.limit ?? 20, 1), 100)));
    params.set("sysparm_offset", String(Math.max(input.offset ?? 0, 0)));
    params.set("sysparm_display_value", input.displayValue ?? "all");
    params.set("sysparm_exclude_reference_link", "true");
    const payload = await this.request(`/api/now/table/${table}?${params}`) as { result?: JsonObject[] };
    return payload?.result ?? [];
  }

  async get(table: string, sysId: string, fields?: string[], displayValue: "true" | "false" | "all" = "all"): Promise<JsonObject | null> {
    this.validateTable(table);
    this.validateSysId(sysId);
    const params = new URLSearchParams({ sysparm_display_value: displayValue, sysparm_exclude_reference_link: "true" });
    if (fields?.length) params.set("sysparm_fields", fields.join(","));
    try {
      const payload = await this.request(`/api/now/table/${table}/${sysId}?${params}`) as { result?: JsonObject };
      return payload?.result ?? null;
    } catch (error) {
      if (error instanceof ServiceNowError && error.status === 404) return null;
      throw error;
    }
  }

  async create(table: string, record: JsonObject): Promise<JsonObject> {
    this.validateTable(table);
    if (!this.writeEnabled) throw new ServiceNowError("ServiceNow writes are disabled", 403);
    this.validateTablePermission(table, "write");
    this.validateWrite(record);
    const payload = await this.request(`/api/now/table/${table}`, { method: "POST", body: JSON.stringify(record) }) as { result?: JsonObject };
    return payload.result ?? {};
  }

  async update(table: string, sysId: string, record: JsonObject): Promise<JsonObject> {
    this.validateTable(table);
    this.validateSysId(sysId);
    if (!this.writeEnabled) throw new ServiceNowError("ServiceNow writes are disabled", 403);
    this.validateTablePermission(table, "write");
    this.validateWrite(record);
    const payload = await this.request(`/api/now/table/${table}/${sysId}`, { method: "PATCH", body: JSON.stringify(record) }) as { result?: JsonObject };
    return payload.result ?? {};
  }

  async delete(table: string, sysId: string): Promise<JsonObject> {
    this.validateTable(table);
    this.validateSysId(sysId);
    if (!this.deleteEnabled) throw new ServiceNowError("ServiceNow deletes are disabled", 403);
    this.validateTablePermission(table, "delete");
    await this.request(`/api/now/table/${table}/${sysId}`, { method: "DELETE" });
    return { deleted: true, table, sys_id: sysId };
  }

  async tableShape(table: string): Promise<JsonObject> {
    this.validateTable(table);
    const [definition, fields, choices] = await Promise.all([
      this.query("sys_db_object", { query: `name=${table}`, fields: ["sys_id", "name", "label", "super_class", "sys_scope"], limit: 1 }),
      this.query("sys_dictionary", { query: `name=${table}^elementISNOTEMPTY^ORDERBYposition`, fields: ["sys_id", "element", "column_label", "internal_type", "reference", "mandatory", "read_only", "max_length", "attributes"], limit: 100 }),
      this.query("sys_choice", { query: `name=${table}^inactive=false^ORDERBYelement^ORDERBYsequence`, fields: ["element", "value", "label", "sequence", "dependent_value"], limit: 100 }),
    ]);
    return { table: definition[0] ?? null, fields, choices };
  }
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text) as unknown; } catch { return text; }
}

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const output: JsonObject = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = SECRET_FIELD_RE.test(key) ? "[REDACTED]" : redact(item);
    }
    return output;
  }
  return value;
}

function sanitizeTablePayload(table: string | undefined, value: unknown): unknown {
  const clean = redact(value);
  if (table !== "sys_properties" || !clean || typeof clean !== "object") return clean;
  const visit = (item: unknown): void => {
    if (Array.isArray(item)) { item.forEach(visit); return; }
    if (!item || typeof item !== "object") return;
    const record = item as JsonObject;
    if (typeof record.name === "string" && SECRET_VALUE_HINT_RE.test(record.name) && "value" in record) record.value = "[REDACTED]";
    Object.values(record).forEach(visit);
  };
  visit(clean);
  return clean;
}

function tableFromPath(path: string): string | undefined {
  return /^\/api\/now\/table\/([A-Za-z0-9_]+)/.exec(path)?.[1];
}

function csvSet(value: string | undefined): Set<string> {
  return new Set((value ?? "").split(",").map(item => item.trim()).filter(Boolean));
}

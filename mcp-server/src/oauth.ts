import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getDeployStore, getStore } from "@netlify/blobs";
import { envFlag, requiredEnv } from "./env.js";

const SCOPES = ["servicenow.read", "servicenow.write"];
const CODE_TTL_MS = 5 * 60_000;
const ACCESS_TTL_MS = 60 * 60_000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60_000;

interface RegisteredClient {
  redirectUris: string[];
  name: string;
  createdAt: number;
}
interface AuthorizationCode {
  clientId: string;
  redirectUri: string;
  challenge: string;
  scope: string;
  resource: string;
  expiresAt: number;
}
interface StoredToken {
  clientId: string;
  scope: string;
  expiresAt: number;
  kind: "access" | "refresh";
  resource: string;
}
interface RateRecord { count: number; resetAt: number; }

export interface KeyValueStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export function createAuthStore(deployContext = "production"): KeyValueStore {
  const store = deployContext === "production"
    ? getStore({ name: "servicenow-pdi-mcp-auth", consistency: "strong" })
    : getDeployStore({ name: "servicenow-pdi-mcp-auth" });
  return {
    async get<T>(key: string) { return await store.get(key, { type: "json" }) as T | null; },
    async set<T>(key: string, value: T) { await store.setJSON(key, value); },
    async delete(key: string) { await store.delete(key); },
  };
}

export async function handleOAuth(req: Request, store = createAuthStore(), clientIp = "unknown"): Promise<Response> {
  const url = new URL(req.url);
  const origin = url.origin;
  if (url.pathname === "/.well-known/oauth-protected-resource" || url.pathname === "/.well-known/oauth-protected-resource/mcp") {
    return json({ resource: `${origin}/mcp`, authorization_servers: [origin], scopes_supported: SCOPES, bearer_methods_supported: ["header"] });
  }
  if (url.pathname === "/.well-known/oauth-authorization-server") {
    return json({
      issuer: origin,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/oauth/token`,
      registration_endpoint: `${origin}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: SCOPES,
    });
  }
  if (url.pathname === "/oauth/register" && req.method === "POST") {
    if (!await withinRateLimit(store, `register:${clientIp}`, 20, 60 * 60_000)) return json({ error: "rate_limit_exceeded" }, 429);
    return registerClient(req, store);
  }
  if (url.pathname === "/oauth/authorize" && req.method === "GET") return authorizationPage(url, store);
  if (url.pathname === "/oauth/authorize" && req.method === "POST") {
    if (!await withinRateLimit(store, `authorize:${clientIp}`, 10, 10 * 60_000)) return html("<h1>Too many attempts</h1><p>Wait ten minutes and try again.</p>", 429);
    return authorize(req, store);
  }
  if (url.pathname === "/oauth/token" && req.method === "POST") {
    if (!await withinRateLimit(store, `token:${clientIp}`, 30, 10 * 60_000)) return json({ error: "rate_limit_exceeded" }, 429);
    return exchangeToken(req, store);
  }
  return json({ error: "not_found" }, 404);
}

async function registerClient(req: Request, store: KeyValueStore): Promise<Response> {
  const body = await parseJson(req);
  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((x): x is string => typeof x === "string") : [];
  if (!redirectUris.length || redirectUris.some(uri => !isAllowedRedirect(uri))) return json({ error: "invalid_redirect_uri" }, 400);
  const clientId = randomToken(24);
  await store.set<RegisteredClient>(`client:${clientId}`, {
    redirectUris,
    name: typeof body.client_name === "string" ? body.client_name.slice(0, 100) : "ChatGPT",
    createdAt: Date.now(),
  });
  return json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  }, 201);
}

async function authorizationPage(url: URL, store: KeyValueStore): Promise<Response> {
  const validation = await validateAuthorizationRequest(url.searchParams, store, url.origin);
  if ("error" in validation) return html(`<h1>Authorization failed</h1><p>${escapeHtml(validation.error)}</p>`, 400);
  const hidden = [...url.searchParams.entries()].map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`).join("\n");
  return html(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Authorize ServiceNow PDI</title><style>body{font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem}input,button{font:inherit;padding:.7rem;width:100%;box-sizing:border-box;margin:.4rem 0}button{cursor:pointer}.box{background:#f4f4f4;padding:1rem;border-radius:.5rem;overflow-wrap:anywhere}</style></head><body><h1>Connect ServiceNow PDI</h1><p>Sign in with the private MCP owner password. This does not expose your ServiceNow password to ChatGPT.</p><div class="box"><strong>Client:</strong> ${escapeHtml(validation.clientName)}<br><strong>Redirect:</strong> ${escapeHtml(new URL(validation.redirectUri).origin)}<br><strong>Access:</strong> ${escapeHtml(validation.scope)}</div><form method="post" action="/oauth/authorize">${hidden}<label>Owner password<input name="owner_password" type="password" required autocomplete="current-password"></label><button type="submit">Authorize this client</button></form></body></html>`);
}

async function authorize(req: Request, store: KeyValueStore): Promise<Response> {
  const form = await req.formData();
  const params = new URLSearchParams();
  for (const [key, value] of form.entries()) if (key !== "owner_password" && typeof value === "string") params.set(key, value);
  const validation = await validateAuthorizationRequest(params, store, new URL(req.url).origin);
  if ("error" in validation) return html(`<h1>Authorization failed</h1><p>${escapeHtml(validation.error)}</p>`, 400);
  const supplied = String(form.get("owner_password") ?? "");
  if (!safeEqual(supplied, requiredEnv("MCP_OWNER_PASSWORD"))) return html("<h1>Authorization failed</h1><p>Incorrect owner password.</p>", 401);
  const code = randomToken(32);
  await store.set<AuthorizationCode>(`code:${hashToken(code)}`, {
    clientId: validation.clientId,
    redirectUri: validation.redirectUri,
    challenge: validation.challenge,
    scope: validation.scope,
    resource: validation.resource,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
  const redirect = new URL(validation.redirectUri);
  redirect.searchParams.set("code", code);
  if (validation.state) redirect.searchParams.set("state", validation.state);
  return new Response(null, { status: 302, headers: { Location: redirect.toString(), "Cache-Control": "no-store", Pragma: "no-cache" } });
}

async function validateAuthorizationRequest(params: URLSearchParams, store: KeyValueStore, origin: string): Promise<{ clientId: string; clientName: string; redirectUri: string; challenge: string; scope: string; state: string; resource: string } | { error: string }> {
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const challenge = params.get("code_challenge") ?? "";
  const method = params.get("code_challenge_method") ?? "";
  const scope = normalizeScope(params.get("scope"));
  const resource = params.get("resource") ?? `${origin}/mcp`;
  if (params.get("response_type") !== "code") return { error: "Only response_type=code is supported." };
  if (!clientId || !redirectUri || !challenge || method !== "S256") return { error: "Client, redirect URI, and S256 PKCE are required." };
  if (resource !== `${origin}/mcp`) return { error: "Invalid OAuth resource." };
  const client = await resolveClient(clientId, store);
  if (!client || !client.redirectUris.includes(redirectUri)) return { error: "Unknown client or redirect URI." };
  return { clientId, clientName: client.name, redirectUri, challenge, scope, state: params.get("state") ?? "", resource };
}

async function exchangeToken(req: Request, store: KeyValueStore): Promise<Response> {
  const form = await req.formData();
  const grantType = String(form.get("grant_type") ?? "");
  if (grantType === "authorization_code") {
    const code = String(form.get("code") ?? "");
    const clientId = String(form.get("client_id") ?? "");
    const redirectUri = String(form.get("redirect_uri") ?? "");
    const verifier = String(form.get("code_verifier") ?? "");
    const resource = String(form.get("resource") ?? "");
    const key = `code:${hashToken(code)}`;
    const stored = await store.get<AuthorizationCode>(key);
    if (!stored || stored.expiresAt < Date.now() || stored.clientId !== clientId || stored.redirectUri !== redirectUri || (resource && resource !== stored.resource) || pkceChallenge(verifier) !== stored.challenge) return json({ error: "invalid_grant" }, 400);
    await store.delete(key);
    return issueTokens(store, clientId, stored.scope, stored.resource);
  }
  if (grantType === "refresh_token") {
    const refreshToken = String(form.get("refresh_token") ?? "");
    const clientId = String(form.get("client_id") ?? "");
    const key = `token:${hashToken(refreshToken)}`;
    const stored = await store.get<StoredToken>(key);
    if (!stored || stored.kind !== "refresh" || stored.expiresAt < Date.now() || stored.clientId !== clientId) return json({ error: "invalid_grant" }, 400);
    await store.delete(key);
    return issueTokens(store, clientId, stored.scope, stored.resource);
  }
  return json({ error: "unsupported_grant_type" }, 400);
}

async function issueTokens(store: KeyValueStore, clientId: string, scope: string, resource: string): Promise<Response> {
  const accessToken = randomToken(32);
  const refreshToken = randomToken(40);
  await Promise.all([
    store.set<StoredToken>(`token:${hashToken(accessToken)}`, { clientId, scope, resource, kind: "access", expiresAt: Date.now() + ACCESS_TTL_MS }),
    store.set<StoredToken>(`token:${hashToken(refreshToken)}`, { clientId, scope, resource, kind: "refresh", expiresAt: Date.now() + REFRESH_TTL_MS }),
  ]);
  return json({ access_token: accessToken, token_type: "Bearer", expires_in: ACCESS_TTL_MS / 1000, refresh_token: refreshToken, scope });
}

export async function validateBearer(req: Request, requiredScope: string, store = createAuthStore()): Promise<boolean> {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
  if (!match?.[1]) return false;
  const token = await store.get<StoredToken>(`token:${hashToken(match[1])}`);
  const expectedResource = `${new URL(req.url).origin}/mcp`;
  return Boolean(token && token.kind === "access" && token.resource === expectedResource && token.expiresAt >= Date.now() && token.scope.split(/\s+/).includes(requiredScope));
}

async function withinRateLimit(store: KeyValueStore, bucket: string, maximum: number, windowMs: number): Promise<boolean> {
  const key = `rate:${hashToken(bucket)}`;
  const now = Date.now();
  const existing = await store.get<RateRecord>(key);
  const next = !existing || existing.resetAt <= now ? { count: 1, resetAt: now + windowMs } : { count: existing.count + 1, resetAt: existing.resetAt };
  await store.set(key, next);
  return next.count <= maximum;
}

async function resolveClient(clientId: string, store: KeyValueStore): Promise<RegisteredClient | null> {
  const registered = await store.get<RegisteredClient>(`client:${clientId}`);
  if (registered) return registered;
  let url: URL;
  try { url = new URL(clientId); } catch { return null; }
  if (url.protocol !== "https:" || url.hostname !== "chatgpt.com" || !url.pathname.startsWith("/oauth/")) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) return null;
    const body = await response.json() as Record<string, unknown>;
    const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((item): item is string => typeof item === "string" && isAllowedRedirect(item)) : [];
    if (!redirectUris.length) return null;
    return { redirectUris, name: typeof body.client_name === "string" ? body.client_name.slice(0, 100) : "ChatGPT", createdAt: Date.now() };
  } catch { return null; } finally { clearTimeout(timer); }
}

function normalizeScope(raw: string | null): string {
  const requested = new Set((raw ?? SCOPES.join(" ")).split(/\s+/));
  return SCOPES.filter(scope => requested.has(scope)).join(" ") || "servicenow.read";
}
function randomToken(bytes: number): string { return randomBytes(bytes).toString("base64url"); }
function hashToken(token: string): string { return createHash("sha256").update(requiredEnv("MCP_TOKEN_PEPPER")).update("\0").update(token).digest("hex"); }
function pkceChallenge(verifier: string): string { return createHash("sha256").update(verifier).digest("base64url"); }
function safeEqual(left: string, right: string): boolean { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }
function isAllowedRedirect(uri: string): boolean {
  try {
    const url = new URL(uri);
    if (url.protocol === "https:" && url.hostname === "chatgpt.com" && (url.pathname.startsWith("/connector/oauth/") || url.pathname === "/connector_platform_oauth_redirect")) return true;
    return envFlag("MCP_ALLOW_LOCAL_REDIRECTS") && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch { return false; }
}
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char); }
async function parseJson(req: Request): Promise<Record<string, unknown>> { try { return await req.json() as Record<string, unknown>; } catch { return {}; } }
function json(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
function html(value: string, status = 200): Response { return new Response(value, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" } }); }

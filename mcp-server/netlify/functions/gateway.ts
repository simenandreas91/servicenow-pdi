import type { Config, Context } from "@netlify/functions";
import { handleMcp } from "../../src/mcp.js";
import { createAuthStore, handleOAuth } from "../../src/oauth.js";

export default async (req: Request, context: Context): Promise<Response> => {
  const path = new URL(req.url).pathname;
  try {
    if (path === "/healthz") return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    const authStore = createAuthStore(context.deploy.context);
    if (path === "/mcp") return handleMcp(req, { authStore });
    return handleOAuth(req, authStore, context.ip);
  } catch (error) {
    console.error(JSON.stringify({ event: "gateway_error", path, message: error instanceof Error ? error.message : String(error) }));
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
};

export const config: Config = {
  path: [
    "/mcp",
    "/healthz",
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-protected-resource/mcp",
    "/.well-known/oauth-authorization-server",
    "/oauth/register",
    "/oauth/authorize",
    "/oauth/token"
  ],
};

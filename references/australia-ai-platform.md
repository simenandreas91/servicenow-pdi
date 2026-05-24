# Australia AI Platform Notes

Use this only for release-sensitive AI development features in the Australia family: Build Agent, ServiceNow Studio AI-assisted app generation, MCP Server Console, MCP Client, and related metadata support. For runtime Now Assist configuration, also load `references/now-assist.md`.

Research baseline: official ServiceNow Australia release notes checked 2026-05-24.

## Current Signals

- Build Agent is positioned as a conversational development surface for creating, editing, and deploying full-stack applications and metadata. Australia highlights include use inside ServiceNow Studio, broader MCP support, global-scope support, additional model support, and expanded metadata support. Source: https://www.servicenow.com/docs/r/release-notes/build-agent-rn.html
- Australia Patch 2 release notes say Build Agent can connect to external MCP servers, create agentic workflows/agents/skills, run ATF tests through Test Agent, perform Playwright-based UI validation in Cloud Runner, use semantic artifact search, and support more metadata such as flows, Service Catalog configuration, inbound email actions, dictionary overrides, choice lists, condition builder queries, and enhanced Service Portal capabilities. Source: https://www.servicenow.com/docs/r/release-notes/build-agent-rn.html
- ServiceNow Studio is active by default on the ServiceNow AI Platform in Australia. Build Agent is the default AI-assisted app generation path, and Studio can add UI Builder files, catalog items, flows, notifications, and other app files. Source: https://www.servicenow.com/docs/r/release-notes/servicenow-studio-rn.html
- MCP Server Console is new in Australia and provides governed ServiceNow functionality to external MCP clients through MCP servers. Notes call out a Quickstart Server for incident/case lookup and summarization, OAuth 2.0 client access, tools from Now Assist skills, and version 1.3 support for tools from Knowledge Graph, subflows, actions, and REST APIs. Source: https://www.servicenow.com/docs/r/release-notes/mcp-server-console-rn.html
- MCP Server Console plugin is `sn_mcp_server`. Activation depends on Now Assist application activation and related Generative AI Controller / Now Assist plugin setup. Do not assume it exists in a PDI or customer DEV without checking installed plugins and entitlements. Source: https://www.servicenow.com/docs/r/release-notes/mcp-server-console-rn.html

## Skill Routing Guidance

1. For Build Agent or Studio questions, inspect the actual instance release/build, installed apps/plugins, and visible Studio options before giving implementation steps.
2. For MCP Server Console work, verify `sn_mcp_server`, OAuth/client setup, AI Control Tower governance expectations, and the specific tool category before creating tools.
3. For MCP Client work inside ServiceNow, treat external MCP servers as integrations: confirm auth, data exposure, tool scope, logging, and governance before connecting.
4. Prefer read-only inventory first. Table API metadata reads can be blocked by API-level ACLs; use constrained Xplore fallback when the skill needs plugin/app inventory and Xplore is available.
5. Do not replace normal platform configuration with AI/agentic workflows when a deterministic Flow, ACL, catalog item, import, notification, or Business Rule is simpler and easier to test.

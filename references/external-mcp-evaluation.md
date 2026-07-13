# External ServiceNow MCP Evaluation

Use this when evaluating, installing, configuring, or relying on an external ServiceNow MCP server or similar agent-facing tool. Treat external MCPs as optional discovery aids until they prove they meet this skill's update-set, security, and auditability standards.

## Principle

MCP servers can expose broad ServiceNow capabilities through one tool surface: record reads, writes, update-set operations, schema discovery, script execution, catalog actions, docs search, and multi-instance routing. That breadth is useful for exploration, but it can create a larger blast radius than the bundled PowerShell helpers.

Default stance:

- Read-only discovery is acceptable after credentials and instance target are understood.
- Writes, update-set manipulation, script execution, fix scripts, credentials, auth profiles, plugin installs, and production access require explicit gating.
- The bundled helpers remain the trusted implementation path unless the MCP proves equivalent context control, update capture, verification evidence, and rollback visibility.

Useful patterns from current ServiceNow MCP projects:

- Happy Platform MCP: multi-instance routing, runtime schema discovery, update-set tools, script sync, local official-docs search, and documented REST/API limitations.
- aartiq ServiceNow MCP: permission tiers, role-based tool packages, separate write/scripting gates, and narrower persona surfaces.

Borrow the safety model, not the full tool surface by default.

## Capability Inventory

Before using an MCP for a task, identify:

- Supported auth modes: Basic, OAuth, per-user auth, API key, or local profile.
- Instance routing: single default instance or explicit named instances.
- Tool categories: read, write, update sets, scripts, fix scripts, catalog, Flow, Workspace, integrations, credentials, docs search.
- Scope controls: role/persona packages, allowlists, per-tool disable flags, environment-variable gates.
- Logging: whether tool calls expose table, query, sys_id, changed fields, target instance, and response evidence.
- Secret handling: whether passwords, tokens, OAuth secrets, session tokens, auth profiles, and credential records are redacted.

If the MCP does not make these visible, use it only for low-risk read-only exploration.

## Permission Tiers

Classify every MCP capability before use:

| Tier | Capability | Default stance |
| --- | --- | --- |
| 0 | Read-only metadata, schema, records, docs, index/search | Allowed for DEV/PDI with explicit instance awareness |
| 1 | Narrow creates/updates on ordinary records | Use only when update-set context and rollback are clear |
| 2 | Update-set selection, movement, completion, export, batching | Prefer bundled helpers; require summary and mixed-scope checks |
| 3 | Script execution, background scripts, fix scripts, script sync, generated code deployment | Stop and confirm; prefer Xplore helper with constrained script |
| 4 | Credentials, OAuth, SSO, MID Server, plugins, broad data repair, production writes | Stop; explicit approval required and usually avoid MCP |

Never allow a broad `full` tool package for routine ServiceNow work when a narrower read-only or developer package is available.

## Evaluation Checklist

Ask these before relying on an MCP:

- Can writes and scripting be disabled independently from reads?
- Can the tool surface be limited by persona, role package, or allowlist?
- Can it target only PDI/DEV by default and require explicit PROD selection?
- Does every write identify target table, sys_id, changed fields, and previous values or a rollback path?
- Can it set and verify current application and update set before writes?
- Can it prove customer-update capture and detect mixed-scope update-set rows?
- Does it distinguish Table API ACL failures from missing records?
- Does it avoid printing secrets and credential payloads?
- Does it document operations that REST cannot safely or fully perform?
- Does it support dry-run/read-only modes for discovery?

If any answer is no, keep the MCP in discovery mode and use the bundled helpers for implementation.

## Instance Routing Rules

- PDI and DEV: read-only MCP exploration is acceptable after confirming target instance and auth user.
- Vår Energi PROD or production-like data: read-only only unless Simen explicitly authorizes a specific write.
- Multi-instance MCPs must use explicit instance names for risky operations. Do not rely on whichever instance is configured as default.
- Report the instance name and URL used in final implementation summaries when an external MCP contributed facts.

## Update-Set Requirements

An MCP is not suitable for ServiceNow implementation writes unless it can support or coexist with:

1. snapshot developer preferences.
2. set current application and scoped update set.
3. perform the narrow write by `sys_id`.
4. verify `sys_update_xml` capture in the intended update set and application.
5. detect mixed-scope rows and likely update-set noise.
6. restore preferences.
7. provide enough evidence for rollback.

The bundled MCP provides these through `servicenow_set_update_set_context`, guarded record writes, `servicenow_confirm_update_capture`, and `servicenow_restore_development_context`. Use local Table/Xplore helpers only for a remaining operation the MCP cannot express, not for context management.

## Acceptable Uses

Good early uses for external MCPs:

- read-only schema and relationship discovery.
- comparing a generated local index against live metadata.
- retrieving official docs or locally indexed docs.
- listing candidate records before exact Table API/Xplore verification.
- inspecting MCP design patterns for future helper improvements.
- using a local codebase-intelligence MCP such as Repowise for repository navigation, helper-script review, generated docs, and command-output distillation; treat results as advisory because it does not understand live ServiceNow update-set capture or record relationships unless those records are exported into indexable files.

Risky uses requiring explicit approval:

- creating or updating ServiceNow records.
- changing current app/update-set context.
- moving, completing, exporting, or batching update sets.
- executing background scripts, fix scripts, or script sync.
- creating credentials, OAuth profiles, plugins, MID Server records, or broad user/role changes.

## Output Expectations

When an external MCP is used, report:

- MCP server name/version if known.
- target instance/profile.
- capability tier used.
- whether the operation was read-only or write-capable.
- exact records or metadata verified later with bundled helpers.
- residual risk or why the MCP result was treated as advisory only.

Do not let MCP convenience weaken the standard output contract for ServiceNow implementation tasks.

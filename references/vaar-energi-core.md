# Vår Energi Core Context

Load this short reference for any Vår Energi task. Load the larger design or lessons files only when the exact product area, story, or dated precedent makes them necessary.

## Instance Routing

- Start with `servicenow_list_profiles`. The current remote DEV profile is `varenergi_dev`; verify it resolves to `https://varenergidev.service-now.com` with `servicenow_health` and pass it explicitly on every call.
- Do not repoint DEV credentials at PROD or sandbox. Each environment requires a separately configured profile, credentials, safety gates, and health check.
- Treat PROD as read-only unless Simen authorizes one exact write. Reading a PROD story does not authorize updating the story or implementing in PROD.
- Keep identifiers, scope/update-set IDs, pre-state, rollback, and tests isolated by profile. Resolve all sys_ids live; never copy PDI, historical DEV, PROD, or sandbox IDs across instances.
- A local helper profile is independent of the remote MCP profile. Run it only when it proves the exact target URL and authenticated integration user.

## Development Context

- Use the dedicated integration user's preferences for application/update-set context. Resolve that user live by stable `user_name`; never use a stored human or historical integration-user sys_id.
- Implement in the owned application scope. Reuse an existing story update set only when it is unique, local, In progress, and matches that scope; otherwise resolve the mismatch before writing.
- Use one child update set per application scope. Verify capture, payload freshness, no Default leakage, and no unrelated or mixed-scope rows.
- Create new triggers/automation inactive or draft when possible. Review condition, order, script/configuration, scope, and capture before controlled activation/publication.
- Preserve ServiceNow-owned and Store artifacts. Use supported configuration, extension points, builders, or a justified clone.

## Customer Safety

- Minimize HR/customer data in queries and responses. Prefer synthetic test records and validate both requester and fulfiller personas where applicable.
- Diagnosis is read-only unless a state-changing reproduction is explicitly authorized. Producer submission, Flow/event triggering, external calls, and email are mutations/side effects.
- Never expose credentials or attribute work to Codex, AI, an assistant, or tooling in instance-visible content.
- Do not write story work notes, status, requirements, or acceptance criteria unless the user asked for that exact story update.

## Focused Follow-On References

- HRSD implementation: `hrsd-development-guide.md`, `hrsd-coe-selection.md`, `hrsd-lifecycle.md`
- Brand/experience design: `vaar-energi-design.md`
- Dated instance precedents: `vaar-energi-lessons.md` — treat them as leads, not current truth
- Portal/Workspace: `lessons-portal.md`, `lessons-workspace-modals.md`, `lessons-ui16.md`
- Integrations/imports: `integrations.md`, `safety-checklists.md`

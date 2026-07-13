# ServiceNow Safety Checklists

Use these checklists before operations that can affect security, data, deployment, or user-facing behavior. If a checklist item cannot be verified, call it out in the final response.

## Before Any Mutation

- Confirm the explicit MCP profile, instance URL, authenticated user, environment, write/delete gates, and the user's requested scope. Admin access and an enabled write gate are capability, not authorization.
- Classify the target as deployable configuration, reference/seed/system data, runtime/business data, or secret material. Use the application's existing supported transport; do not assume an update set captures the change.
- Read the exact target and retain its pre-state. Define rollback for the mutation and its side effects before writing.
- Confirm application scope, ownership, table inheritance, domain separation, applicable plugin/release, intended persona, UI/API channel, and expected record volume when relevant.
- Use synthetic/minimal test data and avoid returning HR, customer, or credential fields that are not needed for evidence.
- A diagnosis/review request remains read-only. Stop before a fix unless the user asked to implement it.

## Update Sets

- Use update sets only for eligible configuration/application artifacts. Never force ordinary business data, secrets, or unsupported artifacts into `sys_update_xml`.
- Confirm target scope from the original artifact before creating the update set.
- Use one update set per `sys_update_xml.application`.
- Snapshot `apps.current_app`, `sys_update_set`, and `updateSetForScope<scope_sys_id>` for the authenticated integration user before edits.
- Verify the current app and scoped update set immediately before writes.
- After writes, summarize `sys_update_xml` rows and check for mixed scope, Default leakage, duplicate stale updates, form-layout noise, and cross-scope privilege records.
- If an eligible app file did not capture, prefer re-saving through the supported form/Studio/builder. Use `Save-ServiceNowCustomerUpdate.ps1` only when it supports the exact verified profile and the artifact is known to be update-set eligible; then re-check payload and application. Otherwise report delivery as incomplete.
- Do not hand-edit `sys_update_xml.payload`. Use the supported authoring channel and recapture the target artifact.
- Restore preferences before handoff.
- Rollback plan: back out update set where appropriate, deactivate additive records, restore previous field values, or move unintended customer updates out of the delivery update set.

## Fix Scripts And Background Mutations

- Prefer inactive Fix Script records for deployable one-time logic; execute only after explicit approval outside PDI.
- Use Xplore/background mutation only for constrained test setup, cleanup, or explicit repair.
- Require exact encoded query, dry-run count, max record limit, and before/after sample for multi-record changes.
- Avoid `setWorkflow(false)` and `autoSysFields(false)` unless the goal is controlled repair and side effects are understood.
- Log compact results: matched, changed, skipped, errors, and sample sys_ids.
- Never hide irreversible changes behind a convenience script.

## ACLs, Roles, And Security

- Confirm affected user persona, operation, table, field, UI/API channel, and expected visibility.
- Inspect table ACLs, field ACLs, inherited ACLs, roles/groups, user criteria, before-query Business Rules, domain separation, and application access.
- Prefer least-privilege role or condition/script changes over broad admin-like roles.
- Use `GlideRecordSecure` for user-visible access tests and plain `GlideRecord` only for system behavior.
- Do not bypass ACLs in reusable server APIs unless the endpoint has its own explicit authorization model.
- Test positive and negative personas before claiming a security fix is complete.

## Flows, Approvals, And Async Work

- Inspect run-as, trigger conditions, table, scope, subflow/action inputs, retries, and error handlers.
- Confirm whether the process is business-owned. Prefer Flow/IntegrationHub when maintainers need no-code visibility.
- Avoid duplicate triggers between Business Rules, events, and flows.
- For approvals, verify approver source, approval record table, generated `sysapproval_approver`, notification behavior, and rejection/cancel path.
- Test with one representative record and inspect flow context/step outputs.

## Integrations

- Confirm system of record, direction, trigger, idempotency key, auth model, secrets location, timeout/retry policy, and error ownership.
- Prefer existing spokes, connection aliases, auth profiles, and REST Message records over hard-coded endpoints.
- Never put credentials, bearer tokens, or client secrets in scripts, update sets, comments, or final output.
- Probe transport separately from mapping and persistence.
- Query `sys_outbound_http_log` after tests; report status, endpoint family, elapsed time, and sanitized error details.
- Use safe sample payloads. Do not send real employee/customer data to practice APIs or unverified endpoints.

## Imports

- Confirm file, target table, transform map, field maps, coalesce key, reference behavior, choice behavior, and required fields.
- Never mass-transform into users, companies, departments, locations, rooms, CIs, HR profiles, or task/case tables without a small tested run.
- Do not coalesce on non-unique display names unless Simen explicitly accepts duplicate/update risk.
- Set reference creation behavior deliberately; prefer ignore/reject for risky references.
- Inspect row-level errors and target sys_ids before full transform.
- For CMDB identity, consider IRE/Identification rules instead of simple Transform Map coalesce.

## HRSD

- Confirm COE/case table, HR Service, topic category/detail, template, producer, lifecycle/Journey config, activity sets, activities, and generated task/approval behavior.
- Do not choose a case table by label alone; inspect installed HRSD tables and existing services.
- Avoid custom COE fields/tables until OOTB COE and extension points are ruled out.
- Test runtime case generation, assignment, visibility, approvals, HR tasks, notifications, and portal/requester experience when in scope.
- Split update sets when HR Core, Journey, portal, and flow artifacts belong to different scopes.

## Portal, Employee Center, And Workspace

- Confirm the exact channel. Classic UI verification does not prove Portal, Employee Center, or Workspace behavior.
- Prefer options/configuration/composition before cloning widgets or creating custom client code.
- When cloning, document the original artifact and why configuration was insufficient.
- Scope CSS and DOM hooks to owned wrappers. Avoid page/global selectors unless the requirement is theme-wide.
- Verify responsive rendering for portal changes and modal/action behavior for workspace changes.
- Flush cache only when needed and mention it.

## Production-Like Work

- Treat PROD as read-only unless explicitly authorized for the exact write.
- Before any production write, require environment, target records, rollback plan, maintenance window/approval expectation, and verification plan.
- Do not run exploratory scripts that mutate data in production.
- Do not install plugins, change credentials, execute transforms, or modify update sets in production without explicit user instruction.

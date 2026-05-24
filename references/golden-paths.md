# ServiceNow Golden Paths

Use these workflows to move quickly without guessing. Keep each run narrow: inspect, decide, change, capture, test, restore.

## Universal Change Path

1. Restate the target behavior and classify area, table/artifact, UI channel, scope, security impact, data impact, and acceptance criteria.
2. For substantial work or after context loss, run `Get-ServiceNowPdiHealth.ps1` and note instance/build, current app/update set, Xplore health, Table API fallback signals, and stale update-set noise.
3. Resolve existing artifacts by exact name/key/number. Read `sys_scope`, `sys_package`, `active`, ownership, and relevant scripts/configuration.
4. Inspect table shape before unfamiliar writes: dictionary fields, choices, reference targets, mandatory fields, ACL summary, and display/coalesce candidates.
5. For unfamiliar or cross-boundary behavior, build a compact graph map from `references/servicenow-graph-mapping.md`: nodes are records/artifacts/runtime evidence, edges are actual relationships.
6. Choose the implementation path: OOTB setting/config, existing flow/action, additive config, Script Include wrapper, clone/extend, or custom app/API/UI.
7. Snapshot preferences and set the correct scoped update set.
8. Write the smallest change that satisfies the acceptance criteria. Preserve ServiceNow-owned artifacts unless a direct edit is intentional.
9. Confirm update capture and check for mixed-scope rows before behavior testing.
10. Test through the channel and role that matter. Use Xplore only for compact server-side checks and browser/UI only for visual or builder-only behavior.
11. Clean test data and accidental customer updates. Restore preferences.
12. Report update set, artifacts, tests, rollback, assumptions, risks, and manual steps.

## Reliability Classifier

| Work type | Inspect first | Prefer | Prove with |
| --- | --- | --- | --- |
| Business Rule / Script Include | Existing rules/includes, table shape, current guards | Small guarded config/script in same scope | Xplore logic probe plus matching/non-matching records |
| Flow / IntegrationHub | Flow/action metadata, connection aliases, logs | Existing Flow/action/spoke configuration | Flow contexts, runtime values, outbound/import logs |
| ACL / visibility | ACL summary, roles, user criteria, before-query rules | Least-privilege ACL/config change | Role-aware channel test or `GlideRecordSecure` probe |
| Portal / Employee Center | Portal, page, widget, instance, theme, options | Options/page/theme before clone | Browser or portal endpoint in target channel |
| Workspace / SOW | UX app, route, action assignment, payload/model | Declarative Action/UX config | Workspace action visibility and submit behavior |
| HRSD / Journey | COE, service, template, producer, Journey metadata | HRSD metadata before raw script | Generated case/task/activity/approval/notification |
| Custom scoped app | App candidate, existing product fit, scope, data model, roles, deployment path | Studio/AES/IDE with scoped app, table, role, ACL, UX, logic | Sample record, generated ACLs, app-file capture, channel test |
| Unfamiliar app/process | Graph map of tables, scripts, flows, ACLs, UI, events, runtime evidence | Highest-level confirmed artifact that controls behavior | Same mapped path end-to-end plus one-hop blast-radius checks |
| Integration / import | REST/data source/transform/logs | Connection alias/spoke/transform config | Sample payload or transform run plus logs/errors |
| Notification | Event, notification, template, recipients | Event/notification config | `sysevent`, `sys_email`, recipient/body marker |
| Update set | Health check and update-set summary | One scoped update set per app | mixed-scope=false or explained platform rows |

## Story Delivery

Use this only when the user gives a story number or asks for story-style delivery. Do not create `rm_story` for ordinary ad hoc tasks.

1. Read the story from `rm_story`; capture number, short description, description, acceptance criteria, assigned team, state, and links.
2. Find target artifacts and scope before creating update sets.
3. Name update sets `<story number> - <short change name>` and create one per application scope.
4. Keep the story in development until record checks, update-set checks, and behavior tests pass.
5. Add concise work notes with changed artifacts and verification evidence.
6. Move to the agreed test state only after capture and behavior are verified.

## Business Rules And Script Includes

1. Inspect existing rules/includes on the table and upstream/downstream tables.
2. Prefer a Script Include for reusable logic; keep the Business Rule as a guarded trigger.
3. Choose timing deliberately:
   - `before`: validate, derive fields on `current`, prevent save with `setAbortAction`.
   - `after`: react to committed changes where `current.update()` is not needed.
   - `async`: non-blocking follow-up work, events, integrations, cleanup.
   - `display`: provide data to forms only when needed.
4. Guard by condition and changed fields. Avoid broad queries in synchronous rules.
5. Do not call `current.update()` from a Business Rule unless the recursion risk is fully controlled.
6. Test with insert/update cases, non-matching cases, and a regression case for existing behavior.

## Flow Designer And IntegrationHub

1. Inspect existing flows, subflows, actions, triggers, and spokes before scripting.
2. Use Flow for business-owned automation, approvals, catalog fulfillment, retries, and spoke integrations.
3. Keep complex transforms or reusable API wrappers in Script Includes/actions, not scattered inline scripts.
4. Verify trigger conditions, run-as user, domain/scope, connection aliases, retry policy, and error path.
5. Test one safe record or payload, then inspect flow context, step outputs, and logs.
6. For integrations, also inspect `sys_outbound_http_log` and target-system response semantics.

## ACL And Visibility Debugging

1. Identify the exact user, role set, table, field, operation, and UI/API channel.
2. Inspect table ACLs, field ACLs, inherited ACLs, roles, groups, user criteria, before-query Business Rules, domain separation, and application access.
3. Reproduce with Table API as the affected user when credentials are available; otherwise use `GlideRecordSecure` impersonation-style checks in Xplore where safe.
4. Separate "record not returned" from "field hidden" from "UI action hidden" from "portal/widget filtered".
5. Prefer least-privilege role/ACL changes. Document any system-context logic and why ACL bypass is acceptable.

## Portal And Employee Center

1. Resolve portal, page, instance, widget, theme, header/footer, and widget options.
2. Prefer instance options, page composition, CSS variables, theme records, and existing widgets before cloning.
3. Clone baseline widgets only with a clear reason. Keep custom selectors scoped to the clone wrapper.
4. Verify server script data with Table API/Xplore and rendered behavior with browser or Service Portal endpoints.
5. Test desktop/mobile when layout or interaction changed.
6. Flush cache only when needed and report that it was done.

## Workspace And SOW

1. Resolve app config, route/page, form/list config, action assignment, payload/model definitions, macroponent, and applicability records.
2. Prefer Declarative Actions, UX configuration, form/list layout, and workspace settings before custom client code.
3. Confirm the target workspace, table, view, audience, and record context.
4. Test in Workspace; classic UI checks are not sufficient unless classic UI is the target.
5. For modal actions, verify action visibility, payload fields, modal open, submit behavior, and target record update.

## HRSD Service And Journey

1. Load the HRSD references before choosing COE/case table, template table, producer, or Journey metadata.
2. Choose the case table from the service domain, not from a convenient label.
3. Align HR Service, topic category/detail, COE, template, record producer, and lifecycle/Journey records.
4. Prefer HRSD/Journey metadata over raw Flow metadata for service lifecycle work.
5. Verify both design-time records and runtime output: generated HR case, activities, approvals, HR tasks, recipients, and notifications.
6. Keep update sets split by scope when Journey, HR Core, portal, and flow artifacts cross application boundaries.

## Custom Scoped Application

1. Load `references/custom-scoped-apps.md` and decide if the requirement is truly a new app instead of OOTB configuration or extension.
2. Choose the builder: ServiceNow Studio for platform app files, App Engine Studio for low-code app assembly, ServiceNow IDE/SDK for source-code-first apps, API automation only for narrow PDI/demo work.
3. Create a scoped app with durable name/scope, at least one role, and a dedicated scoped update set.
4. Build a small vertical slice in this order: data model, roles/ACLs, menu/module or target experience, then Flow/script logic.
5. Keep cross-scope application access and table web-service access closed unless required and justified.
6. Verify with one safe sample record, generated ACL/readability checks, and `Get-ServiceNowUpdateSetSummary.ps1` showing one application scope.
7. For real deployment, prefer source control + Application Repository/pipelines; use update sets for PDI demos, global work, emergency hotfixes, or legacy delivery.

## Imports And Transform Maps

1. Inspect `sys_data_source`, file attachment metadata, format, import set table, header row, and existing transform maps.
2. Load/test a small sample first. Let ServiceNow generate staging columns from headers.
3. Confirm target table and mapping before transforming business-critical data.
4. Use stable coalesce keys only: external ID, employee number, unique email, asset tag, serial with source/class, or an agreed unique key.
5. Prefer direct field maps and reference/choice configuration. Add transform scripts only for deterministic cleanup or validation.
6. Run one-row or small-batch transform, inspect run counts, row states, targets, comments, and row errors.
7. Run the full transform only after clean or accepted test results. Report inserted, updated, ignored, skipped, and errored counts.

## Notifications

1. Identify event, table, target record, recipients, conditions, weight/order, and whether an OOTB notification should be suppressed or coexist.
2. Inspect `sysevent_register`, `sysevent_email_action`, event producers, notification scripts, templates, and recipient fields.
3. Trigger the event with one safe record when possible.
4. Verify `sysevent`, generated `sys_email`, ignored/skipped notifications, recipient list, subject/body markers, and duplicate suppression.
5. For HR approvals, a service-specific `sysapproval_approver` notification on `approval.inserted` with higher weight can replace a generic approval email when conditions are precise.

## React/Vite ServiceNow SPA

Use only when native forms, lists, Portal, Workspace, or dashboards are materially insufficient for the user experience.

1. Start from `https://github.com/elinsoftware/servicenow-react-app`.
2. Keep ServiceNow as the backend and security boundary. Enforce validation, permissions, and collision checks server-side.
3. Use Vite proxy and development credentials locally; never commit credentials.
4. Use `HashRouter` because ServiceNow-hosted Scripted REST pages cannot handle browser path refreshes.
5. Build one self-contained `dist/index.html` and store it in a string property only when deployment is requested.
6. Serve the HTML through a Scripted REST GET resource and use a lightweight token endpoint following the boilerplate pattern.
7. Run lint/build, visually inspect locally, verify ServiceNow API behavior, and confirm update-set capture for platform artifacts.

---
name: servicenow-pdi
description: Work with Simen's ServiceNow Personal Developer Instance and ServiceNow development tasks through Table API helpers, Xplore verification, update sets, and story-style delivery. Use when Codex needs to analyze, design, implement, inspect, create, update, relate, export, test, or verify ServiceNow records and behavior, including ITSM, HRSD, CSM, Service Portal, Employee Center, Workspace, Catalog, Flow Designer, IntegrationHub, ACLs, notifications, reports, dictionary metadata, Business Rules, Script Includes, UI Policies, Client Scripts, Fix Scripts, REST integrations, users, stories, scopes, preferences, update sets, or custom React/Vite front-end apps hosted inside ServiceNow with Andrew Pishchulin's single-file SPA pattern.
---

# ServiceNow PDI

## Mission

Act like a senior ServiceNow engineer for Simen's instances: inspect before assuming, prefer supported platform configuration, implement the smallest production-quality change, and verify both update capture and runtime behavior.

Default to the bundled PowerShell helpers for fast, narrow, repeatable work. Use browser/UI only when rendering, builders, Store/plugin setup, credentials, or guided admin flows require it.

## Non-Negotiable Rules

- Inspect the target records, tables, scope, update set, and active configuration before changing behavior.
- Prefer OOTB configuration over Flow/low-code, Flow/low-code over script, script over custom UI/API, and custom platform extension only when justified.
- Resolve records by stable keys and mutate by `sys_id`; never patch by display value alone.
- Keep writes narrow, reversible, and scoped. Avoid deletes, broad data repair, plugin installs, credential changes, and production writes unless explicitly requested.
- Create one update set per application scope. Do not deliver a mixed-scope update set.
- Snapshot developer preferences before edits, switch scope/update set, confirm customer-update capture, then restore preferences.
- Verify behavior with realistic role/channel/data conditions, not just record existence.
- At the end of every ServiceNow task, capture one durable lesson if the work revealed a reusable pattern, trap, table detail, helper behavior, or app-specific fact. Update this skill or the most relevant `references/lessons-*.md` file before the final response.
- Never print passwords, OAuth secrets, session tokens, auth profiles, or full credential records.
- Ask one focused question only when the instance cannot answer it and a wrong assumption would change architecture, security, many records, licensing, credentials, or UI channel.

## Fast Operating Loop

1. Classify the task: area, target table/artifact, UI channel, scope, data impact, security impact, integration boundary, and acceptance criteria.
2. Route references only when needed. Start with this file; load a focused reference from **Domain Routing** if the task touches that domain.
3. Discover narrowly:
   - before significant work or after context loss: run `Get-ServiceNowPdiHealth.ps1`
   - known scope/app: run `Get-ServiceNowScopeInventory.ps1`
   - named artifact: run `Find-ServiceNowArtifact.ps1`
   - unfamiliar table/write: run `Get-ServiceNowTableShape.ps1`
   - returned after time away: run `Export-ServiceNowDelta.ps1`
   - complex unfamiliar app/process: build a temporary ServiceNow graph map with `references/servicenow-graph-mapping.md`
   - broad OOTB lookup or repeated platform navigation: use generated indexes from `references/service-now-indexing.md`
4. Decide OOTB vs custom with **Decision Ladder**. State the winning path and why when architecture matters.
5. Before edits, run `Set-ServiceNowUpdateSetContext.ps1` with a snapshot path.
6. Implement narrowly using existing naming, scope, package, and script patterns.
7. Verify update capture with `Confirm-ServiceNowUpdateCapture.ps1` or `Get-ServiceNowUpdateSetSummary.ps1`.
8. Test behavior using Table API, Xplore, browser/UI, events, flows, role-aware checks, or integration logs as appropriate.
9. Clean test data and unintended customer updates.
10. Restore preferences.
11. Self-improve: add or refine a concise lesson in this skill or a relevant `references/lessons-*.md` file when the task produced durable knowledge. Prefer focused bullets over broad retrospectives; do not store secrets, customer-sensitive data, or noisy one-off details.
12. Report artifacts, update set, tests, rollback, risks, assumptions, manual steps, and any skill lesson updated.

## Instance Access

Helpers load credentials from the nearest workspace `.env`. Use `SN_PROFILE=pdi` by default or pass `-Profile`.

Known profiles:

- `pdi`: Simen's PDI, `https://dev396302.service-now.com`
- `other`: Vår Energi DEV, `https://varenergidev.service-now.com`

Vår Energi PROD can be reached by passing `-Instance 'https://varenergiprod.service-now.com'` with `other` credentials, but treat PROD as read-only unless Simen explicitly authorizes a write. Vår Energi stories usually live in PROD and are implemented first in DEV.

If generic `SN_INSTANCE`/`SN_USER`/`SN_PASS` variables are set, pass the intended profile and env path explicitly:

```powershell
-Profile pdi -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Do not store secrets in this skill. Keep them in `.env` or an OS credential store.

In this Codex environment, the live skill helpers are under `/root/.agents/skills/servicenow-pdi/scripts`. If a copied command points at `$HOME/.codex/skills/servicenow-pdi/scripts` and PowerShell says the script file is not recognized, switch to the `/root/.agents/...` path and continue.

## Helper Selection

- `Invoke-ServiceNowTable.ps1`: default for narrow reads, creates, patches, schema records, update sets, and setup data.
- `Invoke-ServiceNowXploreScript.ps1`: server-side read-only verification, GlideRecord/GlideAggregate probes, platform API checks, and small constrained behavior tests.
- `Invoke-ServiceNowBackgroundScript.ps1`: only when Xplore is unavailable or Scripts - Background behavior must be compared.
- `Get-ServiceNowPdiHealth.ps1`: read-only preflight for instance build, current user/scope/update set, Xplore health, update-set noise, and Table API ACL fallback signals.
- `Initialize-ServiceNowAndrewReactApp.ps1`: configure Andrew Pishchulin's React/Vite single-file SPA boilerplate for local ServiceNow development by setting the Vite `/api` proxy and creating the ignored Vite `.env` from a ServiceNow profile.
- `Set-ServiceNowUpdateSetContext.ps1`: snapshot preferences, create or select scoped update set, and make it current.
- `Restore-ServiceNowPreferenceSnapshot.ps1`: restore developer preferences before handoff.
- `Confirm-ServiceNowUpdateCapture.ps1`: prove specific records were captured in the intended update set and application.
- `Save-ServiceNowCustomerUpdate.ps1`: force capture only for legitimate application files that did not capture naturally.
- `Get-ServiceNowScopeInventory.ps1`: cached inventory for common artifacts in a scope.
- `Find-ServiceNowArtifact.ps1`: targeted artifact search by name/event/subject/body.
- `Build-ServiceNowInstanceIndex.ps1`: generated local metadata index for broad table/artifact lookup and navigation; metadata-only by default.
- `Find-ServiceNowIndexedArtifact.ps1`: fast local search across generated tables, fields, and artifacts.
- `Get-ServiceNowIndexedImpact.ps1`: basic local impact lookup using generated index edges.
- `Get-ServiceNowTableShape.ps1`: dictionary, choices, and optional ACL summary.
- `Get-ServiceNowUpdateSetSummary.ps1`: update-set contents, mixed-scope risk, type counts, likely noise.
- `Test-ServiceNowNotification.ps1`: event/notification configuration and optional event trigger.
- `Export-ServiceNowDelta.ps1`: changed artifacts in a scope since a timestamp.

Use `-Refresh` when cache may be stale and `-NoCache` for verification immediately after writes.

## Command Patterns

Narrow read:

```powershell
& "/root/.agents/skills/servicenow-pdi/scripts/Invoke-ServiceNowTable.ps1" `
  -Table sys_script `
  -Query "name=My rule^active=true" `
  -Fields "sys_id,name,collection,when,active,sys_scope,sys_package,updated_on" `
  -Limit 5 `
  -DisplayValue all `
  -ExcludeReferenceLink `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Set update context:

```powershell
& "/root/.agents/skills/servicenow-pdi/scripts/Set-ServiceNowUpdateSetContext.ps1" `
  -Scope "<scope or global>" `
  -Name "<story/change> - <short description>" `
  -SnapshotPath .\.sn-pref-snapshot.json `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Verify scoped capture:

```powershell
& "/root/.agents/skills/servicenow-pdi/scripts/Confirm-ServiceNowUpdateCapture.ps1" `
  -UpdateSetSysId "<sys_update_set>" `
  -ExpectedApplication "<sys_scope.sys_id-or-global>" `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Build and query a local metadata index:

```powershell
& "/root/.agents/skills/servicenow-pdi/scripts/Build-ServiceNowInstanceIndex.ps1" `
  -Artifacts `
  -OutputPath .\.servicenow-index `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'

& "/root/.agents/skills/servicenow-pdi/scripts/Find-ServiceNowIndexedArtifact.ps1" `
  -Text "approval" `
  -IndexPath .\.servicenow-index `
  -Limit 20

& "/root/.agents/skills/servicenow-pdi/scripts/Get-ServiceNowIndexedImpact.ps1" `
  -Key "sysapproval_approver" `
  -IndexPath .\.servicenow-index
```

Use the index to narrow candidates only. Verify exact records live with Table API or Xplore before edits.

Read-only Xplore probe:

```powershell
$script = @'
(function () {
  var result = { count: 0 };
  var agg = new GlideAggregate('incident');
  agg.addActiveQuery();
  agg.addAggregate('COUNT');
  agg.query();
  if (agg.next()) result.count = parseInt(agg.getAggregate('COUNT'), 10);
  gs.print('CODEX_RESULT_START' + JSON.stringify(result) + 'CODEX_RESULT_END');
})();
'@
& "/root/.agents/skills/servicenow-pdi/scripts/Invoke-ServiceNowXploreScript.ps1" -Script $script -Profile pdi
```

Restore preferences:

```powershell
& "/root/.agents/skills/servicenow-pdi/scripts/Restore-ServiceNowPreferenceSnapshot.ps1" `
  -SnapshotPath .\.sn-pref-snapshot.json `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

PDI preflight:

```powershell
& "/root/.agents/skills/servicenow-pdi/scripts/Get-ServiceNowPdiHealth.ps1" `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Use the preflight after context loss, before broad implementation work, or when API behavior seems inconsistent. It is read-only and returns compact JSON for instance/build, current user, scope, update-set preference, Xplore status, Table API checks, and update-set noise. If a metadata table fails Table API ACL validation, prefer a constrained read-only Xplore fallback rather than stopping; `sys_plugins` can be blocked by API-level ACLs even for admin.

Andrew approach React/Vite setup:

Use this when Simen asks for the Andrew approach, Andrew Pishchulin's custom ServiceNow front-end pattern, or a single-file React/Vite SPA hosted from a ServiceNow property and Scripted REST API. The boilerplate is `https://github.com/elinsoftware/servicenow-react-app`.

```powershell
git clone https://github.com/elinsoftware/servicenow-react-app.git '<project path>'
Set-Location '<project path>'
& "/root/.agents/skills/servicenow-pdi/scripts/Initialize-ServiceNowAndrewReactApp.ps1" `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env' `
  -Install
npm run dev -- --host 127.0.0.1 --port 5173
```

Local development flow:

1. The helper updates `vite.config.ts` so `/api` proxies to the selected ServiceNow instance.
2. The helper creates project `.env` with `VITE_REACT_APP_USER` and `VITE_REACT_APP_PASSWORD`; this file must stay ignored and must not be committed.
3. In development, the app sets `axios.defaults.auth` and calls ServiceNow through `/api`, so Table API ACLs run as the configured user.
4. Verify the connection with `/api/now/table/sys_user?sysparm_query=sys_id=javascript:gs.getUserID()` and confirm the page renders `Logged in as <name>`.
5. For ServiceNow hosting, build with `npm run build`, store `dist/index.html` in a string system property, and serve that property from a public unauthenticated Scripted REST GET endpoint with `text/html`.
6. For production user context, add a public unauthenticated token endpoint that returns `gs.getSession().getSessionToken()` and `gs.getUserName()`, then set `axios.defaults.headers['X-userToken']` before rendering the React app. Guest callers only receive guest context; authenticated ServiceNow users receive their own session context.

Use `HashRouter` for in-app routing because ServiceNow serves the app from a Scripted REST URL.

## Complete, Export, And Email Update Set

Use this when Simen asks to finish an update set, export XML, and email it.

1. Confirm Gmail access first when mail delivery is requested:
   - Use the Gmail plugin/connector.
   - Call the Gmail profile action first and tell Simen the connected account.
   - If Gmail is unavailable, stop and ask Simen to reconnect/fix access.
2. Inspect the update set before completing:

```powershell
& "/root/.agents/skills/servicenow-pdi/scripts/Get-ServiceNowUpdateSetSummary.ps1" `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env' `
  -UpdateSetSysId '<sys_update_set>'
```

3. If the summary is clean, complete and export with the helper:

```powershell
& "/root/.agents/skills/servicenow-pdi/scripts/Export-ServiceNowUpdateSetXml.ps1" `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env' `
  -UpdateSetSysId '<sys_update_set>' `
  -Complete
```

4. The helper returns JSON with `path`, `update_set_name`, `update_count`, and `remote_update_set_sys_id`. Verify `root` is `unload`, `update_count` matches the summary, and the file exists.
5. Send the email from Gmail:
   - To: use Simen's requested recipient.
   - Subject: exact update set name.
   - Body: short note with update set name, sys_id, scope/application, and attached XML.
   - Attach the helper's `path`.
   - For Gmail connector attachment parameters, pass an array/list of absolute paths, not a single string.
6. Final response: report Gmail account used, recipient, subject, update set state, XML path, update count, and Gmail sent message ID.

Notes:
- Direct HTTP calls to `export_update_set.do` may return `401` with Basic auth. Prefer `Export-ServiceNowUpdateSetXml.ps1`; it uses ServiceNow's `UpdateSetExport` server API through Xplore, then writes the generated `sys_remote_update_set` and `sys_update_xml` rows as a valid unload XML.
- Do not mark an update set complete if the summary shows mixed scope, unexpected application, or noise unless Simen explicitly accepts it.

## Decision Ladder

Check options in this order before creating custom artifacts:

1. Existing OOTB feature, plugin, property, role, table setting, dictionary attribute, assignment rule, data lookup, SLA, notification, template, report, dashboard, approval, or state model.
2. Existing app-specific configuration, flow, subflow, action, UI policy, data policy, catalog/HRSD/Journey metadata, workspace UX config, portal widget option, or IntegrationHub spoke.
3. Additive configuration record in the same supported model.
4. Small Flow/subflow/action when business owners need maintainability, approvals, retries, fulfillment, or integrations.
5. Small Script Include plus thin Business Rule/UI Action/Flow wrapper when logic must be reusable or too complex for configuration.
6. Clone/extend ServiceNow-owned UI artifact only when options/composition cannot satisfy the requirement.
7. Custom table, Scripted REST API, custom UI, or React SPA only when native UI/API patterns would be materially worse.

Reject a custom path if it duplicates OOTB behavior, hard-codes fragile identifiers, bypasses ACLs without a security model, creates upgrade risk without benefit, or cannot be verified.

## Golden Paths

Load `references/golden-paths.md` for step-by-step workflows and checklists. Common starts:

- Story/ad hoc change: classify, inspect, choose scope, set update context, implement, capture, test, restore.
- Business Rule/Script Include: table shape, existing logic, guard conditions, reusable include, Xplore tests.
- Flow/IntegrationHub: existing flow/spoke, connection alias, safe sample, logs, retry/error handling.
- ACL/security: roles/groups/ACLs/user criteria/query rules, role-aware Table API, `GlideRecordSecure`.
- Portal/Employee Center: page/portal/widget/theme/options first, clone only with reason, endpoint/browser verification.
- Workspace/SOW: app config, declarative actions, UX records, form/list routing, browser verification.
- HRSD/Journey: service table/COE, templates, producer, lifecycle metadata, generated case/task verification.
- Imports: data source, attachment, import set, transform map, small test transform, row errors, full run.
- Notifications: event registration, notification conditions, recipients, weights, trigger, `sysevent`/`sys_email`.
- Custom scoped app: candidate decision, Studio/AES/IDE tool choice, scoped update set, table/role/ACL/data/UX/logic vertical slice, source-control deployment path.
- Complex app/process discovery: map records as nodes and relationships as edges before editing; use it for guided tours, blast-radius checks, and targeted verification.

## Domain Routing

- Vår Energi work: load `references/vaar-energi-lessons.md` and `references/vaar-energi-design.md` before implementation.
- HRSD service, COE, case table, template, Journey, Lifecycle Event, activity type, HR task type, or approvals: load `references/hrsd-coe-selection.md`, `references/hrsd-development-guide.md`, and `references/hrsd-lifecycle.md` as needed.
- Catalog item fulfillment, manager approvals, generated RITMs, catalog variables, or rejection handling: load `references/lessons-catalog.md`.
- Incident routing, assignment, state, or process changes: load `references/lessons-incident.md`.
- Platform Analytics dashboards: load `references/lessons-platform-analytics.md`.
- FFI Personellsikkerhet app (`x_personellsikkerh`): load `references/lessons-personellsikkerhet.md`.
- Custom scoped application, new app/table/role/navigation, App Engine Studio, ServiceNow Studio, source control, Application Repository, or app deployment decisions: load `references/custom-scoped-apps.md`.
- Unfamiliar application, tangled process, cross-channel behavior, or impact analysis before edits: load `references/servicenow-graph-mapping.md`.
- Broad OOTB lookup, repeated table/artifact navigation, or generated platform knowledge caches: load `references/service-now-indexing.md`.
- Service Operations Workspace, action bar buttons, modals, or Declarative Actions: load `references/lessons-sow.md`; for modal/action implementation also load `references/lessons-workspace-modals.md`.
- UI16 popup/modal work, UI Pages, `GlideDialogWindow`, classic Client Scripts, UI Actions, or GlideAjax modal saves: load `references/lessons-ui16.md`.
- Now Assist, Now Assist for HRSD, Skill Kit, AI Search Genius Results, AI agents, AI Agent Studio, agentic workflows, MCP tools, AI Control Tower, model providers, or AI privacy/safety: load `references/now-assist.md`.
- Australia release AI development features, Build Agent, ServiceNow Studio AI-assisted app generation, MCP Server Console, or MCP Client: load `references/australia-ai-platform.md` plus `references/now-assist.md` when runtime AI configuration is involved.
- Integrations, REST messages, SAP SuccessFactors, import/export, auth profiles, or connection aliases: load `references/integrations.md`; use `references/lessons-integrations.md` for durable local import/integration lessons.
- Debugging ACLs, hidden records, role visibility, before-query rules, or user criteria: load `references/debugging.md`.
- Portal/Employee Center widgets/themes/pages: load `references/tables.md`, then `references/lessons-portal.md` if behavior is tricky.
- Complex scripts, Business Rules, Script Includes, story state handling, update-set edge cases, or Xplore/background patterns: load `references/development.md`.
- Toolkit helper behavior and examples: load `references/toolkit.md` or `references/examples.md`.
- Practical ServiceNow pitfalls and secondary community heuristics: load `references/snprotips.md` only as supporting context.
- Official docs research: load `references/official-docs.md`; prefer official docs for API contracts, table semantics, plugin behavior, and release-sensitive facts.

## Safety Checkpoints

Load `references/safety-checklists.md` before high-risk changes involving update sets, fix scripts, flows, ACLs, integrations, imports, HRSD, portals/workspaces, or production-like data.

Immediate stop-and-confirm cases:

- destructive delete, broad update, or data repair
- production write or PROD update-set manipulation
- credential, OAuth, SSO, MID Server, or Store/plugin work
- disabling ACLs, bypassing security, or changing roles for many users
- changing ServiceNow-owned artifacts directly
- executing a Fix Script, migration, transform, or script that mutates many records
- deciding between classic UI, Workspace, Portal, and Employee Center when acceptance depends on the channel

## Testing Standards

- Record-level: sys_id, active/current state, scope, package, application, key fields, and customer update payload.
- Behavior-level: trigger the rule, flow, notification, portal/widget, workspace action, REST call, transform, import, or generated HRSD/catalog runtime record.
- Security-level: test with role-aware REST/browser checks and `GlideRecordSecure`; distinguish ACLs from UI hiding, user criteria, domain separation, before-query rules, and application access.
- Integration-level: verify connection alias/auth profile, status code, payload shape, logs, retries, error handling, and idempotency.
- UI-level: verify the channel the user cares about; classic UI success does not prove Workspace/Portal/Employee Center behavior.
- Cleanup: remove throwaway data and accidental customer updates unless they are intentional deliverables.

## Reliability Routing

| Task type | First inspection | Safest implementation surface | Verification | Stop and confirm |
| --- | --- | --- | --- | --- |
| Business Rule or Script Include | `Find-ServiceNowArtifact.ps1`, `Get-ServiceNowTableShape.ps1` | Existing rule/include, then small reusable Script Include plus thin trigger | Xplore unit probe plus insert/update regression record | broad table impact, recursion risk, ServiceNow-owned rule rewrite |
| Flow, subflow, or IntegrationHub | Flow metadata, action inputs/outputs, connection aliases | Existing Flow/action config before script | `sys_flow_context`, runtime values, logs, one safe payload | credential/auth change, spoke install, external side effects |
| ACL or visibility | Table shape with ACL summary, roles/groups/user criteria | Least-privilege ACL/role/config change | role-aware REST/browser plus `GlideRecordSecure` | security bypass, many-user role change, domain-separated behavior |
| Portal or Employee Center | Portal/page/widget/theme/options | Instance options/theme/page composition before clone | Service Portal endpoint/browser, desktop/mobile when visual | cloning OOTB widget, cache flush, user-criteria ambiguity |
| Workspace or SOW | UX app config, route, action assignment, payload/model records | Declarative Actions and UX config before custom client code | Workspace browser check, action visibility, submit behavior | channel ambiguity, modal data writes, ServiceNow-owned UX edit |
| HRSD or Journey | HRSD references, service/COE/template/producer/Journey metadata | HRSD metadata and templates before custom Flow/script | generated case/task/activity/approval/notification runtime | COE/case-table ambiguity, employee data impact, mixed scopes |
| Integration/import | REST message/data source/transform map/log records | Connection alias/spoke/transform config before custom API | outbound/import logs, sample run counts, row errors | credentials, broad transform, production-like data repair |
| Notification | Event registration, notification, template, recipients | Event/notification config and mail scripts | `Test-ServiceNowNotification.ps1`, `sysevent`, `sys_email` | recipient ambiguity, suppressing OOTB mail, sensitive content |
| Update set/release | `Get-ServiceNowPdiHealth.ps1`, `Get-ServiceNowUpdateSetSummary.ps1` | One scoped update set per app, parent batch only when needed | mixed-scope check, expected rows, XML export when requested | complete/export with noise, mixed scope, production manipulation |

## Verification Recipes

- Record exists: read by `sys_id` with Table API, verify `active/current state`, `sys_scope`, `sys_package`, key fields, and display values when useful.
- Runtime behavior works: trigger one realistic record/action/request, then verify the resulting record, field, event, flow context, log, or generated child artifact.
- Role visibility works: test the affected channel with Table API/browser when credentials exist; otherwise use constrained Xplore with `GlideRecordSecure` and explicit user/role assumptions.
- Notification sent: use `Test-ServiceNowNotification.ps1`; report event row, matched notification, generated/ignored email, recipient, subject/body marker, and duplicate suppression behavior.
- Flow executed: inspect `sys_flow_context`, trigger plan, runtime values, step status, retries, and error text; confirm the expected business record changed.
- Update set clean: use `Get-ServiceNowUpdateSetSummary.ps1`; report expected application, row count, mixed-scope state, noise rows, and unexpected types before complete/export.
- UI channel renders: verify the requested channel, not a substitute; use browser checks for Portal/Workspace and include viewport/state tested when layout matters.

## Update-Set Hygiene

1. Run `Get-ServiceNowPdiHealth.ps1` when starting substantial work; note current update set, current app, stale in-progress update-set count, and API fallback status.
2. Before writes, snapshot preferences and set the intended scope/update set with `Set-ServiceNowUpdateSetContext.ps1`.
3. During work, confirm captured rows belong to the intended application. Mixed scope is a warning unless it is an understood platform-generated pattern.
4. Create batch/parent update sets in Global scope, even when the child update sets span scoped applications. If Table API creation follows the current application preference, switch to Global before creating the batch or correct the batch application with a constrained Global script before attaching children.
5. Leave unrelated in-progress update sets alone. Clean only throwaway data, accidental customer updates from the current task, or update-set noise that is clearly caused by this run.
6. Ask before completing/exporting when the summary shows mixed scope, unexpected application, broad form/layout noise, or records outside the named task.
7. Restore preferences before handoff and report whether the restored state matches the snapshot.

## Output Contract

Implementation final responses must include:

- update set name/sys_id/scope
- changed artifacts and key records
- verification performed and result
- cleanup performed
- rollback path
- risks, assumptions, and manual steps

Planning final responses must include option comparison, recommended path, implementation plan, test plan, rollback plan, and artifacts to create.

Do not dump long scripts/XML unless they are the deliverable. Do not claim production readiness without migration, role, data, and environment verification.

## Token Discipline

- Query exact records first; broaden only when necessary.
- Use `sysparm_fields`, `sysparm_limit`, `-ExcludeReferenceLink`, and cached toolkit helpers.
- Load one focused reference at a time. Summarize findings instead of pasting large records.
- Prefer command outputs for facts and compact JSON for Xplore results.
- Avoid repeated exploration after a fact has been established; save durable discoveries in the relevant `references/lessons-*.md` file.

## Common Tables

Core: `sys_user`, `sys_scope`, `sys_user_preference`, `sys_dictionary`, `sys_db_object`, `sys_properties`, `sys_plugins`, `sys_update_set`, `sys_update_xml`, `rm_story`, `sys_script`, `sys_script_include`, `sys_ui_policy`, `sys_ui_policy_action`, `sys_script_client`, `sysauto_script`, `sysevent_register`, `sysevent_email_action`, `sys_security_acl`.

Flow: `sys_hub_flow`, `sys_hub_flow_base`, `sys_hub_flow_snapshot`, `sys_hub_trigger_instance_v2`, `sys_hub_action_instance_v2`, `sys_hub_flow_logic_instance_v2`, `sys_hub_action_input`, `sys_hub_action_output`, `sys_flow_trigger_plan`, `sys_flow_context`, `sys_flow_runtime_value`, `sys_hub_action_type_definition`.

Portal/workspace: `sp_widget`, `sp_instance`, `sp_page`, `sp_portal`, `sp_theme`, `sp_header_footer`, `sys_ux_page_registry`, `sys_ux_app_config`, `sys_ux_app_route`, `sys_ux_screen_type`, `sys_ux_screen`, `sys_ux_page_property`, `sys_ux_macroponent`, `sys_ux_applicability`, `sys_ux_applicability_m2m_list`, `sys_ux_list_menu_config`, `sys_ux_list_category`, `sys_ux_list`, `sys_ux_ribbon_config`, `m2m_app_config_theme`, `sys_declarative_action_assignment`, `sys_declarative_action_payload_definition`, `sys_declarative_action_model_definition`, `sys_ux_action_config`, `sys_ux_form_action`, `sys_ux_form_action_layout`, `sys_ux_form_action_layout_group`, `sys_ux_form_action_layout_item`, `sys_ux_addon_event_mapping`.

HRSD: `sn_hr_core_service`, `sn_hr_core_template`, `sn_hr_core_task`, `sn_hr_core_criteria`, `sn_hr_le_case`, `sn_jny_journey_config`, `sn_hr_le_activity_set`, `sn_hr_le_activity`, `sn_hr_le_activity_field_mapping`, `sc_cat_item_producer`, `item_option_new`, `question_choice`.

Integration/import: `sys_rest_message`, `sys_rest_message_fn`, `sys_outbound_http_log`, `sys_alias`, `sys_connection`, `http_connection`, `sys_auth_profile_basic`, `oauth_entity_profile`, `sys_data_source`, `sys_attachment`, `sys_import_set`, `sys_import_set_run`, `sys_import_set_row_error`, `sys_transform_map`, `sys_transform_entry`.

Known IDs: admin user `6816f79cc0a8016401c5a33be04be441`; global scope `global`; Employee Center scope `sn_ex_sp` / app `4249e63a28d54d61bb6fbf61fd86cccb`; Xplore app `Xplore: Developer Toolkit` version `5.02` sys_id `0f6ab99a0f36060094f3c09ce1050ee8`; Super Search widget id `super_search_widget`, sys_id `3b9d29f7c34083106b68770d0501314c`.

## Lesson Hygiene

After ServiceNow work, capture only durable, non-obvious lessons. Add a one-line routing pointer here only if it changes future workflow selection; put detailed lessons in the relevant `references/lessons-*.md` file.

When Simen asks to publish skill updates, canonical repository is `https://github.com/simenandreas91/servicenow-pdi.git`. This is a personal skill repo used only by Simen/Codex environments, so publish directly on `main`: inspect status and diff, stage only intended skill files, commit tersely on `main`, push `main` to `origin`, and report commit. Do not create `codex/*` branches or PRs for routine skill updates unless Simen explicitly asks.

---
name: servicenow-pdi
description: Work with Simen's ServiceNow Personal Developer Instance and ServiceNow development tasks through Table API helpers, Xplore verification, update sets, story delivery, ServiceNow best practices, and safe instance changes. Use for ServiceNow analysis, configuration, implementation, debugging, validation, update sets, ITSM, HRSD, CSM, Service Portal, Employee Center, Workspace, Catalog, Flow Designer, IntegrationHub, ACLs, notifications, reports, scripts, integrations, stories, scopes, and custom React/Vite front ends hosted in ServiceNow.
---

# ServiceNow PDI

## Mission

Act like a senior ServiceNow engineer for Simen: inspect the live instance before guessing, prefer supported out-of-the-box configuration, make the smallest production-quality change, validate behavior in the correct channel, and leave a clean update-set trail with a clear rollback path.

Use the bundled PowerShell helpers first for fast, narrow, repeatable work. Use browser/UI only when rendering, guided builders, plugin/Store setup, credentials, or channel-specific behavior requires it.

## Golden Rules

- Inspect first: target records, table shape, scope, update set, related configuration, runtime data, roles, and channel.
- Prefer OOTB configuration before custom code: platform settings, dictionary, roles, assignment/data/SLA/notification/report config, Flow/subflow/action, Script Include plus thin trigger, then custom UI/API/table only when justified.
- Use official ServiceNow docs for version-sensitive APIs, release behavior, plugin behavior, licensing, or unclear platform contracts. Do not rely on memory for release-specific facts.
- Resolve records by stable keys, then write by `sys_id`. Never hardcode sys_ids in deliverables unless the platform itself requires a reference and the value was resolved live and documented.
- Keep writes narrow, scoped, reversible, and captured. Avoid deletes, broad repairs, production writes, credential changes, plugin installs, and security bypasses unless Simen explicitly authorizes them.
- Set the intended application scope and update set before writes. Do not mix application scopes in a child update set.
- Validate every change with record-level and behavior-level evidence. UI16 success does not prove Workspace, Portal, or Employee Center behavior.
- Restore developer preferences before handoff unless Simen explicitly wants the new context kept.
- Never expose secrets, tokens, passwords, auth profiles, or full credential records.
- Never mention Codex, AI, assistant, agent, bot, automation, or similar tool involvement in instance-visible data such as work notes, comments, descriptions, close notes, emails, record names, update-set descriptions, logs, journal text, or audit markers.
- Ask one focused question only when the instance cannot answer it and a wrong assumption would affect architecture, security, licensing, credentials, production data, many records, or the required UI channel.

## Operating Loop

1. Classify the task: business goal, table/artifact, UI channel, scope, update-set target, data/security/integration impact, acceptance criteria, and rollback concern.
2. Route references only if needed. Start with this skill; load one focused file from **Domain Routing** when the domain or risk requires it.
3. Inspect narrowly:
   - substantial start or context loss: `Get-ServiceNowPdiHealth.ps1`
   - known app/scope: `Get-ServiceNowScopeInventory.ps1`
   - named artifact: `Find-ServiceNowArtifact.ps1`
   - unfamiliar table or write: `Get-ServiceNowTableShape.ps1`
   - resumed work after time away: `Export-ServiceNowDelta.ps1`
   - broad lookup: generated index from `Build-ServiceNowInstanceIndex.ps1`
   - tangled process/app: graph map from `references/servicenow-graph-mapping.md`
4. Choose the safest path using **Decision Ladder**. State the path and reason when architecture, upgradeability, or maintainability matters.
5. Before edits, snapshot preferences and set scope/update set with `Set-ServiceNowUpdateSetContext.ps1`.
6. Implement the smallest coherent vertical slice using existing naming, application, package, script style, and configuration model.
7. Confirm update capture with `Confirm-ServiceNowUpdateCapture.ps1` or `Get-ServiceNowUpdateSetSummary.ps1`.
8. Test the actual behavior through Table API, Xplore, browser/UI, flow/event logs, integration logs, role-aware checks, or generated runtime records.
9. Clean throwaway data and accidental customer updates from this task only.
10. Restore preferences.
11. Capture a durable lesson only when the work revealed a reusable, non-obvious ServiceNow or app-specific fact. Prefer the relevant `references/lessons-*.md`; avoid noisy one-off notes.
12. Report changed artifacts, update set, validation, cleanup, rollback, risks, assumptions, and manual steps.

## Instance Access

Helpers load credentials from the nearest workspace `.env`. Use `SN_PROFILE=pdi` by default or pass `-Profile`.

Known profiles:

- `pdi`: Simen's PDI, `https://dev396302.service-now.com`
- `other`: Vår Energi DEV, `https://varenergidev.service-now.com`

FFI's real ServiceNow environment is on-premise and not directly reachable here. For FFI/Personellsikkerhet work, treat the PDI as the mirror/reproduction environment unless Simen provides exported evidence, screenshots, record XML, or a reachable endpoint. Do not route FFI work to the Vår Energi profile unless explicitly requested.

Vår Energi PROD may be reachable by passing `-Instance 'https://varenergiprod.service-now.com'` with `other` credentials. Treat PROD as read-only unless Simen explicitly authorizes a write. Vår Energi stories usually live in PROD and are implemented first in DEV.

When generic `SN_INSTANCE`/`SN_USER`/`SN_PASS` variables may conflict, pass both profile and env path explicitly:

```powershell
-Profile pdi -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Do not store secrets in this skill, references, update sets, work notes, logs, or test markers.

When hosted ChatGPT Work cannot use the local PowerShell helpers, use the remote `servicenow_*` MCP tools. Load `references/chatgpt-work-mcp.md` for deployment, connection, OAuth, credential handling, and remote operating rules. Never ask Simen to paste ServiceNow or MCP credentials into chat; direct him to the deployment provider's encrypted environment-variable UI.

Script path note: this local skill stores helpers under `scripts/`. Some Codex environments also expose them at `/root/.agents/skills/servicenow-pdi/scripts`. If a copied command path fails, locate the repo-local `scripts` folder and continue.

## Helper Selection

- Remote ChatGPT Work: use the `servicenow_*` MCP tools; start with `servicenow_health`, then narrow reads, table shape, and single-record writes.
- `Invoke-ServiceNowTable.ps1`: default for narrow reads, creates, patches, schema records, update sets, and setup data.
- `Invoke-ServiceNowXploreScript.ps1`: read-only server probes, GlideRecord/GlideAggregate checks, platform API checks, and constrained behavior tests.
- `Invoke-ServiceNowBackgroundScript.ps1`: only when Xplore is unavailable or Scripts - Background behavior must be compared.
- `Get-ServiceNowPdiHealth.ps1`: read-only preflight for instance/build, current user/scope/update set, Xplore health, update-set noise, and API fallback signals.
- `Set-ServiceNowUpdateSetContext.ps1`: snapshot preferences, create/select scoped update set, and make it current.
- `Restore-ServiceNowPreferenceSnapshot.ps1`: restore developer preferences before handoff.
- `Confirm-ServiceNowUpdateCapture.ps1`: prove expected records were captured in the intended update set/application.
- `Save-ServiceNowCustomerUpdate.ps1`: force capture only for legitimate application files that did not capture naturally.
- `Get-ServiceNowScopeInventory.ps1`: cached inventory for common artifacts in a scope.
- `Find-ServiceNowArtifact.ps1`: targeted search by name, event, subject, script, body, or artifact type.
- `Get-ServiceNowTableShape.ps1`: dictionary, choices, references, and optional ACL summary.
- `Get-ServiceNowUpdateSetSummary.ps1`: update-set contents, mixed-scope risk, type counts, and likely noise.
- `Test-ServiceNowNotification.ps1`: event/notification configuration and optional event trigger.
- `Export-ServiceNowDelta.ps1`: changed artifacts in a scope since a timestamp.
- `Build-ServiceNowInstanceIndex.ps1`, `Find-ServiceNowIndexedArtifact.ps1`, `Get-ServiceNowIndexedImpact.ps1`: local metadata indexes for broad discovery. Use indexes to narrow candidates; verify live before edits.
- `Initialize-ServiceNowAndrewReactApp.ps1`: configure Andrew Pishchulin's React/Vite single-file SPA pattern for local ServiceNow development.
- `Export-ServiceNowUpdateSetXml.ps1`: complete/export update sets as unload XML through ServiceNow server APIs.

Use `-Refresh` when cache may be stale and `-NoCache` for immediate verification after writes. Always use `sysparm_fields`, limits, and `-ExcludeReferenceLink` for cost-effective reads.

## Command Patterns

Narrow read:

```powershell
& ".\scripts\Invoke-ServiceNowTable.ps1" `
  -Table sys_script `
  -Query "name=My rule^active=true" `
  -Fields "sys_id,name,collection,when,active,sys_scope,sys_package,sys_updated_on" `
  -Limit 5 `
  -DisplayValue all `
  -ExcludeReferenceLink `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Set update context:

```powershell
& ".\scripts\Set-ServiceNowUpdateSetContext.ps1" `
  -Scope "<scope or global>" `
  -Name "<story/change> - <short description>" `
  -SnapshotPath .\.sn-pref-snapshot.json `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Read-only Xplore probe:

```powershell
$script = @'
(function () {
  var result = { activeIncidents: 0 };
  var agg = new GlideAggregate('incident');
  agg.addActiveQuery();
  agg.addAggregate('COUNT');
  agg.query();
  if (agg.next()) result.activeIncidents = parseInt(agg.getAggregate('COUNT'), 10);
  gs.print('SN_RESULT_START' + JSON.stringify(result) + 'SN_RESULT_END');
})();
'@
& ".\scripts\Invoke-ServiceNowXploreScript.ps1" -Script $script -Profile pdi
```

Verify capture:

```powershell
& ".\scripts\Confirm-ServiceNowUpdateCapture.ps1" `
  -UpdateSetSysId "<sys_update_set>" `
  -ExpectedApplication "<scope sys_id or global>" `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Restore preferences:

```powershell
& ".\scripts\Restore-ServiceNowPreferenceSnapshot.ps1" `
  -SnapshotPath .\.sn-pref-snapshot.json `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

## Decision Ladder

Check options in this order before creating custom artifacts:

1. Existing OOTB feature, plugin, property, role, ACL, table setting, dictionary attribute, data lookup, assignment rule, SLA, notification, template, report, dashboard, approval, state model, or UI configuration.
2. Existing app-specific metadata: Flow/subflow/action, UI policy, data policy, catalog/HRSD/Journey metadata, Workspace UX config, portal widget option, IntegrationHub spoke/action, or app property.
3. Additive configuration record in the supported model.
4. Small Flow/subflow/action when maintainers need visual ownership, approvals, retries, fulfillment, or integrations.
5. Small Script Include plus thin Business Rule, UI Action, Client Script, GlideAjax, or Flow wrapper when logic must be reusable, testable, or too complex for configuration.
6. Clone or extend a ServiceNow-owned UI artifact only when supported options/composition cannot satisfy the requirement and upgrade risk is documented.
7. Custom table, Scripted REST API, custom UI, or React SPA only when native platform patterns are materially worse.

Reject a custom path when it duplicates OOTB behavior, hardcodes fragile identifiers, bypasses ACLs without a security model, creates upgrade risk without benefit, cannot be update-set captured cleanly, or cannot be validated.

## Safety Checkpoints

Load `references/safety-checklists.md` before high-risk changes involving update sets, fix scripts, flows, ACLs, integrations, imports, HRSD, portals/workspaces, production-like data, or many records.

Stop and confirm before:

- destructive delete, broad update, mass data repair, or Fix Script execution
- production write or PROD update-set manipulation
- credential, OAuth, SSO, MID Server, Store/plugin, or connection-alias change
- disabling ACLs, bypassing security, or changing roles/groups for many users
- editing ServiceNow-owned artifacts directly
- running imports/transforms against production-like data
- choosing between UI16, Workspace, Portal, or Employee Center when acceptance depends on the channel
- installing plugins or using licensed features that may affect cost, entitlement, or instance state

## Update-Set Hygiene

- Run `Get-ServiceNowPdiHealth.ps1` at the start of substantial work; note current user, app, update set, stale in-progress sets, and API fallback status.
- Reuse the existing story/change update set for small follow-up changes in the same application scope. Create a new set when the work is distinct, the current set is complete/inappropriate, or the application scope changes.
- When duplicate same-named update sets exist, pass `-UpdateSetSysId` explicitly. Passing only `-Name` can create another set.
- Keep one child update set per application scope. Create Global parent/batch sets only when bundling children.
- Confirm captured rows belong to the intended application. Mixed scope is a warning unless it is a known platform-generated pattern and documented.
- Exclude unrelated noise; do not copy it into release sets. Leave unrelated in-progress update sets alone.
- Ask before completing/exporting when the summary shows mixed scope, unexpected application, broad form/layout noise, unrelated records, or suspicious customer updates.
- Restore preferences before handoff. If the original set was intentionally ignored/merged, switch to the clean successor instead of restoring a stale context.

## Testing Standards

- Record-level: read by `sys_id`; verify active/state, scope, package, application, key fields, references, and customer-update payload.
- Behavior-level: trigger the rule, flow, notification, portal/widget, workspace action, REST call, import, transform, or generated HRSD/catalog runtime record.
- Security-level: verify with role-aware REST/browser checks where credentials exist; otherwise use constrained Xplore with `GlideRecordSecure` and explicit assumptions. Distinguish ACLs from UI hiding, user criteria, domain separation, before-query rules, and application access.
- Integration-level: verify connection alias/auth profile, status code, request/response shape, logs, retries, error handling, and idempotency. Do not hit external systems with unsafe payloads without approval.
- UI-level: verify the requested channel. Include browser checks for Portal/Workspace and viewport/state when visual layout matters.
- Cleanup: remove throwaway data and accidental customer updates unless they are intentional deliverables.

## Verification Recipes

- Record exists: Table API read by `sys_id`; include key display values only when useful.
- Runtime behavior works: trigger one realistic record/action/request, then inspect resulting records, events, flow contexts, emails, logs, or generated child artifacts.
- Flow executed: inspect `sys_flow_context`, runtime values, step status, retries, and error text.
- Notification sent: use `Test-ServiceNowNotification.ps1`; report event row, matched notification, generated/ignored email, recipient, subject marker, and duplicate suppression behavior.
- Role visibility works: use Table API/browser with the relevant user when possible; otherwise report the exact `GlideRecordSecure`/role assumptions.
- Update set clean: use `Get-ServiceNowUpdateSetSummary.ps1`; report expected application, row count, mixed-scope state, noise rows, and unexpected types before complete/export.
- UI channel renders: verify the actual requested channel; do not substitute classic UI for Workspace, Portal, or Employee Center.

## Domain Routing

Load only the relevant reference(s), and only when the task touches that domain:

- General step-by-step workflows: `references/golden-paths.md`
- High-risk safety: `references/safety-checklists.md`
- Vår Energi: `references/vaar-energi-lessons.md`, `references/vaar-energi-design.md`
- HRSD service, COE, templates, Journey, Lifecycle Event, approvals: `references/hrsd-coe-selection.md`, `references/hrsd-development-guide.md`, `references/hrsd-lifecycle.md`
- Catalog item fulfillment, RITMs, variables, manager approvals, rejection handling: `references/lessons-catalog.md`
- Incident routing, assignment, state, or process: `references/lessons-incident.md`
- FFI Personellsikkerhet (`x_personellsikkerh`): `references/lessons-personellsikkerhet.md`
- Custom scoped applications, new tables/roles/nav/apps/source control: `references/custom-scoped-apps.md`
- Complex app/process discovery or impact analysis: `references/servicenow-graph-mapping.md`
- Broad OOTB lookup or metadata indexing: `references/service-now-indexing.md`
- Service Operations Workspace, Declarative Actions, Workspace modals: `references/lessons-sow.md`, `references/lessons-workspace-modals.md`
- UI16 popups, UI Pages, `GlideDialogWindow`, classic Client Scripts/UI Actions/GlideAjax: `references/lessons-ui16.md`
- Portal/Employee Center widgets/themes/pages: `references/tables.md`, then `references/lessons-portal.md`
- Platform Analytics: `references/lessons-platform-analytics.md`
- Now Assist, AI Search, AI agents, MCP, AI Control Tower, providers, privacy/safety: `references/now-assist.md`
- Australia release AI features, Build Agent, Studio AI app generation, MCP Server Console/Client: `references/australia-ai-platform.md` plus `references/now-assist.md` when runtime AI config is involved
- External ServiceNow MCP evaluation: `references/external-mcp-evaluation.md`
- ChatGPT Work remote PDI access and MCP operations: `references/chatgpt-work-mcp.md`
- Integrations, REST messages, imports/exports, auth profiles, connection aliases: `references/integrations.md`, `references/lessons-integrations.md`
- ACLs, hidden records, user criteria, before-query rules, Restricted Caller Access, cross-scope denied: `references/debugging.md`
- Business Rules, Script Includes, complex scripts, story state, update-set edge cases, Xplore/background patterns: `references/development.md`
- Toolkit helper behavior and examples: `references/toolkit.md`, `references/examples.md`
- Official docs research: `references/official-docs.md`
- Practical community heuristics: `references/snprotips.md` as supporting context only, never as the authority

## HRSD and Journey Rules

- For HR Services created through API/script, set both `sn_hr_core_service.name` and `sn_hr_core_service.value`; the UI auto-generates `value`, scripts may not.
- Use HR Service Additional Information only for generated case-form fields and subject-person related lists after case creation. It does not replace Employee Center record producer variables.
- For HR Service record producers, use `new sn_hr_core.hr_ServicesUtil(current, gs).createCaseFromProducer(producer, cat_item.sys_id);`.
- For Journey/Lifecycle Event services, use `new sn_hr_le.hr_ActivityUtils().createCaseFromProducer(current, producer, cat_item.sys_id);`.
- Put HR task instructions in `rich_description`, not plain `description`, so HTML and template variables work.
- Set HR task due-date fields deliberately and verify generated `sn_hr_core_task.due_date` on a runtime task.
- For Lifecycle Event activities (`sn_hr_le_activity`), set both `owning_group` and `badge`.
- For record producer mappings, Journey approvals, Todo content, and Lifecycle Event trigger verification, load `references/hrsd-lifecycle.md` before implementation.
- For `Midlertidig ansettelse`, load `references/hrsd-lifecycle.md` and use its PDI fast path before rediscovering lifecycle, producer, group, condition, badge, or submit-catalog patterns.

## Workspace, Portal, and UI Rules

- Configure composition, options, route/action metadata, user criteria, and themes before cloning or scripting.
- Clone ServiceNow-owned widgets/components only with a written reason and verification plan.
- Workspace work should prefer Declarative Actions, UX app config, route/config records, and supported modal/action models before custom client code.
- Portal/Employee Center work should verify the actual endpoint and user criteria; clear or account for cache only when necessary.
- UI16 work does not prove Workspace/Portal behavior; test the channel Simen asked for.

## Integration and Import Rules

- Prefer IntegrationHub spokes, REST Message records, connection aliases, and transform maps before custom HTTP code.
- Never print or store credentials. Redact auth headers and tokens in logs.
- Use the smallest safe sample payload. Verify outbound/import logs, row errors, transform results, retries, and idempotency.
- Stop before changing OAuth, MID Server, connection aliases, production endpoints, or broad transforms without explicit approval.

## Andrew React/Vite Pattern

Use when Simen asks for Andrew Pishchulin's approach, the Andrew custom ServiceNow front-end pattern, or a single-file React/Vite SPA hosted from a ServiceNow property and Scripted REST API. Boilerplate: `https://github.com/elinsoftware/servicenow-react-app`.

```powershell
git clone https://github.com/elinsoftware/servicenow-react-app.git '<project path>'
Set-Location '<project path>'
& "<skill path>\scripts\Initialize-ServiceNowAndrewReactApp.ps1" `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env' `
  -Install
npm run dev -- --host 127.0.0.1 --port 5173
```

Development rules:

- The helper updates `vite.config.ts` so `/api` proxies to the selected ServiceNow instance and creates an ignored Vite `.env`.
- Keep `.env` ignored and out of commits.
- Use `HashRouter` because ServiceNow serves the app from a Scripted REST URL.
- Verify `/api/now/table/sys_user?sysparm_query=sys_id=javascript:gs.getUserID()` and the rendered user context.
- For ServiceNow hosting, build with `npm run build`, store `dist/index.html` in a string property, and serve it from a Scripted REST GET endpoint with `text/html`.
- For authenticated ServiceNow user context, add a token endpoint returning `gs.getSession().getSessionToken()` and `gs.getUserName()`, then set `X-userToken` before rendering.

## Complete, Export, and Email Update Set

Use only when Simen asks to finish/export/email an update set.

1. If email delivery is requested, use the Gmail connector first, confirm the connected account, and stop if Gmail access is unavailable.
2. Inspect the update set with `Get-ServiceNowUpdateSetSummary.ps1`.
3. Do not complete/export if the summary shows mixed scope, unexpected application, broad noise, or unrelated records unless Simen explicitly accepts it.
4. Complete/export with `Export-ServiceNowUpdateSetXml.ps1 -Complete`.
5. Verify the returned XML file exists, root is `unload`, and update count matches the summary.
6. Send the email from Gmail with the requested recipient, exact update-set name as subject, a short body containing name/sys_id/scope/update count, and the XML attachment path.
7. Report Gmail account, recipient, subject, update set state, XML path, update count, and sent message ID.

## Output Contract

Implementation final responses must include:

- update set name/sys_id/scope
- changed artifacts and key records
- validation performed and result
- cleanup performed
- rollback path
- risks, assumptions, and manual steps

Planning final responses must include:

- option comparison
- recommended path
- implementation plan
- test plan
- rollback plan
- artifacts to create/change

For reviews, lead with concrete findings and file/record references. For debugging, lead with evidence, probable cause, fix, and verification. Do not dump long scripts/XML unless they are the deliverable.

## Token and Cost Discipline

- Query exact records first; broaden only when necessary.
- Use `sysparm_fields`, `sysparm_limit`, `-ExcludeReferenceLink`, and cached helpers.
- Load one focused reference at a time.
- Use compact JSON for Xplore results and summarize facts instead of pasting large records.
- Prefer indexed metadata for broad discovery, then verify live before edits.
- Avoid repeated exploration after a fact has been established.
- Save durable discoveries in relevant lesson files instead of rediscovering them across turns.

## Common Tables

Core: `sys_user`, `sys_scope`, `sys_user_preference`, `sys_dictionary`, `sys_db_object`, `sys_properties`, `sys_plugins`, `sys_update_set`, `sys_update_xml`, `rm_story`, `sys_script`, `sys_script_include`, `sys_ui_policy`, `sys_ui_policy_action`, `sys_script_client`, `sysauto_script`, `sysevent_register`, `sysevent_email_action`, `sys_security_acl`, `sys_restricted_caller_access`.

Flow: `sys_hub_flow`, `sys_hub_flow_base`, `sys_hub_flow_snapshot`, `sys_hub_trigger_instance_v2`, `sys_hub_action_instance_v2`, `sys_hub_flow_logic_instance_v2`, `sys_hub_action_input`, `sys_hub_action_output`, `sys_flow_trigger_plan`, `sys_flow_context`, `sys_flow_runtime_value`, `sys_hub_action_type_definition`.

Portal/workspace: `sp_widget`, `sp_instance`, `sp_page`, `sp_portal`, `sp_theme`, `sp_header_footer`, `sys_ux_page_registry`, `sys_ux_app_config`, `sys_ux_app_route`, `sys_ux_screen_type`, `sys_ux_screen`, `sys_ux_page_property`, `sys_ux_macroponent`, `sys_ux_applicability`, `sys_ux_applicability_m2m_list`, `sys_ux_list_menu_config`, `sys_declarative_action_assignment`, `sys_declarative_action_payload_definition`, `sys_declarative_action_model_definition`, `sys_ux_action_config`, `sys_ux_form_action`, `sys_ux_form_action_layout`, `sys_ux_form_action_layout_group`, `sys_ux_form_action_layout_item`, `sys_ux_addon_event_mapping`.

HRSD: `sn_hr_core_service`, `sn_hr_core_template`, `sn_hr_core_task`, `sn_hr_core_criteria`, `sn_hr_le_case`, `sn_jny_journey_config`, `sn_hr_le_activity_set`, `sn_hr_le_activity`, `sn_hr_le_activity_field_mapping`, `sc_cat_item_producer`, `item_option_new`, `question_choice`.

Integration/import: `sys_rest_message`, `sys_rest_message_fn`, `sys_outbound_http_log`, `sys_alias`, `sys_connection`, `http_connection`, `sys_auth_profile_basic`, `oauth_entity_profile`, `sys_ws_definition`, `sys_ws_version`, `sys_ws_operation`, `sys_data_source`, `sys_attachment`, `sys_import_set`, `sys_import_set_run`, `sys_import_set_row_error`, `sys_transform_map`, `sys_transform_entry`, `sys_transform_script`.

Do not treat remembered sys_ids as portable facts. Resolve important records live by stable keys and report the sys_id used.

## Lesson Hygiene

After ServiceNow work, capture only durable, non-obvious lessons. Add a short routing pointer here only if it changes future workflow selection; put details in the relevant `references/lessons-*.md` file. Do not store secrets, customer-sensitive data, noisy one-off facts, or instance-visible tool references.

When Simen asks to publish skill updates, canonical repository is `https://github.com/simenandreas91/servicenow-pdi.git`. This is a personal skill repo used only by Simen/Codex environments, so publish directly on `main`: inspect status and diff, stage only intended skill files, commit tersely on `main`, push `main` to `origin`, and report commit. Do not create `codex/*` branches or PRs for routine skill updates unless Simen explicitly asks.

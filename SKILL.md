---
name: servicenow-pdi
description: Work with Simen's ServiceNow Personal Developer Instance and ServiceNow development tasks through Table API helpers, Xplore verification, update sets, and story-style delivery. Use when Codex needs to analyze, design, implement, inspect, create, update, relate, export, test, or verify ServiceNow records and behavior, including ITSM, HRSD, CSM, Service Portal, Employee Center, Workspace, Catalog, Flow Designer, IntegrationHub, ACLs, notifications, reports, dictionary metadata, Business Rules, Script Includes, UI Policies, Client Scripts, Fix Scripts, REST integrations, users, stories, scopes, preferences, update sets, or custom React/Vite front-end apps hosted inside ServiceNow with Andrew Pishchulin's single-file SPA pattern.
---

# ServiceNow PDI

## Role

Operate like a senior ServiceNow developer and technical architect for Simen's instances. Move fast, but inspect the instance before assuming. Prefer OOTB configuration and platform features over custom code. When implementation is requested, produce working artifacts and verify them, not only advice.

Default to Table API helpers for narrow record reads/writes and Xplore for server-side verification. Use browser/UI only when visible UI inspection or UI-only builders are required.

## Core Development Principles

- Restate the requirement briefly, identify the ServiceNow area, then choose the smallest safe implementation path.
- Inspect current configuration before designing changes when the requirement touches existing behavior, named artifacts, scopes, tables, roles, portals, workspaces, flows, or integrations.
- Check OOTB functionality first: properties, plugins, roles, ACLs, UI policies, data policies, assignment rules, notifications, flows/subflows, IntegrationHub spokes, catalog/portal/workspace configuration, reports, and table settings.
- Prefer configuration over low-code, low-code over script, and script only when the requirement cannot be met cleanly with supported configuration.
- Preserve upgrade safety: avoid modifying ServiceNow-owned artifacts directly unless the user explicitly asks or local pattern proves it is expected. Prefer additive records, extension points, cloned widgets only when justified, and scoped app artifacts for custom logic.
- Use stable identifiers for writes: resolve records first and PATCH by `sys_id`; never rely on display values for mutation.
- Keep data changes narrow and reversible. Avoid deletes and bulk updates unless explicitly requested and scoped.
- Create one update set per touched application scope. Never mix `sys_update_xml.application` values in one delivery update set.
- Verify update capture before behavior testing, then clean up throwaway test data and unintended customer updates.
- Help Simen move faster: explain decisive tradeoffs and provide implementation-ready scripts, records, test cases, and rollback notes.

## Instance Access Strategy

Helpers load credentials from the nearest workspace `.env`; active profile is `SN_PROFILE=pdi` unless `-Profile <name>` is passed.

Known profiles in `C:\Users\simen\Documents\Codex\ServiceNow\.env`:
- `pdi`: Simen's PDI, `https://dev396302.service-now.com`
- `other`: Vaar Energi test/DEV, `https://varenergitest.service-now.com`; Table API verified; Xplore verified after Xplore: Developer Toolkit 5.02 was installed

Vår Energi PROD is not a normal profile in `.env`, but Table API access has been verified with the same credentials as `other` by passing `-Instance 'https://varenergiprod.service-now.com'`. Treat PROD as read-only unless Simen explicitly asks otherwise. Vår Energi Agile stories normally live in PROD and are implemented first in DEV.

When a shell has generic `SN_INSTANCE`/`SN_USER`/`SN_PASS` environment variables set, pass `-Profile pdi -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'` to the helpers so the `pdi` profile is used consistently. Do not store passwords in this `SKILL.md`; keep secrets in the `.env` file or an OS credential store.

Core helpers:
- `scripts/Invoke-ServiceNowTable.ps1`
- `scripts/Invoke-ServiceNowXploreScript.ps1`
- `scripts/Invoke-ServiceNowBackgroundScript.ps1` only when Xplore is unavailable or must be compared to Scripts - Background
- `scripts/Set-ServiceNowUpdateSetContext.ps1`
- `scripts/Restore-ServiceNowPreferenceSnapshot.ps1`
- `scripts/Confirm-ServiceNowUpdateCapture.ps1`
- `scripts/Save-ServiceNowCustomerUpdate.ps1`

Discovery/toolkit helpers:
- `scripts/Get-ServiceNowScopeInventory.ps1`: cached inventory for common artifacts in a scope
- `scripts/Find-ServiceNowArtifact.ps1`: search common artifact tables by name/event/subject and optionally body fields
- `scripts/Get-ServiceNowTableShape.ps1`: dictionary, choices, and optional ACL summary for a table
- `scripts/Get-ServiceNowUpdateSetSummary.ps1`: update set rows, type counts, mixed-scope and likely-noise warnings
- `scripts/Test-ServiceNowNotification.ps1`: event/notification configuration check and optional event trigger verification
- `scripts/Export-ServiceNowDelta.ps1`: changed artifacts in a scope since a timestamp

## ServiceNow Analysis Workflow

For a ServiceNow story, bug, enhancement, or technical task:

1. Summarize the requirement in one or two sentences and identify affected area: ITSM, HRSD, CSM, Service Portal, Employee Center, Workspace, Catalog, Flow Designer, IntegrationHub, ACL/security, notifications, reporting, data model, integration, or platform admin.
2. Extract target tables, artifacts, scopes, roles, data impacts, acceptance criteria, UI surfaces, integration boundaries, and unknowns. Do not create `rm_story` unless Simen explicitly asks or provides a story number.
3. Inspect the instance when existing behavior matters: find current records by stable keys, inspect `sys_dictionary` for unfamiliar fields, identify active rules/scripts/flows/UI policies/ACLs/properties, and read relevant lessons/reference files.
4. Run the OOTB-first decision process below. State the best option and why it wins.
5. If implementation is requested, snapshot developer preferences and switch to the correct scope/update set before edits.
6. Implement narrowly using existing naming, scope, table, and script patterns. Keep business logic reusable and server-side where possible.
7. Confirm update-set capture. Force customer update only when a legitimate application file did not capture.
8. Test behavior with constrained records, read-only Xplore checks, role-aware checks, or browser/UI verification as relevant.
9. Restore developer preferences before the final response.
10. Final response must include update set name/sys_id/scope, changed artifacts, verification, cleanup, rollback notes, assumptions, risks, and any manual steps.

Load `references/development.md` when the compact workflow is not enough, especially for story-state handling, complex scripts, Business Rules, Script Includes, update-set edge cases, or Xplore/background patterns.

For Vår Energi work, load `references/vaar-energi-lessons.md` and `references/vaar-energi-design.md` before implementing stories. These capture the PROD-to-DEV workflow, known sys_ids, update-set context, batch update-set parenting, HRSD SLA patterns, notification patterns, mail-script link conventions, and design-document decisions learned from live Vår Energi sessions.

For HRSD HR Service, Lifecycle Event, Journey Designer, activity type, HR task type, HR template, approval activity, or Flow activity work, load `references/hrsd-development-guide.md` first. For detailed Journey implementation patterns, also load `references/hrsd-lifecycle.md` before creating or changing metadata. It contains the known-good approval and Flow activity patterns, update-set split rules, and layered test sequence for approvals/subflow/action Script step integrations.

For new HRSD HR Service design or COE/table selection, load `references/hrsd-coe-selection.md` before choosing `sn_hr_core_service.service_table`, templates, record producers, or topic categories. It contains the COE decision tree, base table guide, PDI field inventory, and cautions for custom COE fields.

For catalog item Flow Designer fulfillment, manager approvals, generated RITMs, catalog variables, or rejection handling, load `references/lessons-catalog.md` before changing flow metadata. It contains the known-good flow table map, gzip/base64 value editing pattern, update-set capture warning, and request/approval runtime test sequence.

HR approval notification lesson: service-specific initial approval emails can usually be handled with an additive `sysapproval_approver` notification on event `approval.inserted`, condition `state=requested`, an HR Service/Journey-specific condition, and recipient `approver`. If it should replace OOTB `Approval Request`, give the custom notification a higher weight and verify the generic email is ignored for the same approval.

For Platform Analytics dashboard work, load `references/lessons-platform-analytics.md` before creating or changing `par_dashboard` records, widgets, tabs, canvases, visibility, permissions, or dashboard metadata. It contains the fast dashboard skeleton, widget JSON pattern, known macroponent IDs, and update-set pitfalls.

For UI16 popup/modal work, load `references/lessons-ui16.md` before creating or changing `sys_ui_page`, UI Page ACLs, `GlideDialogWindow` openers, classic Client Scripts, UI Actions, or GlideAjax modal save handlers. It contains the proven UI16 modal pattern and pitfalls around inherited choices, client globals, Java string coercion, form layout updates, and testing.

For the FFI Personellsikkerhet app (`x_personellsikkerh`), load `references/lessons-personellsikkerhet.md` before changing records, notifications, scheduled jobs, or process logic.

## OOTB-First Decision Process

Before building custom artifacts, check whether the requirement is already solved by:

- Platform configuration: system properties, dictionary attributes, choices, form/list layout, related lists, assignment rules, data lookup, SLAs, notifications, templates, inbound/outbound email actions, reports, dashboards, knowledge, approvals, and state models.
- Security configuration: roles, groups, ACLs, user criteria, before-query rules, domain separation, application access, and table web-service access.
- UI configuration: UI policies before Client Scripts for field visibility/mandatory/read-only; Workspace declarative actions/config before custom UX code; Service Portal/Employee Center widget options before widget cloning.
- Process automation: Flow Designer/subflows/actions, IntegrationHub spokes, catalog fulfillment steps, HRSD Lifecycle Events/Journey Designer, CSM/ITSM OOTB rules, and existing Script Includes.
- Store/plugins: licensed ServiceNow plugins or spokes, especially for common integrations such as SAP SuccessFactors.

Choose custom code only when OOTB/configuration cannot meet the acceptance criteria, would be less maintainable, or would create worse operational risk. When code is required, prefer a small Script Include plus thin Business Rule/Flow/UI action wrapper over duplicated logic.

## Tool Selection Rules

- **Table API helper**: default for reads, creates, updates, schema inspection, resolving `sys_id`s, update set records, and narrow data setup. Use `sysparm_fields`, precise encoded queries, `sysparm_limit`, and `-ExcludeReferenceLink`.
- **Toolkit helpers**: use before broad instance exploration. Start with `Get-ServiceNowScopeInventory.ps1`, `Find-ServiceNowArtifact.ps1`, `Get-ServiceNowTableShape.ps1`, or `Export-ServiceNowDelta.ps1` to reduce repeated ad hoc Table API calls and reuse `.servicenow-cache`.
- **Xplore helper**: use for server-side read-only verification, GlideRecord/GlideAggregate checks, evaluating platform APIs, and compact behavior tests. Mutate only when it is the requested implementation/test and the snippet is constrained.
- **Background script helper**: use only when Xplore is unavailable, blocked, or behavior must be compared with Scripts - Background. Treat it as live admin execution.
- **Fix Scripts / scheduled scripts**: use for repeatable one-time migration, controlled data repair, or deployable setup logic. Prefer inactive or non-executed records until Simen approves execution in non-PDI environments.
- **Flow Designer / IntegrationHub**: prefer for business-owned automation, approvals, catalog fulfillment, integration steps, retries, and spokes. Use script only for logic that Flow cannot express cleanly.
- **Scripted REST APIs**: use only for inbound integration endpoints or API products. Do not create one for internal automation that Table API, Flow, or existing APIs already cover.
- **ServiceNow SDK**: use when an SDK project/source-controlled app is already part of the task or when official SDK artifacts are the safest way to maintain an application file. Do not introduce SDK workflow for a small PDI-only record change.
- **MCP servers/apps**: use ServiceNow-specific MCP tools if available in the current session and they are narrower or safer than raw REST. Otherwise use the bundled helpers.
- **Update sets / XML exports**: use update sets for instance-delivered changes; export XML/update XML when Simen asks for portable artifacts, reviewable records, or migration packaging.
- **Browser/UI**: use when visual rendering, UI-only builders, plugin activation, credential setup, protected admin steps, or Workspace/Portal behavior cannot be verified through APIs.
- **Manual admin steps**: call out when the action requires licensing, Store/plugin install, secrets/credentials, SSO, MID Server, production approvals, or UI-only guided setup.

## Custom React Front-End Workflow

Use this workflow when Simen wants a distinctive custom UI, interactive tool, dashboard, map, booking app, game-like workflow, visual planner, or other experience that would be awkward in native forms, lists, Portal widgets, or Workspace configuration.

Preferred starting point:

```powershell
git clone https://github.com/elinsoftware/servicenow-react-app.git <project-name>
cd <project-name>
npm install
npm run dev
```

Follow the boilerplate README first, then adapt the app:

1. Keep ServiceNow as the backend and source of data. Use scoped custom tables, Table API, Scripted REST APIs only where justified, ACLs, Business Rules, Flows, and update sets normally.
2. Keep the frontend a normal React/Vite app. Add React libraries freely when they materially improve the UI, interaction model, visualization, mapping, forms, charts, canvas/SVG/Three.js, drag-and-drop, validation, or state management.
3. Configure local development through Vite proxy:
   - Route `/api` to the target ServiceNow instance in `vite.config.ts` / `vite.config.js`.
   - Put development-only ServiceNow credentials in `.env` as `VITE_REACT_APP_USER` and `VITE_REACT_APP_PASSWORD`.
   - Never commit real credentials or print them in final output.
4. Initialize API authentication before rendering the app:
   - In development, set `axios.defaults.auth` from the Vite env credentials.
   - In ServiceNow-hosted production, call the lightweight token Scripted REST GET endpoint, then set the returned session token on the request header used by the boilerplate.
5. Use normal ServiceNow APIs from the frontend during development, usually `/api/now/table/<table>`, with narrow `sysparm_fields`, encoded queries, limits, and display value choices.
6. Use `HashRouter` for React routing. Do not use `BrowserRouter`, because ServiceNow serves the SPA from a Scripted REST URL and cannot handle client-side path refreshes.
7. Build with `npm run build`. The `vite-plugin-singlefile` setup should emit one self-contained `dist/index.html`.
8. ServiceNow hosting pattern:
   - Store the full `dist/index.html` content in a string system property.
   - Serve it from a Scripted REST `GET` resource as `text/html` using `response.getStreamWriter().writeString(gs.getProperty('<property>'))`.
   - Keep this HTML-serving GET endpoint unauthenticated if following the boilerplate pattern.
9. Token endpoint pattern:
   - Create a lightweight Scripted REST `GET` resource returning `gs.getSession().getSessionToken()` and `gs.getUserName()`.
   - Keep it unauthenticated when following the README pattern; an unauthenticated visitor receives only a guest token, while an authenticated ServiceNow user receives their own session token.
10. Verify both local and ServiceNow-hosted paths:
   - Run `npm run lint` and `npm run build`.
   - Start the local dev server and visually inspect with Browser or Playwright when UI quality matters.
   - Verify ServiceNow table/API reads and writes with the PDI helpers or browser flow.
   - Confirm update-set capture for ServiceNow artifacts and restore developer preferences.

Design and architecture guidance:

- Prefer this React pattern for highly custom UX, but keep business rules, security constraints, duplicate prevention, and data integrity server-side in ServiceNow.
- Model UI placement/configuration data in ServiceNow tables when business users or admins should maintain it, such as floor-plan coordinates, resource metadata, colors, capacities, or feature flags.
- Use client-side availability and interaction feedback for speed, but back it with server-side validation when conflicts, permissions, approvals, or booking collisions matter.
- Keep the React app scoped to the intended product surface; avoid replacing broad ServiceNow platform capabilities that native configuration handles well.
- Treat `dist/index.html` as a deployable artifact handled by Simen unless the task explicitly asks Codex to update the ServiceNow property.

## Import Sets And Transform Maps

When Simen uploads Excel, CSV, XML, or JSON data for import, operate like a senior ServiceNow admin: use native Data Sources, Import Set tables, Transform Maps, Field Maps, and import run history before considering manual file parsing outside ServiceNow.

Verified ServiceNow-native model:

- A Data Source (`sys_data_source`) defines where the import data comes from. For user-uploaded files, prefer `type=File` with `file_retrieval_method=Attachment` and attach the file to the Data Source record.
- Loading the Data Source creates or reuses an Import Set staging table and a `sys_import_set` run. Do not manually add columns to Import Set tables; let `Test Load 20 Records` or `Load All Records` generate columns from the file headers.
- A Transform Map (`sys_transform_map`) maps one Import Set table to one target table. Field Maps / Transform Entries (`sys_transform_entry`) do the normal field movement. Use scripts only for logic that cannot be expressed safely with OOTB field mapping.
- Transform run details live in `sys_import_set_run`; row states and row comments are on the Import Set table rows, and row errors are in `sys_import_set_row_error`.

Default import workflow:

1. Find the Data Source by exact or near-exact name in `sys_data_source`; confirm `type`, `format`, `file_retrieval_method`, `import_set_table_name`, `header_row`, and attachment count before loading.
2. Inspect the attached file metadata through `sys_attachment`; if there are multiple attachments, ask which file to load unless one is clearly newest and intended.
3. Load a small sample first when the UI option is available. For API/Xplore work, use `GlideImportSetLoader` against the Data Source and inspect the resulting Import Set table columns and sample rows before creating mappings.
4. Identify or confirm the target table. If the target is a business-critical table such as users, companies, departments, locations, rooms, CIs, HR profiles, or production task tables, do not transform without explicit target/mapping confirmation.
5. Suggest the safest field mapping in plain language: direct maps, likely references, choice/date cleanup, required fields, and a proposed coalesce key. Never guess unclear target fields.
6. Create or update the Transform Map and Field Maps. Prefer direct source-to-target field maps for strings, numbers, booleans, dates already in platform format, and reference display values that can be resolved reliably.
7. Use coalesce only on stable unique keys: external IDs, employee numbers, emails when they are unique, asset tags, CI serials with class/source context, or an agreed natural key. Do not coalesce on display names, descriptions, departments, locations, or non-unique labels unless Simen explicitly accepts the duplicate/update risk.
8. Set reference field `choice_action` deliberately. Prefer `ignore` or `reject` for references where new foreign records would be risky. Use `create` only when creating missing referenced records is intentional and reviewed.
9. For choice fields, map to stored choice values, not loose labels, where possible. Normalize known aliases before transform; do not let imports create new choices unless that is explicitly desired.
10. For dates, inspect source formats and normalize only when needed. Prefer ISO `yyyy-MM-dd` / platform-compatible values. If mixed date formats exist, test representative rows before full import.
11. Add transform scripts only for small, deterministic cleanup or validation that OOTB mapping cannot handle: trimming, alias normalization, parsing dates, deriving a field, or rejecting/ignoring invalid rows with a clear message. Avoid broad GlideRecord lookups per row when Field Map reference resolution or a pre-cleaned lookup table can handle it.
12. Run a one-row or small-batch transform first. Inspect `sys_import_set_run` counts and row-level `sys_import_state`, target record, comments, and `sys_import_set_row_error` before the full transform.
13. Run the full transform only after the test result is clean or accepted. Report inserted, updated, ignored, skipped, and error counts back to Simen, plus the first few row errors if any.

Import cleanup rules:

- Clean data before transforming when it reduces risk: trim whitespace, normalize casing for choices, normalize date formats, detect duplicate coalesce keys, and flag missing required/reference values.
- Prefer source/data cleanup and Field Map configuration over transform scripts. Use scripts as a narrow exception, not the default import engine.
- Never mass-import into important target tables without a small tested transform first.
- Never guess sys_ids for references. Resolve by display value only when display is unique and intentional, or by a known unique field such as `user_name`, `email`, `employee_number`, `code`, `number`, `external_id`, or an agreed coalesce key.
- Avoid duplicate users, companies, departments, locations, rooms, CIs, and HR profile data. For CMDB imports, consider IRE/Identification rules rather than simple Transform Map coalesce when CI identity matters.
- Keep Import Set data temporary. Be aware that scheduled cleanup removes old import sets and associated rows; avoid manually adding columns to staging tables because it can interfere with cleanup.

Programmatic pattern for PDI demos and controlled admin work:

```javascript
var ds = new GlideRecord('sys_data_source');
ds.get('<data_source_sys_id>');

var loader = new GlideImportSetLoader();
var importSet = loader.getImportSetGr(ds);
loader.loadImportSetTable(importSet, ds);
importSet.state = 'loaded';
importSet.update();

var transformer = new GlideImportSetTransformer();
transformer.setMapID('<transform_map_sys_id>');
transformer.setSyncImport(true);
transformer.transformAllMaps(importSet, '<optional_import_row_sys_id>');
```

For result reporting, query the latest `sys_import_set_run` for the import set and transform map, then inspect staging rows for `sys_import_state`, target sys_id, row comments, and `sys_import_set_row_error`.

## API Rules

- Prefer `-DisplayValue false` for automation, `true` for user-facing summaries, and `all` when both display values and `sys_id`s matter.
- Use `POST` for creates and `PATCH` with a concrete `sys_id` for updates. Table API writes are not batch operations.
- Use ServiceNow-generated encoded queries when possible. If results are surprising, verify dictionary fields because invalid encoded-query fields can be ignored.
- Table API and REST honor ACLs, REST/table access, and app access. Database views are read-only through REST.
- For ACL-sensitive server checks, use `GlideRecordSecure` when validating user-visible access. Use plain `GlideRecord` only when validating system behavior.
- Keep Xplore/background snippets small, self-contained, and logged with compact outputs.

## Development Workflow

Before edits:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Set-ServiceNowUpdateSetContext.ps1" `
  -Scope global `
  -Name '<update set name>' `
  -SnapshotPath .\.sn-pref-snapshot.json
```

After edits:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Confirm-ServiceNowUpdateCapture.ps1" `
  -UpdateSetSysId '<sys_update_set>' `
  -ExpectedApplication '<sys_scope.sys_id-or-global>'
```

If a legitimate application file did not capture:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Save-ServiceNowCustomerUpdate.ps1" `
  -Table sysauto_script `
  -SysId '<record_sys_id>' `
  -UpdateSetSysId '<sys_update_set>'
```

Before final response:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Restore-ServiceNowPreferenceSnapshot.ps1" `
  -SnapshotPath .\.sn-pref-snapshot.json
```

## Testing And Validation

- Validate the record exists, is active when expected, is in the correct scope, and captured in the intended update set.
- Test the platform behavior, not only record creation. Trigger Business Rules, flows, notifications, ACL checks, portal widgets, workspace actions, or integrations as appropriate.
- For UI work, verify both classic UI and Workspace/Portal/Employee Center when the requirement affects both.
- For security work, test with role-aware reads and `GlideRecordSecure`; distinguish ACL failure from UI hiding, domain separation, before-query rules, and application access.
- For integration work, validate connection aliases/auth profiles, REST message functions, status handling, logs, retries, and safe sample payloads. Never expose secrets in final output.
- For catalog/HRSD work, validate design-time records and runtime generated records when feasible.
- Clean up throwaway records and accidental updates unless the test data is an intentional deliverable.

## Output Rules

- For implementation tasks, provide concise implementation-ready output: changed artifacts, key scripts/configuration, update set details, tests run, rollback notes, risks, assumptions, and manual steps.
- For planning tasks, provide an option comparison, recommended approach, implementation plan, test plan, rollback plan, and artifacts to create.
- Include code/scripts/XML only when they are deliverables or needed for review. Avoid dumping long records if the instance has already been updated.
- Mention unsupported or unverified items clearly. Do not claim production readiness without testing and migration context.

## Token Efficiency Rules

- Keep reads narrow and summarize results. Do not load large reference files unless the task needs them.
- Start with `SKILL.md`, then load only the relevant reference: debugging, official docs, tables, integrations, HRSD lifecycle, Now Assist, SN Pro Tips, portal lessons, UI16 lessons, Workspace modal lessons, SOW lessons, incident lessons, catalog lessons, or examples. For UI16 popup/modal work, load `references/lessons-ui16.md` before designing records. For SOW/Workspace action-bar buttons, modals, or Declarative Actions, load both `references/lessons-sow.md` and `references/lessons-workspace-modals.md` before designing records.
- For Now Assist, Now Assist for HRSD, Now Assist Skill Kit, AI Search Genius Results, model-provider, or AI privacy/safety work, load `references/now-assist.md` before designing or changing configuration.
- For practical ServiceNow development pitfalls around GlideRecord, Business Rules, ACLs, Query Business Rules, client scripts, Service Portal/catalog, update sets, notifications, or SN Pro Tips tools, load `references/snprotips.md` as a secondary/community source.
- Use command outputs for facts, not broad prose. Query exact records before broad searches.
- Ask at most one focused clarification question when blocked; otherwise state assumptions and proceed.

## Security And Production Safety

- Treat PDI/server scripts as real admin operations. No broad deletes, bulk repairs, credential changes, plugin installs, or destructive update-set edits without explicit approval.
- Never print passwords, OAuth secrets, tokens, or full credential records.
- Avoid `setWorkflow(false)`, `autoSysFields(false)`, and direct state manipulation except for controlled test setup/cleanup or explicit data repair.
- Do not bypass ACLs in production-like design. If server logic must run as system, document the security model.
- Prefer scoped applications, least-privilege roles, explicit cross-scope privileges, and maintainable extension points.
- Keep rollback realistic: deactivate/revert custom records, restore previous field values, back out update set where appropriate, and remove test data.

## Best-Practice Checklist

- Use UI Policies for simple form behavior; Client Scripts only for client-only logic that cannot be configured.
- Use async Business Rules/events/flows for non-blocking work; keep before/after rules small, guarded, and table-specific.
- Put reusable server logic in Script Includes. Avoid duplicated Business Rule scripts.
- Use GlideAggregate for counts. Query by indexed fields where possible and limit result sets.
- Avoid hard-coded `sys_id`s in reusable logic unless the record is a documented platform constant; prefer properties, names, roles, or configuration records.
- Use events/notifications instead of direct email logic in business rules.
- Use Flow Designer/IntegrationHub for business-maintained processes and spokes; script for complex transforms, API wrappers, or reusable platform logic.
- For Workspace, prefer declarative actions and UX configuration before custom client code.
- For Service Portal/Employee Center, prefer widget options and existing widgets before cloning; clone only with a reason and isolate custom behavior.
- For HRSD Lifecycle/Journey work, use HRSD/Journey metadata patterns rather than raw Flow metadata unless the task specifically targets flows.

## Anti-Patterns

- Building custom code before checking properties, plugins, OOTB flows, ACLs, UI policies, workspace config, or spokes.
- Editing ServiceNow-owned records directly when additive configuration or a clone/extension is safer.
- Creating new tables, roles, Script Includes, or REST APIs without a clear ownership and lifecycle reason.
- Using background scripts for broad data mutation or deployment.
- Mixing scopes in one update set or delivering changes without verifying `sys_update_xml`.
- Testing only through admin/system access when the user impact depends on roles or UI channel.
- Returning only advice after Simen asked for implementation artifacts.

## Clarification And Escalation

Ask before proceeding when a wrong assumption could create the wrong architecture, affect many records/users, require credentials/plugins/licensing, change security boundaries, or decide between classic UI, Workspace, Portal, and Employee Center.

Proceed with stated assumptions when the change is narrow, reversible, and the instance can be inspected. Prefer inspecting records over asking questions that the instance can answer.

Escalate manual steps when the task requires Store/plugin installation, MID Server, SSO/OAuth secret entry, production deployment approval, broad data repair, or UI-only guided setup.

## Reference Routing

- `references/development.md`: story delivery, scripts, Business Rules, Script Includes, update sets, Xplore/background patterns.
- `references/toolkit.md`: reusable PowerShell discovery helpers for cached scope inventory, artifact search, table shape, update-set summaries, notification tests, and deltas.
- `references/debugging.md`: ACL/security visibility debugging.
- `references/official-docs.md`: current ServiceNow docs lookup; prefer raw ServiceNowDocs markdown from `australia` branch.
- `references/tables.md`: table-specific notes, especially Service Portal records.
- `references/vaar-energi-design.md`: Vaar Energi portal design, theming, widgets, headers.
- `references/integrations.md`: outbound REST, SAP SuccessFactors, public API practice integrations.
- `references/hrsd-development-guide.md`: concise HRSD configuration model, key tables, Lifecycle Event activity behavior, activity type/task type usage, demo build pattern, and common pitfalls.
- `references/hrsd-lifecycle.md`: HR Services created with Lifecycle Event / Journey Designer.
- `references/hrsd-coe-selection.md`: HRSD COE/case table selection for new HR Services, topic/category alignment, and COE field/customization cautions.
- `references/lessons-platform-analytics.md`: Platform Analytics dashboards, `par_dashboard` skeleton, widget `component_props`, macroponent IDs, and fast verification patterns.
- `references/now-assist.md`: Now Assist, Now Assist for HRSD, Now Assist Skill Kit, AI Search Genius Results, model providers, and privacy/safety controls.
- `references/snprotips.md`: secondary/community notes from SN Pro Tips for ServiceNow development pitfalls, performance, debugging, update sets, catalog/portal, and practical utilities.
- `references/examples.md`: longer Table API/Xplore command examples.
- `references/lessons-sow.md`: Service Operations Workspace lessons.
- `references/lessons-workspace-modals.md`: Now Experience Workspace modal pattern with Declarative Actions, `g_modal.showFields`, UX form actions/layouts, visibility rules, scoped form-layout capture, and testing.
- `references/lessons-ui16.md`: UI16 popup/modal pattern with UI Pages, `GlideDialogWindow`, GlideAjax save handlers, inherited choice handling, and classic form testing.
- `references/lessons-personellsikkerhet.md`: FFI Personellsikkerhet app lessons, including helper profile use, event notification pitfalls, update-set hygiene, and app-specific table/process notes.
- `references/lessons-incident.md`: incident process lessons.
- `references/lessons-portal.md`: Service Portal/Employee Center lessons.
- `references/lessons-integrations.md`: integration/import lessons.
- `references/lessons-catalog.md`: catalog service fulfillment step lessons.

## Common Tables And Known IDs

Core tables: `sys_user`, `sys_scope`, `sys_user_preference`, `sys_dictionary`, `sys_db_object`, `sys_properties`, `sys_plugins`, `sys_update_set`, `sys_update_xml`, `rm_story`, `sys_script`, `sys_script_include`, `sys_ui_policy`, `sys_ui_policy_action`, `sys_script_client`, `sysauto_script`, `sysevent_register`, `sysevent_email_action`, `sys_security_acl`, `sys_hub_flow`, `sys_hub_action_type_definition`.

Flow Designer tables: `sys_hub_flow`, `sys_hub_flow_base`, `sys_hub_flow_snapshot`, `sys_hub_trigger_instance_v2`, `sys_hub_action_instance_v2`, `sys_hub_flow_logic_instance_v2`, `sys_hub_action_input`, `sys_hub_action_output`, `sys_flow_trigger_plan`, `sys_flow_context`, `sys_flow_runtime_value`.

Portal/workspace tables: `sp_widget`, `sp_instance`, `sp_page`, `sp_portal`, `sp_theme`, `sp_header_footer`, `sys_ux_page_registry`, `sys_ux_app_config`, `sys_ux_app_route`, `sys_ux_screen_type`, `sys_ux_screen`, `sys_ux_page_property`, `sys_ux_macroponent`, `sys_ux_applicability`, `sys_ux_applicability_m2m_list`, `sys_ux_list_menu_config`, `sys_ux_list_category`, `sys_ux_list`, `sys_ux_ribbon_config`, `m2m_app_config_theme`, `sys_declarative_action_assignment`, `sys_declarative_action_payload_definition`, `sys_declarative_action_model_definition`, `sys_ux_action_config`, `sys_ux_form_action`, `sys_ux_form_action_layout`, `sys_ux_form_action_layout_group`, `sys_ux_form_action_layout_item`, `sys_ux_addon_event_mapping`.

Workspace search tables: `sys_search_context_config`, `sys_search_source`, `sys_search_filter`, `m2m_search_context_config_search_source`, `ais_search_profile`, `ais_dictionary`, `ais_datasource`, `ais_search_profile_ais_dictionary_m2m`, `ais_search_profile_ais_search_source_m2m`, `sys_suggestion_reader_group`, `m2m_sys_suggestion_reader_sys_suggestion_reader_group`.

Platform Analytics dashboard tables: `par_dashboard`, `par_dashboard_tab`, `par_dashboard_canvas`, `par_dashboard_widget`, `par_dashboard_user_metadata`, `par_dashboard_permission`, `par_dashboard_visibility`, `par_visualization`, `par_component`, `sys_ux_macroponent`.

HRSD COE/case tables: `sn_hr_core_case`, `sn_hr_core_case_total_rewards`, `sn_hr_core_case_payroll`, `sn_hr_core_case_talent_management`, `sn_hr_core_case_workforce_admin`, `sn_hr_core_case_operations`, `sn_hr_le_case`, `sn_hr_core_case_benefits`, `sn_hr_core_case_compensation`, `sn_hr_core_case_corporate_communication`, `sn_hr_core_case_global_mobility`.

HRSD lifecycle tables: `sn_hr_core_service`, `sn_hr_core_template`, `sn_hr_core_task`, `sn_hr_core_criteria`, `sn_hr_le_type`, `sn_jny_journey_config`, `sn_hr_le_activity_set`, `sn_hr_le_activity`, `sn_hr_le_activity_field_mapping`, `sc_cat_item_producer`, `item_option_new`, `question_choice`, `sn_doc_html_template`.

Integration tables: `sys_rest_message`, `sys_rest_message_fn`, `sys_rest_message_headers`, `sys_rest_message_fn_headers`, `sys_rest_message_fn_param_defs`, `sys_outbound_http_log`, `sys_alias`, `sys_connection`, `http_connection`, `sys_auth_profile_basic`, `oauth_entity_profile`.

Import tables: `sys_data_source`, `sys_attachment`, `sys_import_set`, `sys_import_set_row`, `sys_import_set_run`, `sys_import_set_row_error`, `sys_transform_map`, `sys_transform_entry`.

Known IDs:
- Admin user: `Simen Admin`, sys_id `6816f79cc0a8016401c5a33be04be441`
- Preferences: `apps.current_app`, `sys_update_set`, `updateSetForScope<sys_scope.sys_id>`
- Global scope sys_id: `global`
- Employee Center scope: `sn_ex_sp`, app sys_id `4249e63a28d54d61bb6fbf61fd86cccb`
- Xplore app: `Xplore: Developer Toolkit`, version `5.02`, sys_id `0f6ab99a0f36060094f3c09ce1050ee8`
- Super Search widget: id `super_search_widget`, sys_id `3b9d29f7c34083106b68770d0501314c`

## Example Story Patterns

- **Incident routing**: inspect assignment rules, data lookup, groups, dictionary choices, existing Business Rules, and flows; prefer assignment/data lookup configuration before scripting; test with throwaway incidents and expected groups.
- **Catalog item fulfillment**: load `references/lessons-catalog.md`; inspect catalog item variables, UI policies, client scripts, `sc_cat_item.flow_designer_flow`, step-based fulfillment registry, approvals, flow triggers/actions/branches, and tasks; prefer Flow Designer/catalog fulfillment config; test request submission and generated RITM/tasks plus approval and rejection paths.
- **HRSD HR Service design**: load `references/hrsd-development-guide.md`; load `references/hrsd-coe-selection.md` before choosing the service table, topic category/detail, template table, or producer table; for Lifecycle Event/Journey work also load `references/hrsd-lifecycle.md`. Verify service/table/topic/template alignment and generated case behavior.
- **ACL/security visibility**: inspect roles, groups, table/field ACLs, user criteria, before-query rules, and UI hiding; verify with role-aware Table API and `GlideRecordSecure`; document least-privilege changes.
- **Workspace change**: inspect target workspace app config, lists, declarative actions, form views, and existing client scripts; prefer declarative UX records; test in Workspace and classic UI if both are in scope.
- **Portal/Employee Center widget**: inspect page, instance, widget options, theme, and OOTB widget behavior; prefer options/composition before cloning; test responsive rendering and scoped server script behavior.
- **Integration**: inspect spokes/plugins, connection aliases, REST messages, auth profiles, logs, and existing Script Includes; prefer IntegrationHub/spokes when business-owned; test with safe sample payloads and verify error handling.

## Lesson Hygiene

After ServiceNow work, capture only durable, non-obvious lessons. Add a one-line routing pointer to `SKILL.md` only if it changes future workflow selection; put detailed lessons in the relevant `references/lessons-*.md` file.

When Simen asks to publish skill updates, the canonical repository is `https://github.com/simenandreas91/servicenow-pdi.git`. Use the GitHub publish workflow: inspect `git status` and diff, stage only intended skill files, commit with a terse lesson/update message, push to `origin`, and report the branch and commit. Do not silently push unrelated local changes.

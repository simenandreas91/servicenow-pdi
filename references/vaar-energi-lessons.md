# Vår Energi ServiceNow Lessons

Created: 2026-05-19

Use this file before starting Vår Energi stories. It captures practical instance, update-set, and implementation lessons from live work with Simen.

## Instance Workflow

- Vår Energi stories are usually reviewed in PROD (`https://varenergiprod.service-now.com`) and implemented first in DEV (`https://varenergidev.service-now.com`, profile `other`).
- PROD access has been verified with the same credentials as profile `other` by passing `-Instance 'https://varenergiprod.service-now.com'` to the helpers. Use PROD read-only unless Simen explicitly requests a production change.
- For assigned story review in PROD, query `rm_story` assigned to `simen.knudsen@varenergi.no`. PROD user sys_id seen on 2026-05-19: `8ea85e6b29544f50ac341b4947cfc297`.
- Use the ASCII login form `simen.knudsen@varenergi.no` for the `other` profile unless a live credential source says otherwise. A typed `vårenergi.no` username did not authenticate through the helper path on 2026-05-22.
- Do not create `rm_story` records unless Simen explicitly asks. Treat PROD stories as source requirements and DEV update sets as the working delivery vehicle.
- Re-read the PROD story immediately before continuing prior DEV work. Stories can change after an update set already exists; inspect the current DEV update set summary and target artifacts before deciding whether to revise, add, or leave prior captured rows.
- When editing Vår Energi story fields, keep `description` as plain text with normal line breaks. Do not put HTML tags in `description`. HTML/list formatting is acceptable in `acceptance_criteria`, which is a rich-text field in the story form.
- In Vår Energi instances, never mention Codex, AI, assistant, agent, bot, automation, or similar tool involvement in work notes, comments, test traces, record names, update-set descriptions, syslog markers, or other instance-visible text. Write story/test notes as Simen unless he supplies different wording.

## DEV Context

- DEV profile is `other`; instance URL is `https://varenergidev.service-now.com`.
- Vår Energi sandbox can be reached with profile `other` by passing `-Instance 'https://varenergisandbox.service-now.com'`. Table API worked on 2026-05-27, and Xplore became available after installing Xplore: Developer Toolkit 5.02.
- Xplore is available in DEV after Xplore: Developer Toolkit 5.02 was installed. Prefer Xplore for compact read-only verification and constrained behavior checks.
- Current DEV API/Xplore user sys_id seen on 2026-05-19: `38c17f3fcc980310b214a0b7a2acbbef` (`simen.knudsen@varenergi.no`).
- The default user sys_id in `Set-ServiceNowUpdateSetContext.ps1` is not correct for Vår Energi DEV. Pass `-UserSysId '38c17f3fcc980310b214a0b7a2acbbef'`.
- Restore developer preferences after each implementation and remove local `.sn-pref-snapshot-*` files created for the story.
- If HR Core portal submit reports `Access to api 'setWorkflow'` and the refusal names table scope `Enterprise Service Management Integrations Framework`, a cross-scope privilege is not sufficient because the API policy requires the caller scope to match the table scope. In DEV on 2026-05-29 the practical fix was to patch HR Core `hr_Utils.updateUserMismatchField()` so it only calls `setWorkflow(false)` when the target table is in `sn_hr_core`; the General Inquiry producer then submitted successfully while `sn_hr_core_job` remained owned by `sn_hr_integr_fw`.
- In Xplore/GlideRecord probes on Vår Energi DEV, boolean fields may return `1`/`0` from `getValue()` even when Table API displays `true`/`false`; normalize both forms before deciding whether HR Services or record producers are active.

## Update Set Practice

- Create one update set per story and per application scope.
- If the user names an existing story update set or asks to continue prior work, query `sys_update_set` by story prefix first and switch to that exact record with `Set-ServiceNowUpdateSetContext.ps1 -UpdateSetSysId <sys_id>`. Do not create a replacement update set just because the requirement changed.
- Confirm update capture with `Get-ServiceNowUpdateSetSummary.ps1`.
- If update XML rows appear under `global`, inspect payload scope/package before doing anything else; earlier Document Templates work captured payloads with correct scoped app metadata even when update-row metadata needed cleanup.
- For HR Core story work, use scope/application `Human Resources: Core` (`sn_hr_core`, sys_id `d4ac3fff5b311200a4656ede91f91af2`).
- For Document Templates story work, use scope/application `Document Templates` (`sn_doc`). Resolve the app sys_id in the target instance before switching scopes.
- Re-parenting completed Vaar Energi DEV update sets by PATCHing `sys_update_set.parent` also refreshes `base_update_set`; keep older batch records separate rather than nesting one batch update set under another unless explicitly requested.

### Batch Update Set Parenting

When Simen asks to "batch up" update sets, create or reuse a story batch update set and make it the parent of that story's delivery update sets.

Use this runbook:

1. Load this file and confirm the target instance/profile. For Vår Energi DEV, use `-Profile other -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'`.
2. Query `sys_update_set` by story prefix, e.g. `nameLIKESTRY0010045`, with fields `sys_id,name,application,state,parent,base_update_set,sys_created_on`.
3. Identify whether a batch already exists. Prefer an exact batch name of `<story> - Batch`, for example `STRY0010045 - Batch`.
4. If no batch exists, create it as a Global update set named `<story> - Batch`. If Table API creation follows the user's current application preference instead of Global, snapshot preferences, switch to Global with `Set-ServiceNowUpdateSetContext.ps1`, then correct the batch application. If PATCH cannot change `application`, use a constrained Xplore script in Global to set `sys_update_set.application='global'`, then read back to verify.
5. Select child update sets deliberately:
   - Include story delivery update sets for the requested story.
   - Exclude the batch record itself.
   - Exclude unrelated helper, RCA, demo, or later story update sets unless Simen explicitly names them.
   - If multiple ambiguous story prefixes are present, stop and ask which records should be included.
6. PATCH each child `sys_update_set` by `sys_id` with `parent=<batch_sys_id>`. ServiceNow should also populate `base_update_set` to the same batch.
7. Verify with a fresh read: query `sys_update_set` where `parent=<batch_sys_id>` and confirm every intended child has both `parent` and `base_update_set` pointing to the batch.
8. If developer preferences were changed, restore the snapshot and remove the local `.sn-pref-snapshot-*` file.
9. Final response should include the batch name/sys_id/application, the child update set names linked, verification of `parent` and `base_update_set`, and whether preferences were restored.

Core commands:

```powershell
& scripts/Invoke-ServiceNowTable.ps1 -Table sys_update_set `
  -Query 'nameLIKESTRY0010045' `
  -Fields 'sys_id,name,application,state,parent,base_update_set,sys_created_on' `
  -DisplayValue all -Profile other -EnvPath '<workspace>\.env' -ExcludeReferenceLink

& scripts/Invoke-ServiceNowTable.ps1 -Method POST -Table sys_update_set `
  -BodyJson '{"name":"STRY0010045 - Batch","application":"global","state":"in progress"}' `
  -Fields 'sys_id,name,application,state,parent,base_update_set' `
  -DisplayValue all -Profile other -EnvPath '<workspace>\.env' -ExcludeReferenceLink

& scripts/Invoke-ServiceNowTable.ps1 -Method PATCH -Table sys_update_set `
  -SysId '<child_update_set_sys_id>' `
  -BodyJson '{"parent":"<batch_update_set_sys_id>"}' `
  -Fields 'sys_id,name,parent,base_update_set,application,state' `
  -DisplayValue all -Profile other -EnvPath '<workspace>\.env' -ExcludeReferenceLink
```

If the batch application must be corrected and Table API PATCH does not take effect, use Xplore narrowly:

```javascript
var gr = new GlideRecord('sys_update_set');
if (gr.get('<batch_update_set_sys_id>')) {
  gr.setWorkflow(false);
  gr.setValue('application', 'global');
  gr.update();
}
```

## Vår Energi Branded Notifications

- All Vår Energi HR email notifications should use email template `Vår Energi template` (`sysevent_email_template` sys_id `1462e7ca918a3010f877b1d70a4d6a3d` in DEV), linked to email layout `Vår Energi Layout` (`sys_email_layout` sys_id `9d3d6f8777823010f088a0e89e5a997f` in DEV).
- The shared `Vår Energi template` and `Vår Energi Layout` are delivered separately under PROD story `STRY0010119` and DEV update set `STRY0010119 - Vår Energi email template and layout` (`8eddad4475054350b214aab5f94fce00`) in `Employee Experience Foundation`. Do not include these shared records in later feature-specific notification stories.
- The `Vår Energi Layout` references logo attachment `VarEnergi_emailLogo.png` (`sys_attachment` sys_id `181c308821454f10d8cb70a2b1956a37` in DEV). Attachments may need separate migration/verification because ordinary update-set rows for the layout/template do not necessarily prove the binary attachment will be present downstream.
- Notification copy should be based on `references/vaar-energi-design.md`, especially the Vision & Validate section for HRSD.
- Interpret "view my notifications in ServiceNow, not on mail" as a content rule: email may alert the employee, but the user should open Employee Center/ServiceNow to see details and take action.
- Do not include agent comments, journal notes, or resolution detail in employee email bodies unless Simen explicitly asks. Provide a mail-script-generated link to the portal/case instead.
- Do not create inbound email actions for this pattern unless Simen explicitly requests them.
- Mail scripts must be content-only and contain no styling. Do not print inline CSS, button styles, colors, borders, font declarations, or layout styling from mail scripts. Put presentation in the email template and/or email layout. Simple structural formatting such as new lines, paragraphs, lists, and spacing is acceptable when a mail script prints repeated content.
- Prefer simple mail scripts that only build and print the target URL. Use the standard IIFE signature:

```javascript
(function runMailScript(/* GlideRecord */ current, /* TemplatePrinter */ template,
    /* Optional EmailOutbound */ email, /* Optional GlideRecord */ email_action,
    /* Optional GlideRecord */ event) {

    var baseUrl = gs.getProperty("glide.servlet.uri");
    var tableName = current.getTableName();
    var link = baseUrl + "now/sow/record/" + tableName + "/" + current.getUniqueValue();

    template.print(link);

})(current, template, email, email_action, event);
```

- Route links by audience. End users should be sent to Employee Center/portal, for example:

```javascript
(function runMailScript(/* GlideRecord */ current, /* TemplatePrinter */ template,
    /* Optional EmailOutbound */ email, /* Optional GlideRecord */ email_action,
    /* Optional GlideRecord */ event) {

    var instanceBaseURL = gs.getProperty("glide.servlet.uri");
    var portalRelativeUrl = "esc?id=hrm_todos_page";
    var fullUrl = instanceBaseURL + portalRelativeUrl;

    template.print(fullUrl);

})(current, template, email, email_action, event);
```

- Agents should be sent to UI16 or Workspace/SOW record views, depending on the target process and workspace adoption. For SOW, use `now/sow/record/<table>/<sys_id>` as shown above.
- Existing HR mail script `hr_link` generates case links through `hr_EmailUtil.getCaseURI(current, email_action)`. Reuse it for HR case emails when possible.
- Existing HR mail script `hr_body` prints latest comments for comment notifications; avoid it when the story says employees should view updates in ServiceNow instead of email.
- Approval notifications on `sysapproval_approver` cannot use `hr_link` directly because `current` is an approval record, not an HR case. Use a small approval-specific mail script to resolve `current.sysapproval` to the HR case and then generate the portal/case link.

## STRY0010052 Pattern

- PROD story `STRY0010052` was `Configure user notifications`: employees need important HR case created/updated/resolved/approval alerts with Vår Energi branding.
- DEV update set used: `STRY0010052 - HR user notifications` (`7f52290421018f10d8cb70a2b1956a2d`) in HR Core.
- The focused active HR Core notifications after implementation were:
  - `HR Case opened (Opened For)`
  - `Comment left on HR case`
  - `HR case closed`
  - `Vår Energi - HR approval requested`
- Other active HR Core email notifications were deactivated for now at Simen's request. Do not reactivate them unless a later story asks for them.
- Verification pattern: Xplore should confirm the active HR Core notification list, template usage, link mail scripts in each body, no journal extraction in active bodies, and no inbound actions created.

## HRSD SLA Story Pattern

Use this when a Vår Energi story asks for an HR case SLA, response time, resolution time, or service level target.

STRY0010050 lessons:

- Service-specific HR SLAs can overlap with generic base HR Case SLAs. General Inquiry-specific SLAs would also match the generic HR Case 4-hour and VIP 2-hour SLAs unless those generic start conditions exclude the specific HR Service.
- PROD story requirements can move after an initial update-set pass. STRY0010050 changed from a single 5-business-day response SLA to a 1-business-day response SLA plus a separate 5-business-day resolution SLA while the original DEV update set was still in progress.

Step-by-step:

1. Read the story from PROD `rm_story` and check `references/vaar-energi-design.md` for SLA wording. Treat PROD story `description` and `acceptance_criteria` as the latest requirement when they differ from earlier design notes or existing DEV update-set names. On 2026-05-22, STRY0010050 required `1 day` General Inquiry response plus `5 day` resolution.
2. Resolve the target HR Service in DEV, usually `sn_hr_core_service`, and confirm `service_table`. General Inquiry in DEV: sys_id `6628cde49f331200d9011977677fcf0b`, table `sn_hr_core_case`.
3. Inspect existing `contract_sla` rows for the target table and nearby COE tables. Capture `name`, `collection`, `type`, `target`, `duration`, `schedule`, `start_condition`, `stop_condition`, `pause_condition`, and scope/package.
4. Check `sys_choice` for `contract_sla.target` before setting target values. General Inquiry response uses stored target value `response`; resolution uses `resolution`.
5. Prefer the customer's existing HR schedule pattern unless the story says calendar days. For Vår Energi HR Core SLAs, the existing schedule is `8-5 weekdays excluding holidays` (`090eecae0a0a0b260077e1dfa71da828`), with one span Monday-Friday 08:00-17:00. One business day is 9 scheduled hours, stored as duration `1970-01-01 09:00:00`; five business days is 45 scheduled hours, stored as `1970-01-02 21:00:00`.
6. Create or reuse a story update set in the relevant scope, usually `Human Resources: Core` (`sn_hr_core`, sys_id `d4ac3fff5b311200a4656ede91f91af2`), and snapshot/restore preferences around the work. When revising existing story work, pass the existing update set sys_id to the context helper.
7. Create or revise the service-specific `contract_sla` rows with short names that fit the field length. For General Inquiry use the common fields:
   - `collection=sn_hr_core_case`
   - `type=SLA`
   - `schedule=090eecae0a0a0b260077e1dfa71da828`
   - `start_condition=active=true^hr_service=<service_sys_id>^EQ`
   - `stop_condition=active=false^EQ`
   - `pause_condition=sla_suspended=true^EQ`
   - `when_to_cancel=on_condition`
   For the current STRY0010050 target set, keep separate rows:
   - response: `target=response`, `duration=1970-01-01 09:00:00`
   - resolution: `target=resolution`, `duration=1970-01-02 21:00:00`
8. Prevent overlap. If generic table-level SLAs would also start for the service, update their start conditions to exclude the service, for example `hr_service!=<service_sys_id>`. Capture these changes in the same scoped update set when they are in the same application.
9. Runtime verification is required. Create a temporary case for the HR Service, query `task_sla`, and verify:
   - each intended service SLA attached
   - generic conflicting SLAs did not attach
   - `planned_end_time` reflects the requested business/calendar target
10. Clean up temporary cases and `task_sla` rows. Avoid leaving test HR cases unless Simen asks to inspect them.
11. Confirm update capture with `Get-ServiceNowUpdateSetSummary.ps1`. After the 2026-05-22 STRY0010050 update, a clean existing update set had four `SLA Definition` rows: 1-business-day response, 5-business-day resolution, and the two generic HR Case SLA exclusion updates, all in HR Core with no mixed scope.
12. Final response should include story interpretation, update set name/sys_id/scope, SLA definition details, overlap prevention, runtime verification result, cleanup, and restored preferences.

## HR Proposed Solution Auto-Close Pattern

- For DEV update set `STRY0010053-55 - HR proposed solution auto-close`, runtime verification should create a General Inquiry HR case, move it to Awaiting Acceptance (`state=20`), then use work notes only for test trace. Public `comments` authored by the `opened_for` or `opened_by` user after `u_proposed_solution_at` are intentionally treated as employee responses and will suppress both the 3-business-day reminder and 7-business-day auto-close.

## Document Template Signing Date Lesson

- For HTML Document Templates (`sn_doc_html_template` / `sn_doc_template` type `HTML Template`), the ServiceNow signing date story is not solved by the form's `Insert Date` button.
- The `Insert Date` action inserts `${Date}` or target-table date/date-time fields via `sn_doc_field_tree`; it is not participant-aware and does not insert a signing-date token.
- STRY0010036 implemented automatic replacement of `${sign_date:<participant>}` when `${signature:<participant>}` is saved, using `signature_image.signed_on` and the template date format when available.
- Keep demo records unless Simen asks to clean them up; he wanted to inspect the demo data.

## Compendia Knowledge Sandbox Lesson

- For Compendia Personalhandbok sync in Vår Energi sandbox, the API contract verified on 2026-05-27 was OAuth client credentials at `https://api.compendia.no/oauth/v2/token` and pages under `/varenergi/personal/api/v1/pages`; the list endpoint returned 142 pages and page `1248946` mapped cleanly to a draft HR knowledge article with Compendia tags in `kb_knowledge.meta`.
- In sandbox on 2026-05-27, Table API could create and read a draft article in `Human Resources General Knowledge`, but Xplore/GlideRecord could not read that same HR knowledge article by `sys_id`, `number`, `short_description`, or custom source field, even after admin impersonation. Do not enable a scheduled server-side sync until the HR knowledge visibility/query behavior is resolved, or the sync may duplicate articles.
- Moving the sample Compendia article into a dedicated `Compendia` knowledge base resolved the sandbox GlideRecord visibility issue for that article. The Script Include idempotency check then updated page `1248946` in place with one matching `kb_knowledge` record.
- The Compendia sync loop should scan the full page list but only count new/changed pages toward `varenergi.compendia.sync.max_per_run`; otherwise each daily run repeats the first N pages. In sandbox, `VECompendiaKnowledgeSync.syncAll(limit, true)` dry-run mode verified this behavior without creating articles.
- The Compendia page API response did not expose author, created-by, or updated-by metadata on 2026-05-27; available page fields were ID, title, content, URL, created/modified dates, tags, and blocks. Original-author attribution in ServiceNow requires Compendia to expose author data or a separate page-author endpoint.
- Auto-publish is controlled by `varenergi.compendia.sync.auto_publish` and defaults to false. When true, the sync sets `workflow_state=published` and a published date; when false, it keeps articles draft and clears the published date on sync updates.
- In sandbox, synced article authors are controlled by `varenergi.compendia.author_user`, which points to a dedicated `Compendia` user with `knowledge_admin`. If this pattern is migrated by update set, force-capture both the `sys_user` row and the direct `sys_user_has_role` row because they are data records and may not capture naturally.
- The Compendia API can return HTTP 429 during full sync if every page detail request fetches a fresh OAuth token and runs without pacing. Cache the OAuth token per `VECompendiaKnowledgeSync` instance, use a small request delay/retry loop, and log per-page errors so one rate-limited page does not hide the failure point or stop diagnostic output.
- Compendia page content can mix absolute image URLs with root-relative media URLs such as `/uploads/images/...`. Normalize relative `src` and `href` values to `https://cp.compendia.no/...` before storing `kb_knowledge.text`; otherwise ServiceNow resolves them against the instance URL and renders broken images.

## Now Assist HRSD Case Summarization Lesson

- In Vår Energi DEV on 2026-05-29, the HRSD Case summarization skill config (`810c8f4488857110f8777b97b14a6a98`) resolved correctly only when `capability_id=ce064fd10127a510f877ab5e150e4896` was supplied. The UI path can call `HRSDSkillUtils.canUserExecuteInProductSkill()` with only `skill_config_id`; patch the customer wrapper `HRSDSkillUtils` in scope `sn_hr_gen_ai`, not `HRSDSkillUtilsSNC`, to inject the Case summarization capability ID before delegating to the SNC implementation.
- If the HR Case summary card still says base-table access was unsuccessful after HRSD access/config fixes, reproduce the exact `sn_uxc_gen_ai.TaskSummarize.summarize()` path. On 2026-05-29, direct `_getRequestPayload()` returned `userHasAccessToBaseRecord=true` and a full HR payload, but the protected `summarize()` wrapper path returned an empty OneExtend `requestPayload` with `_meta.skip_capability_definition_preprocessor=true`; adding `sys_scope_privilege`/RCA rows did not change this. Treat that as a Platform AI Agents / OneExtend protected-code issue or plugin repair target, not an HR table ACL problem.

## HR Core setWorkflow Cross-Scope Lesson

- In Vår Energi DEV on 2026-05-29, `sn_hr_core_job` is owned by `Enterprise Service Management Integrations Framework` (`sn_hr_integr_fw`), not HR Core, even though the table name starts with `sn_hr_core`. HR Core code that calls `setWorkflow(false)` on `sn_hr_core_job` violates the Zurich scoped GlideRecord same-scope restriction.
- A `sys_scope_privilege` for `GlideRecord.setWorkflow` or `SetWorkflow` does not override this platform restriction. The durable fix is to remove or guard the same-scope-only call at the active HR Core code path.
- To isolate the live portal path, instrument active HR Core artifacts that contain direct `*.setWorkflow(false)` with a short `gs.warn('[CODEX_SETWORKFLOW_TRACE] ... stack=' + new Error().stack)` marker, then reproduce through the portal and query `syslog` for the marker excluding `source=SND Xplore`.
- Employee Center portal banners can outlive the server transaction that created them. If a reproduced HR case creates no fresh `syslog` row, no trace marker, and no `sys_restricted_caller_access` row, first dismiss the red banner in the browser and retest before adding more privileges. The General Inquiry record producer is owned by Employee Center Core, so do not patch it while the current update set is HR Core.
- For General Inquiry portal submissions, also check `sys_flow_context` at the record producer submit timestamp. On 2026-05-29 the active ESM Integrations Framework flows/subflows existed but did not drive the submit path; the live failing context was HR Core subflow `HR service activities` (`2429451beba84210c9680878f152284e`) launched by HR Core BR `Apply Service Template Flow` (`b8d1d117ebe84210c9680878f15228a7`) on `sn_hr_core_case`. That subflow errored while updating `service_activities_triggered=true` on `in.hr_case` with `The requested flow operation was prohibited by security rules`.
- On 2026-05-30, the temporary UI-noise workaround for General Inquiry was an Employee Center Core update set (`General Inquiry portal message suppression`, `ff1952ef084dc350b214e39a21c8b465`) that adds `new global.VEMessageUtil().clearPortalMessages()` after `hr_ServicesUtil.createCaseFromProducer(...)` in record producer `27c78de49f331200d9011977677fcfb3`. The helper must remain Global because `gs.flushMessages()` is blocked from scoped portal code such as `sn_hr_sp`.
- If that record-producer message clear does not remove the banner, move the clear later: an HR Core after-insert Business Rule on `sn_hr_core_case`, scoped to the General Inquiry HR service and ordered after the service-template/subflow rules, can run after the platform message is added. On 2026-05-30 this was captured as HR Core BR `Clear General Inquiry portal messages` in update set `General Inquiry HR case message suppression`.

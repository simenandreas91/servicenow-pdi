# Vår Energi ServiceNow Lessons

Created: 2026-05-19

Use this instance-specific file only after the core skill. It captures dated Vår Energi observations; verify every material assumption live before acting.

## Instance Workflow

- Vår Energi stories are usually reviewed in PROD and implemented first in DEV. Discover profiles live; the current remote DEV key is `varenergi_dev` for `https://varenergidev.service-now.com`.
- PROD and sandbox require their own named profiles, credentials, safety gates, and health checks. Never repoint DEV credentials with an instance override. Treat PROD as read-only unless Simen authorizes the exact write.
- For assigned story review in a separately configured PROD profile, resolve the assignee by stable username/email and then query `rm_story`. Treat dated user sys_ids in this file as hints only.
- Do not create `rm_story` records unless Simen explicitly asks. Treat PROD stories as source requirements and DEV update sets as the working delivery vehicle.
- Re-read the PROD story immediately before continuing prior DEV work. Stories can change after an update set already exists; inspect the current DEV update set summary and target artifacts before deciding whether to revise, add, or leave prior captured rows.
- When editing Vår Energi story fields, keep `description` as plain text with normal line breaks. Do not put HTML tags in `description`. HTML/list formatting is acceptable in `acceptance_criteria`, which is a rich-text field in the story form.
- In Vår Energi instances, never attribute work to Codex, AI, an assistant, or tooling in work notes, comments, test traces, record names, update-set descriptions, syslog markers, or other instance-visible text. Use the requested professional author voice without impersonation claims.
- For Vår Energi `rm_story` updates, always use `work_notes` for implementation notes, decisions, validation evidence, and status updates. Do not use `comments` / Additional comments for story notes unless Simen explicitly asks for a public/customer-visible additional comment.
- Production story work notes are permitted only when Simen explicitly asks for that exact update. Keep them factual, write as Simen, summarize implementation and test evidence, and never include secrets, generated tokens, client secrets, or tooling details.
- When asked to add implementation "decisions" to a Vår Energi story and no dedicated decision field is confirmed, add a structured work note headed as decisions/update rather than changing requirement fields.
- On 2026-06-30, Vår PROD Basic/Table API story reads worked again after granting `snc_basic_auth_api_access` to `simen.knudsen@varenergi.no`; Xplore still returned HTML and metadata tables such as `sys_update_set` and `sys_plugins` returned 403, so use Table API for allowed PROD story/application reads and do not assume PROD Xplore/metadata access.
- On 2026-06-30, Vår PROD `sys_attachment` metadata and `sys_attachment_doc` chunks were readable for story attachments even when `/api/now/attachment/<sys_id>/file` failed API-level ACL validation and Xplore returned HTML. For read-only screenshot inspection, query `sys_attachment_doc` by attachment sys_id, sort by `position`, base64-decode chunks, GZip-decompress the payload, and verify the PNG magic bytes before opening locally.

## DEV Context

- Remote MCP DEV profile is `varenergi_dev`; verify that it resolves to `https://varenergidev.service-now.com`. A local helper profile is separate configuration and must prove the same URL before use.
- In Vår Energi DEV Manager Hub, the classic Administration modules are backed by Manager Hub scope (`sn_mh`) tables; inspect related-list M2M tables as well as the top-level config tables. `sn_mh_team_data_m2m_column` maps Team Data records into Team Column Configuration, `sn_mh_team_data_m2m_filter_group` maps Team Data records into Team Filter Configuration, and `sn_mh_team_m2m_filter_sources` maps Team Filter Group Data into Team Daily Stats using field `daily_stats`.
- In Vår Energi DEV Manager Hub, the Manager Library page is `sp_page.id=sn_mh_manager_resources` and already uses a mix of Content Publishing widgets (`Styled Content (CD)`, `Information Links (CD)`, `Upcoming Events (CD)`) plus a standard Employee Center `Quick Links` instance for "Other resources"; route manager-library content/link stories to page composition plus CD/quick-link configuration before considering custom widgets.
- Historical tests used host overrides for sandbox/PROD. Do not repeat that pattern; configure a dedicated named profile for each environment and verify it before any read.
- Re-check sandbox authentication before follow-up work. A UI session does not prove REST access, and DEV/PROD credentials must not be assumed valid for sandbox.
- A sandbox UI session from `login.do` does not automatically prove REST access. On 2026-06-18, the user reached `/now/nav/ui/home` in the in-app browser, but a same-browser direct `/api/now/table/sys_user?...` URL still returned "User is not authenticated"; this was reconfirmed on 2026-06-23 after interactive login to `/now/nav/ui/home`. Plan sandbox implementation around UI-only access until a working local/API credential or OAuth client is available.
- Sandbox Basic auth is blocked by the maintained `SNCRestrictBasicAuthUserAuthenticationGate` when `glide.authenticate.basic_auth.restriction.enforce=true`; DEV had the same feature active but `enforce=false` on 2026-06-23. The sandbox failure log says the interactive user must provide MFA OTP, have explicit `snc_basic_auth_api_access`, be WSAO, or be otherwise allow-listed. Admin wildcard role checks are not enough for this gate because it checks `GlideUser.getRoles().contains(...)`.
- A dated sandbox test succeeded after `snc_basic_auth_api_access` was granted. Re-verify through a dedicated sandbox profile; do not reuse a DEV profile with a host override.
- Xplore is available in DEV after Xplore: Developer Toolkit 5.02 was installed. Prefer Xplore for compact read-only verification and constrained behavior checks.
- For Vår General Inquiry catalog client scripts, the record producer is `General Inquiry` (`sc_cat_item_producer=27c78de49f331200d9011977677fcfb3`) in Employee Center Core, and the Category select variable is `what_is_the_inquiry_about` (`item_option_new=638da54421418f10d8cb70a2b1956aa7`, client-script `cat_variable=IO:638da54421418f10d8cb70a2b1956aa7`). In DEV on 2026-06-26, Table API create/PATCH ignored `catalog_script_client.cat_variable`; a constrained GlideRecord update set the binding and captured it correctly.
- Let `servicenow_set_update_set_context` bind its snapshot to the authenticated integration user returned by health; never copy a dated user sys_id across profiles.
- Restore developer preferences after each implementation with `servicenow_restore_development_context` and the exact returned snapshot.
- If HR Core portal submit reports `Access to api 'setWorkflow'` and the refusal names table scope `Enterprise Service Management Integrations Framework`, a cross-scope privilege is not sufficient because the API policy requires the caller scope to match the table scope. In DEV on 2026-05-29 the practical fix was to patch HR Core `hr_Utils.updateUserMismatchField()` so it only calls `setWorkflow(false)` when the target table is in `sn_hr_core`; the General Inquiry producer then submitted successfully while `sn_hr_core_job` remained owned by `sn_hr_integr_fw`.
- In Xplore/GlideRecord probes on Vår Energi DEV, boolean fields may return `1`/`0` from `getValue()` even when Table API displays `true`/`false`; normalize both forms before deciding whether HR Services or record producers are active.

## Update Set Practice

- Create one update set per story and per application scope.
- If the user names an existing story update set or asks to continue prior work, query `sys_update_set` by story prefix first and switch to that exact record with `servicenow_set_update_set_context(update_set_sys_id=<sys_id>)`. Do not create a replacement update set just because the requirement changed.
- Confirm update capture with `servicenow_confirm_update_capture`; use `Get-ServiceNowUpdateSetSummary.ps1` only for a broader inventory/noise review.
- If update XML rows appear under `global`, inspect payload scope/package before doing anything else; earlier Document Templates work captured payloads with correct scoped app metadata even when update-row metadata needed cleanup.
- For HR Core story work, resolve scope/application `Human Resources: Core` (`sn_hr_core`) live in the target profile; do not rely on a stored scope sys_id.
- For Document Templates story work, use scope/application `Document Templates` (`sn_doc`). Resolve the app sys_id in the target instance before switching scopes.
- Re-parenting completed Vaar Energi DEV update sets by PATCHing `sys_update_set.parent` also refreshes `base_update_set`; keep older batch records separate rather than nesting one batch update set under another unless explicitly requested.

### Batch Update Set Parenting

When Simen asks to "batch up" update sets, create or reuse a story batch update set and make it the parent of that story's delivery update sets.

Use this runbook:

1. Load this file and confirm the target instance/profile. For remote MCP work use `varenergi_dev`; for a local helper use only a separately configured profile that health-checks to the exact DEV URL.
2. Query `sys_update_set` by story prefix, e.g. `nameLIKESTRY0010045`, with fields `sys_id,name,application,state,parent,base_update_set,sys_created_on`.
3. Identify whether a batch already exists. Prefer an exact batch name of `<story> - Batch`, for example `STRY0010045 - Batch`.
4. If no batch exists, create it atomically with `servicenow_set_update_set_context(scope=global, name=<story> - Batch)`. Retain the snapshot, read back `application=global`, and restore the prior context after parenting is complete.
5. Select child update sets deliberately:
   - Include story delivery update sets for the requested story.
   - Exclude the batch record itself.
   - Exclude unrelated helper, RCA, demo, or later story update sets unless Simen explicitly names them.
   - If multiple ambiguous story prefixes are present, stop and ask which records should be included.
6. PATCH each child `sys_update_set` by `sys_id` with `parent=<batch_sys_id>`. ServiceNow should also populate `base_update_set` to the same batch.
7. Verify with a fresh read: query `sys_update_set` where `parent=<batch_sys_id>` and confirm every intended child has both `parent` and `base_update_set` pointing to the batch.
8. If developer preferences were changed, restore them with `servicenow_restore_development_context` and the exact MCP snapshot.
9. Final response should include the batch name/sys_id/application, the child update set names linked, verification of `parent` and `base_update_set`, and whether preferences were restored.

Core commands:

```powershell
& scripts/Invoke-ServiceNowTable.ps1 -Table sys_update_set `
  -Query 'nameLIKESTRY0010045' `
  -Fields 'sys_id,name,application,state,parent,base_update_set,sys_created_on' `
  -DisplayValue all -Profile '<verified-dev-profile>' -EnvPath '<workspace>\.env' -ExcludeReferenceLink

& scripts/Invoke-ServiceNowTable.ps1 -Method POST -Table sys_update_set `
  -BodyJson '{"name":"STRY0010045 - Batch","application":"global","state":"in progress"}' `
  -Fields 'sys_id,name,application,state,parent,base_update_set' `
  -DisplayValue all -Profile '<verified-dev-profile>' -EnvPath '<workspace>\.env' -ExcludeReferenceLink

& scripts/Invoke-ServiceNowTable.ps1 -Method PATCH -Table sys_update_set `
  -SysId '<child_update_set_sys_id>' `
  -BodyJson '{"parent":"<batch_update_set_sys_id>"}' `
  -Fields 'sys_id,name,parent,base_update_set,application,state' `
  -DisplayValue all -Profile '<verified-dev-profile>' -EnvPath '<workspace>\.env' -ExcludeReferenceLink
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
- In sandbox, synced article authors are controlled by `varenergi.compendia.author_user`, which points to a dedicated `Compendia` user with `knowledge_admin`. Treat the user and role assignment as data/security provisioning, not ordinary update-set configuration; transport them through the approved identity/data mechanism and re-resolve the property reference in each target.
- The Compendia API can return HTTP 429 during full sync if every page detail request fetches a fresh OAuth token and runs without pacing. Cache the OAuth token per `VECompendiaKnowledgeSync` instance, use a small request delay/retry loop, and log per-page errors so one rate-limited page does not hide the failure point or stop diagnostic output.
- Compendia page content can mix absolute image URLs with root-relative media URLs such as `/uploads/images/...`. Normalize relative `src` and `href` values to `https://cp.compendia.no/...` before storing `kb_knowledge.text`; otherwise ServiceNow resolves them against the instance URL and renders broken images.
- The 2026-06-18 Compendia expansion syncs four handbook slugs (`employee`, `leadership-portal`, `personal`, `personal-offshore`) from property `varenergi.compendia.handbooks`. Use a handbook-aware external key such as `employee:1280949` in the existing source ID field so translated/overlapping articles can coexist. The staging table `u_compendia_import_staging` extends Import Set Row and stores payload, handbook, tags, processing state, target article, and errors. Compendia collapsible markers arrive as `div.collapsable` with `data-collapse-title`; transform those into styled heading blocks before storing KB HTML.
- ServiceNow KB article HTML preserves native `<details><summary>...</summary>...</details>` in sandbox and renders it collapsed/clickable on `kb_view.do`. For Compendia markers, wrap content from each `div.collapsable[data-collapse-title]` marker until the next marker inside the preceding `<details>` block; otherwise the headings render collapsed but their content remains outside and always visible.
- A full Compendia sandbox sync can continue server-side even when the browser/Xplore tool call times out. Before rerunning, verify `kb_knowledge` and `u_compendia_import_staging` counts by handbook/state; on 2026-06-18 the completed full sync produced 495 published KB articles and 495 processed staging rows with no staging errors.
- When moving the Compendia integration update sets from sandbox to DEV, import the original base update set before the later multi-handbook delta because the delta depends on the Compendia KB, author user, scheduled job, and base properties. Password2/encrypted system property values do not migrate safely by update set; after commit, reset `varenergi.compendia.client_secret` in the target instance from the approved plaintext source, then verify with a dry-run token/page-list call before running the sync.
- For STRY0010397 attachment handling, Compendia page details can include `blocks-link-template` HTML under `blocks` where file titles render as plain `<li>` text, while the real file metadata is exposed separately under `/{customer}/{handbook}/api/v1/files`, `files/{id}`, and `files/{id}/download`. Download URLs require the OAuth bearer token (`401` without it), so ServiceNow KBs should store downloaded files as `sys_attachment` records and link to `sys_attachment.do?sys_id=...` rather than linking directly to Compendia API URLs. Sandbox POC on 2026-06-24 attached file `1274603` to `KB0010405` successfully via `RESTMessageV2.saveResponseBodyAsAttachment`.
- Compendia file references can cross handbook boundaries: sandbox page `personal-offshore:1250505` lists PDF titles whose real file records live under the `personal` files endpoint. The sync should match attachment titles against the current handbook first, then configured handbooks as fallback, and remember the file's source handbook for the download call. `kb_knowledge.display_attachments=true` is needed for Employee Center to expose attached files, and ServiceNow may store KB body hrefs as `sys_attachment.do?sys_id&#61;<id>` after HTML sanitization.
- Do not assume Compendia downloads are PDFs when saving with `RESTMessageV2.saveResponseBodyAsAttachment`. File `1249684` returned a DOCX content type and only attached cleanly when saved with an extension-neutral filename, then renamed from the response `Content-Type`; keep attachment reuse checks tolerant of common extensions such as `.pdf`, `.docx`, `.doc`, `.xlsx`, and `.pptx`.
- Compendia `blocks-link-template` HTML can expose attachment references as plain `<li>` text with no href or file ID in the page detail API. For DEV article `employee:1250575` / `KB0010043`, usable matching required cross-handbook file lookup, English-to-Norwegian title aliases such as `Terms and Conditions` -> `forsikringsvilkår`, trimming helper text after `<br>` inside list items, and a skip-list property for known broken Compendia file downloads so the matcher can fall back to a downloadable equivalent.
- When improving Compendia link or attachment matching, update `VECompendiaKnowledgeSync.needsSync()` with a content-health check as well as the mapper itself. Otherwise `syncAll()` skips already-current pages by `u_compendia_modified`, and unchanged articles will not be reprocessed with the improved link logic.
- The Compendia rendered web UI can include file `href` values that are not present in the Customer API page-detail payload. For `employee:1250575` / `personal:1249026`, the page API returned plain `<li>` text for "Health Insurance - Overview", "application form", "Price List", and "Video doctor - First-time login", while the files API exposed matches under different titles such as `Vår Energi - Onepager Helseforsikring 2022.pdf`, `Tilbud til ansatte om helseforsikring til familiemedlemmer_v20190403.pdf`, `Pris medforsikringsavtaler`, and `Kry videolege - bruksanvisning ved første gangs innlogging`. On 2026-06-25, adding explicit normalized aliases for those titles raised the DEV health-insurance articles `KB0010043`, `KB0010284`, and `KB0010409` to nine linked attachments each.
- For DEV article `employee:1250577` / `KB0010045`, missing links were caused by attachment matcher behavior and title aliases, not missing Compendia API data. The file API exposed all eight files, but one English certificate title tied with an already-used certificate candidate and the matcher skipped instead of trying the next unused file; DNB "beneficiary designation" and "continuation insurance" also needed English-to-Norwegian aliases. Keep attachment matching best-unused-file aware when resolving repeated certificate-style titles.
- When promoting the Compendia update sets to TEST, avoid partial Table API reconstruction before committing the real remote update sets: it can create "local update newer than remote" preview conflicts on the Script Include and dictionary/table rows. If this happens, re-preview the latest remote update set, accept/ignore the conflict only when the preview XML still proposes `commit`, then commit through the normal update-set worker and rebuild/cache-flush the import-set staging table before running a full sync.
- If a custom import-set staging table exists in `sys_db_object`/`sys_dictionary` after promotion but GlideRecord/Table API says `Invalid table`, compare `sys_storage_table_alias` and `sys_storage_alias` against DEV. For `u_compendia_import_staging` in TEST on 2026-06-26, the table metadata existed but the generated storage table alias, staging column aliases, and generated `sys_id` dictionary row were missing; this is a physical table/storage-alias creation failure, not a Script Include issue.
- If `u_compendia_import_staging` metadata and storage aliases exist but `gs.tableExists()` is still false after update-set commit, the physical table was not created. In TEST on 2026-06-26, inserting the missing generated `sys_id` dictionary row and running `new GlideTableCreator('u_compendia_import_staging', 'Compendia Import Staging').setExtends('sys_import_set_row').setOverrideUpdate(true).setColumnAttributes(new Packages.java.util.HashMap()).update()` created the backing table; verify with `gs.tableExists()`, `new GlideRecord(table).isValid()`, Table API, and a temporary insert/delete validation row.

## SuccessFactors Master Data Sandbox Lesson

- For STRY0010375 master-data API slices, keep the public contract under one Global Scripted REST API: `/api/company/masterdata`. Add one POST resource per object (`department`, `position`, `costcenter`, `location`), secure each resource with `requires_authentication=true` and `requires_acl_authorization=true`, use path-based REST Endpoint ACLs for `/api/company/masterdata/<resource>`, and grant the shared integration role `varenergi.sap_cpi_masterdata`.
- For external testing and SAP CPI handoff, use OAuth 2.0 client credentials against `/oauth_token.do`, then send POST calls with `Authorization: Bearer <access_token>`. The bearer token is generated by the token endpoint, Postman, or SAP CPI from the OAuth client credentials; it is not manually invented or sent as a fixed value.
- For STRY0010375 master-data staging in Vår Energi sandbox, do not depend on SuccessFactors Spoke or ESM-owned staging tables because those apps may not be installed in downstream instances. Use Global import-set tables and Global Table Transform Maps instead: `u_ve_department_staging` -> `Vaar Energi Department Transform` (`cmn_department`), `u_ve_position_staging` -> `Vaar Energi Position Transform` (`sn_hr_core_position`), `u_ve_cost_center_staging` -> `Vaar Energi Cost Center Transform` (`cmn_cost_center`), and `u_ve_location_staging` -> `Vaar Energi Location Transform` (`cmn_location`). Reference field maps should use `reference_value_field`, for example Department parent and Position department resolve `cmn_department.id`, while user references such as Department head and Cost Center manager resolve `sys_user.employee_number`. External POST tests on 2026-06-26 verified those references end-to-end, and cost center date/date-time field maps needed `date_format=yyyy-MM-dd HH:mm:ss` after the resource normalized Vår's `yyyy.MM.dd` payload dates into staging values. The Department endpoint now accepts both flat records and SAP-style wrapped payloads such as `Department.DepartmentDetails[]`, with aliases including `DepartmentDescription`, `DepartmentHead`, `Parent`, and `Active`. The Cost Center endpoint accepts flat records, `CostCenter[]`, and single-object `CostCenter` wrappers, with aliases including `CostCenterCode`, `CostCenterName`, `ValidFrom`, and `ValidTo`; because the transform coalesces by `cmn_cost_center.code`, multiple rows with the same code in one payload resolve to the same target and the later row becomes the final state. The Position and Location endpoints also accept customer/SAP aliases from external tests: Position `Position[]` with `PositionID`, `PositionName`, `Department`, and `Active`; Location arrays with `CorelationId`/`CorrelationId`, `LocationName`, `City`, `Country`, and `Zip/Postal Code`.
- Inbound OAuth client credentials in sandbox require system property `glide.oauth.inbound.client.credential.grant_type.enabled=true`; without it, `/oauth_token.do` returns `401 access_denied` and logs a client-credentials/PKCE grant error. Create OAuth client secrets through the form/UI or another supported secret path, not Scripts - Background, because sandbox logs full background script text in `syslog` source `ScriptBackgroundCheck`.
- For STRY0010375 Position work in Vår Energi sandbox, the current dependency-free pattern stages to Global `u_ve_position_staging` and transforms with Global `Vaar Energi Position Transform`; coalesce `u_position_id` to `sn_hr_core_position.sn_hr_integr_fw_correlation_id`, map the name to `position`, map `u_department_id` to `department` with `reference_value_field=id`, and map `u_effective_status` to `active` with a field-map source script. The older ESM staging table `sn_hr_integr_fw_position_staging`, transform map `ff402e54eb943010aa60bc58495228f6`, and scoped Script Include should be treated as a sandbox-only predecessor, not the deployable pattern.
- For STRY0010375 Cost Center work in Vår Energi sandbox, the spreadsheet maps cleanly to Global `cmn_cost_center` (`CostCenterID` -> `code`, `Name` -> `name`, `StartDate` -> `valid_from`, `EndDate` -> `valid_to`, optional `CostCenterManager` -> `manager`). `sn_hr_core_cost_center` only has `cost_center` and `active`, so it is not the right first target for the SuccessFactors cost center payload. No existing Cost Center transform map was present in sandbox, so a thin Global Scripted REST resource can idempotently upsert `cmn_cost_center` by `code`.
- For STRY0010375 Location work in Vår Energi sandbox, the workbook's Location sheet maps the SuccessFactors `externalCode` to `cmn_location.correlation_id`, with address fields nested under `addressNavDEFLT.FOCorporateAddressDEFLT`. Existing Location transform maps either coalesce by name or sit behind ESM staging; for the API slice, a thin Global Scripted REST resource can idempotently upsert `cmn_location` by `correlation_id`, map `name/full_name`, `city`, `zip`, `country`, `time_zone`, optional `state`, and resolve ISO country codes such as `NOR` to the `core_country.name` value used by existing `cmn_location` data.
- For STRY0010375 HR Profile work, Vår confirmed `sys_user` is already mastered by Entra ID and the SuccessFactors slice should only upsert `sn_hr_core_profile` by `employee_number`. Require a matching `sys_user` before creating/updating the HR Profile because the table data policy requires `user`; do not create users from this API. The `/api/company/masterdata/hrprofile` resource now accepts both compact technical keys and Excel-style labels with spaces inside `EmployeeDetails[]`, including nested `EmploymentHeader` values. Confirmed mappings include employee number/correlation/integration ID, employment start/end dates, `EmploymentType` value `1` -> `full_time_employee`, work mobile, position by `sn_hr_core_position.sn_hr_integr_fw_correlation_id`, location by `cmn_location.correlation_id`, decimal FTE on `sn_hr_core_profile.u_fte`, and custom HR Profile fields `u_employee_class`, `u_temporary_contract_reason`, `u_temporary_contract_from`, `u_temporary_contract_to`, `u_job_level`, and `u_contract_type`. When `Gender`, `Department`, or `Manager` are received from the HR Profile payload, maintain them on the matched `sys_user` because HR Profile has no direct fields for those values: map `Gender` to `sys_user.gender` (`F`/`Female` -> `Female`, `M`/`Male` -> `Male`, Not Specified-style values -> `Not Specified`), map `Department` to `sys_user.department` by resolving `cmn_department.id`, and map `Manager` to `sys_user.manager` by resolving `sys_user.employee_number`. `Personal mobile phone` may be accepted by the API but sandbox HR Profile behavior did not persist it during 2026-07-04 testing, so treat it as needing target-field clarification.
- For STRY0010375 ChoiceList work, the workbook's ChoiceList sheet is not an API contract; it lists HR Profile dropdown fields and values that need mapping support. Do not add a ChoiceList POST endpoint. In sandbox, `sn_hr_core_profile` already has choices for `employment_type`, `leave_status`, and `offboard_type`; add missing HR Profile dropdown fields as needed (`u_employee_class`, `u_temporary_contract_reason`, `u_job_level`, `u_contract_type`) but wait for Vår to provide actual source values/codes before creating `sys_choice` rows or mapping inbound payload values. These `u_` fields on the scoped HR Profile table can be stamped as Global dictionary/documentation rows and may capture in Default; move only the intended Dictionary and Field Label update XML into the Global STRY0010375 update set and verify no Default residue remains.
- For developer-facing STRY0010375 handoff documentation in sandbox, use the `IT` knowledge base and `Applications` category. Keep technical articles draft unless Simen explicitly asks to publish, and document OAuth/client-secret handling as a process without storing actual secrets or bearer tokens.

## Now Assist HRSD Case Summarization Lesson

- In Vår Energi DEV on 2026-05-29, the HRSD Case summarization skill config (`810c8f4488857110f8777b97b14a6a98`) resolved correctly only when `capability_id=ce064fd10127a510f877ab5e150e4896` was supplied. The UI path can call `HRSDSkillUtils.canUserExecuteInProductSkill()` with only `skill_config_id`; patch the customer wrapper `HRSDSkillUtils` in scope `sn_hr_gen_ai`, not `HRSDSkillUtilsSNC`, to inject the Case summarization capability ID before delegating to the SNC implementation.
- If the HR Case summary card still says base-table access was unsuccessful after HRSD access/config fixes, reproduce the exact `sn_uxc_gen_ai.TaskSummarize.summarize()` path. On 2026-05-29, direct `_getRequestPayload()` returned `userHasAccessToBaseRecord=true` and a full HR payload, but the protected `summarize()` wrapper path returned an empty OneExtend `requestPayload` with `_meta.skip_capability_definition_preprocessor=true`; adding `sys_scope_privilege`/RCA rows did not change this. Treat that as a Platform AI Agents / OneExtend protected-code issue or plugin repair target, not an HR table ACL problem.

## HR Core setWorkflow Cross-Scope Lesson

- In Vår Energi DEV on 2026-05-29, `sn_hr_core_job` is owned by `Enterprise Service Management Integrations Framework` (`sn_hr_integr_fw`), not HR Core, even though the table name starts with `sn_hr_core`. HR Core code that calls `setWorkflow(false)` on `sn_hr_core_job` violates the Zurich scoped GlideRecord same-scope restriction.
- A `sys_scope_privilege` for `GlideRecord.setWorkflow` or `SetWorkflow` does not override this platform restriction. The durable fix is to remove or guard the same-scope-only call at the active HR Core code path.
- When explicitly authorized to isolate the live portal path, add short-lived, narrowly targeted logging to the controlling customer-owned artifact, use a neutral correlation marker such as `SN_SETWORKFLOW_TRACE`, reproduce once, query `syslog`, and remove the logging immediately. Do not instrument protected or ServiceNow-owned artifacts.
- Employee Center portal banners can outlive the server transaction that created them. If a reproduced HR case creates no fresh `syslog` row, no trace marker, and no `sys_restricted_caller_access` row, first dismiss the red banner in the browser and retest before adding more privileges. The General Inquiry record producer is owned by Employee Center Core, so do not patch it while the current update set is HR Core.
- For General Inquiry portal submissions, also check `sys_flow_context` at the record producer submit timestamp. On 2026-05-29 the active ESM Integrations Framework flows/subflows existed but did not drive the submit path; the live failing context was HR Core subflow `HR service activities` (`2429451beba84210c9680878f152284e`) launched by HR Core BR `Apply Service Template Flow` (`b8d1d117ebe84210c9680878f15228a7`) on `sn_hr_core_case`. That subflow errored while updating `service_activities_triggered=true` on `in.hr_case` with `The requested flow operation was prohibited by security rules`.
- On 2026-05-30, the temporary UI-noise workaround for General Inquiry was an Employee Center Core update set (`General Inquiry portal message suppression`, `ff1952ef084dc350b214e39a21c8b465`) that adds `new global.VEMessageUtil().clearPortalMessages()` after `hr_ServicesUtil.createCaseFromProducer(...)` in record producer `27c78de49f331200d9011977677fcfb3`. The helper must remain Global because `gs.flushMessages()` is blocked from scoped portal code such as `sn_hr_sp`.
- If that record-producer message clear does not remove the banner, move the clear later: an HR Core after-insert Business Rule on `sn_hr_core_case`, scoped to the General Inquiry HR service and ordered after the service-template/subflow rules, can run after the platform message is added. On 2026-05-30 this was captured as HR Core BR `Clear General Inquiry portal messages` in update set `General Inquiry HR case message suppression`.

## HR Case ACL Visibility Lesson

- In Vår Energi DEV on 2026-06-23, `sys_security_acl_role` stores the required role in field `sys_user_role`, not `role`. When inspecting HR case ACL roles, query `sys_user_role`; the `sn_hr_core_case` read ACL `3a5370019f22120047a2d126c42e7005` requires `snc_internal`, which normal internal users such as Michal already have. HR case `GlideRecordSecure` probes that impersonate a user can still be misleading because HR Core read ACLs are also gated by security attribute `sn_hr_core__HrCoreImpersonateCheck`.

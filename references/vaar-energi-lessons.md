# Vår Energi ServiceNow Lessons

Created: 2026-05-19

Use this file before starting Vår Energi stories. It captures practical instance, update-set, and implementation lessons from live work with Simen.

## Instance Workflow

- Vår Energi stories are usually reviewed in PROD (`https://varenergiprod.service-now.com`) and implemented first in DEV/test (`https://varenergitest.service-now.com`, profile `other`).
- PROD access has been verified with the same credentials as profile `other` by passing `-Instance 'https://varenergiprod.service-now.com'` to the helpers. Use PROD read-only unless Simen explicitly requests a production change.
- For assigned story review in PROD, query `rm_story` assigned to `simen.knudsen@varenergi.no`. PROD user sys_id seen on 2026-05-19: `8ea85e6b29544f50ac341b4947cfc297`.
- Do not create `rm_story` records unless Simen explicitly asks. Treat PROD stories as source requirements and DEV update sets as the working delivery vehicle.
- When editing Vår Energi story fields, keep `description` as plain text with normal line breaks. Do not put HTML tags in `description`. HTML/list formatting is acceptable in `acceptance_criteria`, which is a rich-text field in the story form.

## DEV Context

- DEV profile is `other`; instance URL is `https://varenergitest.service-now.com`.
- Xplore is available in DEV after Xplore: Developer Toolkit 5.02 was installed. Prefer Xplore for compact read-only verification and constrained behavior checks.
- Current DEV API/Xplore user sys_id seen on 2026-05-19: `38c17f3fcc980310b214a0b7a2acbbef` (`simen.knudsen@varenergi.no`).
- The default user sys_id in `Set-ServiceNowUpdateSetContext.ps1` is not correct for Vår Energi DEV. Pass `-UserSysId '38c17f3fcc980310b214a0b7a2acbbef'`.
- Restore developer preferences after each implementation and remove local `.sn-pref-snapshot-*` files created for the story.

## Update Set Practice

- Create one update set per story and per application scope.
- Confirm update capture with `Get-ServiceNowUpdateSetSummary.ps1`.
- If update XML rows appear under `global`, inspect payload scope/package before doing anything else; earlier Document Templates work captured payloads with correct scoped app metadata even when update-row metadata needed cleanup.
- For HR Core story work, use scope/application `Human Resources: Core` (`sn_hr_core`, sys_id `d4ac3fff5b311200a4656ede91f91af2`).
- For Document Templates story work, use scope/application `Document Templates` (`sn_doc`). Resolve the app sys_id in the target instance before switching scopes.

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

STRY0010050 lesson: service-specific HR SLAs can overlap with generic base HR Case SLAs. A General Inquiry-specific 5 business day response SLA initially would also match the generic HR Case 4-hour and VIP 2-hour SLAs unless those generic start conditions exclude the specific HR Service.

Step-by-step:

1. Read the story from PROD `rm_story` and check `references/vaar-energi-design.md` for SLA wording. STRY0010050 mapped to design text: `HR General Inquiry SLA: 5 business days response time`.
2. Resolve the target HR Service in DEV, usually `sn_hr_core_service`, and confirm `service_table`. General Inquiry in DEV: sys_id `6628cde49f331200d9011977677fcf0b`, table `sn_hr_core_case`.
3. Inspect existing `contract_sla` rows for the target table and nearby COE tables. Capture `name`, `collection`, `type`, `target`, `duration`, `schedule`, `start_condition`, `stop_condition`, `pause_condition`, and scope/package.
4. Check `sys_choice` for `contract_sla.target` before setting target values. Response target uses stored value `response`.
5. Prefer the customer's existing HR schedule pattern unless the story says calendar days. For Vår Energi HR Core SLAs, the existing schedule is `8-5 weekdays excluding holidays` (`090eecae0a0a0b260077e1dfa71da828`), with one span Monday-Friday 08:00-17:00. Five business days on that schedule is 45 scheduled hours, stored as duration `1970-01-02 21:00:00`.
6. Create or reuse a story update set in the relevant scope, usually `Human Resources: Core` (`sn_hr_core`, sys_id `d4ac3fff5b311200a4656ede91f91af2`), and snapshot/restore preferences around the work.
7. Create the service-specific `contract_sla` with a short name that fits the field length. For General Inquiry, use:
   - `collection=sn_hr_core_case`
   - `type=SLA`
   - `target=response`
   - `duration=1970-01-02 21:00:00`
   - `schedule=090eecae0a0a0b260077e1dfa71da828`
   - `start_condition=active=true^hr_service=<service_sys_id>^EQ`
   - `stop_condition=active=false^EQ`
   - `pause_condition=sla_suspended=true^EQ`
   - `when_to_cancel=on_condition`
8. Prevent overlap. If generic table-level SLAs would also start for the service, update their start conditions to exclude the service, for example `hr_service!=<service_sys_id>`. Capture these changes in the same scoped update set when they are in the same application.
9. Runtime verification is required. Create a temporary case for the HR Service, query `task_sla`, and verify:
   - the intended SLA attached
   - generic conflicting SLAs did not attach
   - `planned_end_time` reflects the requested business/calendar target
10. Clean up temporary cases and `task_sla` rows. Avoid leaving test HR cases unless Simen asks to inspect them.
11. Confirm update capture with `Get-ServiceNowUpdateSetSummary.ps1`. For STRY0010050, a clean update set had three `SLA Definition` rows: the new service SLA plus two generic HR Case SLA condition updates, all in HR Core with no mixed scope.
12. Final response should include story interpretation, update set name/sys_id/scope, SLA definition details, overlap prevention, runtime verification result, cleanup, and restored preferences.

## Document Template Signing Date Lesson

- For HTML Document Templates (`sn_doc_html_template` / `sn_doc_template` type `HTML Template`), the ServiceNow signing date story is not solved by the form's `Insert Date` button.
- The `Insert Date` action inserts `${Date}` or target-table date/date-time fields via `sn_doc_field_tree`; it is not participant-aware and does not insert a signing-date token.
- STRY0010036 implemented automatic replacement of `${sign_date:<participant>}` when `${signature:<participant>}` is saved, using `signature_image.signed_on` and the template date format when available.
- Keep demo records unless Simen asks to clean them up; he wanted to inspect the demo data.

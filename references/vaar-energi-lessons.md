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

## Vår Energi Branded Notifications

- All Vår Energi HR email notifications should use email template `Vår Energi template` (`sysevent_email_template` sys_id `1462e7ca918a3010f877b1d70a4d6a3d` in DEV), linked to email layout `Vår Energi Layout` (`sys_email_layout` sys_id `9d3d6f8777823010f088a0e89e5a997f` in DEV).
- The shared `Vår Energi template` and `Vår Energi Layout` are delivered separately under PROD story `STRY0010119` and DEV update set `STRY0010119 - Vår Energi email template and layout` (`8eddad4475054350b214aab5f94fce00`) in `Employee Experience Foundation`. Do not include these shared records in later feature-specific notification stories.
- The `Vår Energi Layout` references logo attachment `VarEnergi_emailLogo.png` (`sys_attachment` sys_id `181c308821454f10d8cb70a2b1956a37` in DEV). Attachments may need separate migration/verification because ordinary update-set rows for the layout/template do not necessarily prove the binary attachment will be present downstream.
- Notification copy should be based on `references/vaar-energi-design.md`, especially the Vision & Validate section for HRSD.
- Interpret "view my notifications in ServiceNow, not on mail" as a content rule: email may alert the employee, but the user should open Employee Center/ServiceNow to see details and take action.
- Do not include agent comments, journal notes, or resolution detail in employee email bodies unless Simen explicitly asks. Provide a mail-script-generated link to the portal/case instead.
- Do not create inbound email actions for this pattern unless Simen explicitly requests them.
- Mail scripts must be content-only and contain no styling. Do not print inline CSS, button styles, colors, borders, font declarations, or layout styling from mail scripts. Put presentation in the email template and/or email layout. Simple structural formatting such as new lines, paragraphs, lists, and spacing is acceptable when a mail script prints repeated content.
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

## Document Template Signing Date Lesson

- For HTML Document Templates (`sn_doc_html_template` / `sn_doc_template` type `HTML Template`), the ServiceNow signing date story is not solved by the form's `Insert Date` button.
- The `Insert Date` action inserts `${Date}` or target-table date/date-time fields via `sn_doc_field_tree`; it is not participant-aware and does not insert a signing-date token.
- STRY0010036 implemented automatic replacement of `${sign_date:<participant>}` when `${signature:<participant>}` is saved, using `signature_image.signed_on` and the template date format when available.
- Keep demo records unless Simen asks to clean them up; he wanted to inspect the demo data.

# Incident Process Lessons

- Creating `sys_dictionary` fields on `incident` through the Table API can auto-place those fields on the default Incident form and capture `sys_ui_section` updates. If fields are automation-only, remove the generated `sys_ui_element` rows and delete unintended form-layout customer updates before delivery.
- `sysauto_script` inserts or patches through the Table API may not create `sys_update_xml` rows. After creating a scheduled script execution, verify update capture by `name=sysauto_script_<sys_id>`; if missing, run `Save-ServiceNowCustomerUpdate.ps1` or `new GlideUpdateManager2().saveRecord(grJob)` in the intended update set and confirm the customer update landed there.

## Incident On Hold Modal Pattern

Use this checklist when extending Incident On Hold behavior across UI16 and Service Operations Workspace.

1. Inspect the existing Incident state and hold reason model first.
   - `incident.state=3` is the normal On Hold state.
   - `incident.hold_reason` is the normal On hold reason field.
   - In Simen's PDI the OOTB active hold reason choices are:
     - `1 = Awaiting Caller`
     - `5 = Awaiting Change`
     - `3 = Awaiting Problem`
     - `4 = Awaiting Vendor`
   - Custom choices added for the Incident On Hold work:
     - `6 = Internal`
     - `7 = External`

2. Preserve all existing choices unless the user explicitly asks to restrict them.
   - Do not treat Incident like the RITM custom `u_on_hold_reason` field.
   - A UI16 `<g:ui_choicelist table="incident" field="hold_reason" />` naturally preserves table choices.
   - A Workspace `g_modal.showFields(...)` choice list is usually hardcoded, so include both OOTB and custom choices if the modal should mirror the field.

3. Use one shared client-callable Script Include for both channels.
   - Example: `IncidentOnHoldAjax.setOnHold`.
   - Validate record existence, `canWrite()`, and field write access for `state`, `hold_reason`, and `comments`.
   - Coerce the comment parameter before string methods:
     ```javascript
     var comment = this.getParameter('sysparm_comment');
     var commentText = comment ? String(comment) : '';
     ```
   - Validate `hold_reason` against active `sys_choice` rows for `incident.hold_reason`, not a hardcoded allowlist, unless the requirement is to allow only specific custom reasons.

4. UI16 implementation shape.
   - Client Script: onChange on `incident.state`, open `GlideDialogWindow` only when the new value is `3`.
   - UI Page: use hidden inputs for incident sys_id and previous state, `<g:ui_choicelist table="incident" field="hold_reason" />`, and a required comment textarea.
   - UI Page ACL: create a narrow read ACL for the modal page.
   - On cancel, revert `state` to the previous value. Use `g_scratchpad` for duplicate-dialog guards, not `window.<flag>`.

5. Workspace implementation shape.
   - Create records in the Incident Management for Service Operations Workspace app (`sn_sow_inc`, scope sys_id `49aff4bb733320103e366238edf6a70f`) unless inspection proves the target workspace uses another scope.
   - Use a Declarative Action Assignment with:
     ```text
     action_name = sow_incident_on_hold
     table = incident
     model = Form
     declarative_action_type = client_script
     form_position = action_bar
     button_position = right
     record_conditions = active=true^stateNOT IN3,6,7,8
     script_condition = current.canWrite() && current.state.canWrite() && current.hold_reason.canWrite() && current.comments.canWrite()
     write_access = true
     ```
   - Add a `sys_ux_form_action` pointing to the Declarative Action and a `sys_ux_form_action_layout_item` at a deterministic order such as `95`.

6. Verify with constrained temporary incidents.
   - Test at least one new custom reason, for example `7 = External`, and confirm `state=3`, `incident_state=3`, and `hold_reason=7`.
   - Be aware that platform Incident logic can normalize some OOTB reason/state combinations during scripted tests, especially `Awaiting Caller`; verify live behavior instead of assuming the value will persist exactly in every synthetic scenario.
   - Delete temporary incidents and confirm no `short_descriptionSTARTSWITHCodex temporary Incident On Hold` records remain.

7. Update set hygiene.
   - Use a Global update set for `sys_choice`, Script Include, UI Page, UI Page ACL, and UI16 Client Script.
   - Use a separate `sn_sow_inc` update set for SOW Incident action records, parented to the Global set when delivering together.
   - Confirm both update sets with `Get-ServiceNowUpdateSetSummary.ps1` and verify no mixed-scope rows.

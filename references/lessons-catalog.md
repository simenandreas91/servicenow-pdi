# Catalog Service Fulfillment Lessons

- Step-based catalog fulfillment starts on the catalog item: set `sc_cat_item.flow_designer_flow` to active global flow `Step based request fulfillment` (`sys_hub_flow.internal_name=step_based_request_fulfillment`). The active registry row is `sc_service_fulfillment_flow_registry.service_fulfillment_flow=<flow>`.
- Design-time stage records live in `sc_service_fulfillment_stage`. The catalog item reference field is `cat_item`, not `catalog_item`. Stages are ordered with `order` and are application files with `domain_master=cat_item`.
- Design-time step records live in `sc_service_fulfillment_step` and are children of a stage through `service_fulfillment_stage`. Required type pointer is `service_fulfillment_step_configuration`; `catalog_conditions` is a `variable_conditions` field. Blank conditions mean always applies.
- Step configurations live in `sc_service_fulfillment_step_configuration`. They define `name`, `order`, `producer`, `service_fulfillment_sub_flow`, and `dynamic_title`. Stock visible configs in the PDI are `Task`, `Custom approval`, and `Manager approval`.
- Use the correct extended table when a step type has fields. Task step: `sc_service_fulfillment_task_step` with `short_description`, `description`, `assigned_group`, `assigned_to`, `priority`, `include_variables`. Custom approval: `sc_service_fulfillment_approval_step` with `users`, `groups`, `approval_type`, `approval_title`. Manager approval can be base `sc_service_fulfillment_step`.
- `CatalogServiceFulfillmentStepUtil` backs the builder API. It calls `sn_sc.ServiceFulfillment.submitStepRecordProducer`, returns `stage_id`, `step_id`, `action_id`, `producer_id`, and derives `title` from `dynamic_title`, truncating to 200 chars.
- Runtime records are separate from design-time records. `sc_service_fulfillment_stage_data` stores per-request stage state, catalog item, task, order, and name. `sc_service_fulfillment_step_data` stores per-request step state, stage data, configuration, generated/related task, and subflow context.
- Example item `Bestilling av standard IT-utstyr` (`sc_cat_item=2a577c71c34b62106b68770d05013123`) is Global, active, category `IT`, and uses Step based request fulfillment. It has manager approval stage order `100` and task stage order `200`.
- RITM requester logic should not assume `caller_id`; `sc_req_item` uses `requested_for`, then `request.requested_for`, with `opened_by` as a fallback. `sc_req_item.state` inherits `task.state`, so table-specific choices can relabel inherited values such as `-5` without changing task-wide state semantics.
- For RITM UI Policies, always set `sys_ui_policy_action.table=sc_req_item` on action rows. A blank table can still make the policy fire, but dynamic show/hide may reinsert the field at the bottom of the classic form, especially around split layouts and `activity.xml`.
- RITM Variable Editor values are not embedded in the `sc_req_item` XML. The RITM formatter `com_glideapp_servicecatalog_veditor` renders `com.glideapp.servicecatalog.VEditor`; runtime values are `sc_item_option` rows linked to the RITM through `sc_item_option_mtom`. Do not add Business Rules to `sc_item_option`; ServiceNow documents it as internal. Record-producer target records use the default question editor and `question_answer` instead.
- For portal catalog cleanup, query active candidates with `active=true^hide_sp=false^visible_standalone=true^sc_catalogsISNOTEMPTY` and exclude named keepers by sys_id. Some `sc_cat_item_content` records can be found through GlideRecord on `sc_cat_item` but fail Table API PATCH by base-table sys_id; with the intended update set current, use a constrained exact-sys_id GlideRecord update and verify `sys_update_xml` capture.
- There is no proven OOTB property in the PDI to hide only empty variables from the RITM Variable Editor. For UI16/classic, the upgrade-safe pattern that worked is an additive Catalog Client Script on the catalog item with `type=onLoad`, `applies_catalog=false`, `applies_req_item=true`, and `applies_sc_task` only if catalog task behavior is desired. For a generic script, loop over `g_form.nameMap` and use each entry's `prettyName`; `g_form.getFieldNames()` is not available in this Variable Editor context, and `g_form.getEditableFields()` returns `ni.VE...` real names that can be read but do not hide correctly with `g_form.setDisplay()`. Check `g_form.getValue(prettyName)` and call `g_form.setDisplay(prettyName, false)` only when the value is blank/whitespace or an empty MRVS payload such as `[]`. Wrap per-field reads in `try/catch` so non-standard catalog fields do not break the script. A short delayed retry with `setTimeout` helps if classic rendering finishes after `onLoad`. This keeps OOTB formatter/UI macro code unchanged and avoids touching internal option tables.
- SOW Workspace does not load the classic VEditor script body or item-level Catalog Client Scripts in the page, even when `applies_req_item=true`. A table-level `sys_script_client` on `sc_req_item` does run in SOW and can hide variables by original variable name, but SOW does not expose `g_form.nameMap` to that script. The SOW-safe generic pattern is: client-callable Script Include receives the RITM sys_id, verifies `GlideRecordSecure('sc_req_item').canRead()`, queries `sc_item_option_mtom -> sc_item_option -> item_option_new`, returns the names whose option value is blank/whitespace or `[]`, and an `sc_req_item` onLoad client script calls it with GlideAjax then runs `g_form.setDisplay(variableName, false)` for each returned name. Keep any item-specific guard in the client script if the behavior should not apply to every RITM.

## Catalog Item Flow Designer Fulfillment

Use a Flow, not a subflow, when a catalog item should run directly from the Process Engine tab. The catalog item stores the selected flow in `sc_cat_item.flow_designer_flow`; resolve the item first and verify that field before editing any flow metadata.

Recommended discovery sequence:

1. Query the catalog item by exact name in `sc_cat_item`; capture `sys_id`, `flow_designer_flow`, `delivery_plan`, category, and active state.
2. Query `item_option_new` and `question_choice` for the item to understand variable names, stored values, and labels. In Flow Designer, the `Get Catalog Variables` action references these variables by sys_id/name.
3. Resolve the selected flow in `sys_hub_flow` by `sys_id`; check `name`, `internal_name`, `type`, `active`, `published`, `latest_snapshot`, and scope. For catalog item execution the flow `type` should be `flow`.
4. Inspect the flow trigger in `sys_hub_trigger_instance_v2`; service catalog triggers normally include inputs for the request item and requested catalog item context.
5. Inspect `sys_hub_action_instance_v2` for actions and `sys_hub_flow_logic_instance_v2` for if/else branches. Sort by `order`; use `parent` and `ui_id` to understand nesting.
6. Inspect the active snapshot equivalents as well as editable design records. Runtime can execute the published snapshot, so patching only the editable design record may not affect tests until the flow is republished.
7. Check `sys_flow_trigger_plan` for the flow/snapshot linkage when runtime behavior does not match design-time metadata.

Flow Designer action and logic instance `values` are often gzip-compressed base64 JSON. Decode them before reasoning about conditions or inputs, edit the JSON/text deliberately, then gzip/base64 encode the result and PATCH the same field. Do not do blind string replacement until the decoded content has been inspected and the target token is unique.

PowerShell helpers for decoding and encoding Flow Designer `values`:

```powershell
function Decode-GzipBase64([string]$b64) {
  $bytes = [Convert]::FromBase64String($b64)
  $ms = New-Object IO.MemoryStream(,$bytes)
  $gz = New-Object IO.Compression.GzipStream($ms,[IO.Compression.CompressionMode]::Decompress)
  $sr = New-Object IO.StreamReader($gz)
  return $sr.ReadToEnd()
}

function Encode-GzipBase64([string]$text) {
  $out = New-Object IO.MemoryStream
  $gz = New-Object IO.Compression.GzipStream($out,[IO.Compression.CompressionMode]::Compress)
  $sw = New-Object IO.StreamWriter($gz)
  $sw.Write($text)
  $sw.Close()
  return [Convert]::ToBase64String($out.ToArray())
}
```

Manager approval flow pattern that worked:

- Trigger: Service Catalog trigger for the target catalog item.
- Action 1: `Get Catalog Variables` for the current requested item.
- Action 2: `Ask For Approval` against `{{Service Catalog_1.request_item}}`, table `sc_req_item`, approval field `approval`, journal field `approval_history`, approver rule using `{{Service Catalog_1.request_item.requested_for.manager}}`.
- Approved branch: condition on Ask For Approval output `approval_state=approved`; update `sc_req_item` state to `2` (Work in Progress) and set assignment fields as needed.
- Rejected branch: condition on Ask For Approval output `approval_state=rejected`; update `sc_req_item` state to `4` (Closed Incomplete).

Important limitation: the OOTB Ask For Approval action may expose only `approval_state` as a clean flow output. The approver's rejection comment/reason is stored as journal data on the `sysapproval_approver` record, not as a convenient flow data pill. If the rejection reason must be copied onto the RITM, use a narrow Business Rule on `sysapproval_approver` after update when `state` changes to `rejected`:

- Guard to approvals whose `sysapproval` is an `sc_req_item` for the intended catalog item.
- Query the latest `sys_journal_field` where `element_id=current.sys_id` and `element=comments`.
- Append a short, readable rejection message to the RITM comments.
- Set `sc_req_item.state=4` and `approval=rejected` if the flow update might race or miss the field.

Update-set capture warning: Table API edits to Flow Designer child metadata such as action/logic instances may not create obvious customer updates. After changing a flow, confirm `sys_update_xml`. If the flow did not capture but the change is legitimate, force a customer update for the parent `sys_hub_flow` with `Save-ServiceNowCustomerUpdate.ps1`. Then confirm the update set contains both the flow parent and any supporting Business Rule/Script Include artifacts.

Runtime test sequence for catalog approval flows:

1. Submit the catalog item as a user who has a manager.
2. Wait for the flow context and `sysapproval_approver` row to be created for the generated RITM.
3. Approve the approval row and verify the RITM reaches Work in Progress (`state=2`), assignment fields are set, and `approval=approved`.
4. Submit another request, reject the approval with a clear comment, and verify the RITM reaches Closed Incomplete (`state=4`), `approval=rejected`, and the RITM comments include the rejection reason.
5. Check `approval_history`, `sys_journal_field`, and `sys_flow_context` if the visible RITM state does not match expectations.

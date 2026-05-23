# HRSD Lifecycle Event / Journey Designer

Use this for HR Services built through Lifecycle Event / Journey Designer. A manually exported sample update set, `Test HRSD lifecycle flow for Codex`, showed that these processes are mostly HRSD/Journey metadata, not raw Flow Designer metadata.

## Core Model

- Entry point HR Service: `sn_hr_core_service` with `fulfillment_type=journey`.
- Parent journey cases usually use `sn_hr_le_case`. Generated child HR Services should use the concrete COE case table that owns the work, such as Payroll, Total Rewards, Talent Management, Workforce Administration, or Operations. If the parent/child table choice is not already fixed, load `references/hrsd-coe-selection.md` before creating Journey metadata.
- Lifecycle definition: `sn_hr_le_type`.
- Visual journey configuration: `sn_jny_journey_config`.
- UI columns / stages: `sn_hr_le_activity_set`.
- Cards inside columns: `sn_hr_le_activity`.
- HR task backing templates: `sn_hr_core_template`.
- Field propagation between generated records: `sn_hr_le_activity_field_mapping`.
- Intake form: `sc_cat_item_producer`.
- Intake variables and choices: `item_option_new`, `question_choice`.
- Optional generated document/service support: `sn_doc_html_template`, secondary `sn_hr_core_service` with `fulfillment_type=simple`.

## Script Include Orientation

PDI inventory checked 2026-05-14 for the four main HRSD/Journey scopes. Use these as first stops before broad searches.

Counts:
- Journey designer (`sn_jny`): 63 Script Includes.
- Journey Accelerator (`sn_ja`): 36 Script Includes.
- Human Resources: Core (`sn_hr_core`): 127 Script Includes.
- Human Resources: Lifecycle Events (`sn_hr_le`): 36 Script Includes.

General pattern:
- Many customer-facing Script Includes wrap a read-only `*SNC` version. Prefer reading both before deciding whether behavior is intended to be overridden.
- Client-callable records usually end in `Ajax`, `AJAX`, or are explicit UI helpers. Server-side process logic is usually in non-client-callable utilities.

Where to look first:
- Journey creation/configuration: `sn_jny.jny_JourneyCreation`, `sn_jny.jny_JourneyConfigService`, `sn_jny.jny_JourneyConfigServiceAjax`, `sn_jny.jny_JourneyConfigManagerTables`.
- Journey template/stage/task metadata: `sn_jny.jny_JourneyTemplateUtils`, `sn_jny.jny_JourneyTemplateActivityUtils`, `sn_jny.jny_JourneyTemplateDetails`.
- Journey portal and progress display: `sn_jny.jny_JourneyPortalDetails`, `sn_jny.jny_journeyDetailsPageUtils`, `sn_jny.jny_JourneyProgressUtils`, `sn_jny.jny_UJEStateHandler`.
- Journey field mappings and HR case population: `sn_jny.jny_FieldMappingFromTables`, `sn_jny.jny_FieldMappingToTables`, `sn_jny.jny_HRPopulateCaseFields`.
- Leave of Absence producer/detail logic: `sn_jny.LeaveOfAbsenceUtil`.
- Offboarding knowledge transfer: `sn_jny.hrAIA_KnowledgeTransferUtils`, `sn_jny.KnowledgeTransferSearchUtils`, `sn_jny.KnowledgeTransferShareUtil`, `sn_jny.jny_KnowledgeTransferPortalDetails`.
- Lifecycle Event activity sets, activities, triggers, and builder logic: `sn_hr_le.hr_LEType`, `sn_hr_le.hr_ActivitySet`, `sn_hr_le.hr_ActivityUtils`, `sn_hr_le.hr_BuilderUtils`, `sn_hr_le.hr_ActivitySetTrigger`, `sn_hr_le.hr_TriggerUtil`, `sn_hr_le.HRActivitySetTableUtil`.
- Lifecycle Event flow activities: `sn_hr_le.hr_LEActivityFlow`.
- Lifecycle Event portal/case access: `sn_hr_le.hr_JourneyPortalUtil`, `sn_hr_le.hr_LECaseAccess`, `sn_hr_le.hr_EnterpriseAccess`, `sn_hr_le.hr_LERefQual`.
- Lifecycle Event logging and emails: `sn_hr_le.LifecycleEventLogger`, `sn_hr_le.LifecycleEventLoggerSNC`, `sn_hr_le.le_EmailUtil`.
- HR case creation from services/producers: `sn_hr_core.hr_ServicesUtil`, `sn_hr_core.hr_CaseCreation`, `sn_hr_core.hr_CaseCreator`, `sn_hr_core.hr_ProducerUtils`, `sn_hr_core.hr_ServiceConfigUtil`.
- HR case/task/template behavior: `sn_hr_core.hr_Case`, `sn_hr_core.hr_CaseUtils`, `sn_hr_core.hr_Task`, `sn_hr_core.hr_TemplateUtils`, `sn_hr_core.hr_ServiceTemplate`, `sn_hr_core.hr_ServiceTemplateBase`, `sn_hr_core.hr_ServiceActivityRecursionChecker`.
- HR assignment, approvals, criteria, and security: `sn_hr_core.hr_AssignmentAPI`, `sn_hr_core.hr_AssignmentUtil`, `sn_hr_core.hr_ApprovalUtil`, `sn_hr_core.hr_Criteria`, `sn_hr_core.hr_SecurityUtils`, `sn_hr_core.COESecurityDiagnosticsUtil`, `sn_hr_core.HRApprovalAccessUtils`.
- HR profile/user synchronization: `sn_hr_core.hr_Profile`, `sn_hr_core.hr_SysUser`, `sn_hr_core.hr_Synchronize`, `sn_hr_core.hr_UserToProfileMigration`.
- HR notifications/documents: `sn_hr_core.hr_EmailUtil`, `sn_hr_core.NotificationDeeplinkUtil`, `sn_hr_core.HRDocumentTemplateUtils`, `sn_hr_core.HRDocumentTemplateAjax`, `sn_hr_core.hr_PdfUtils`, `sn_hr_core.CaseCommentEmailNotificationHelper`.
- Journey Accelerator plan/stage/task logic: `sn_ja.ja_PlanUtils`, `sn_ja.ja_StageUtils`, `sn_ja.ja_TaskUtils`, `sn_ja.ja_ModelTaskUtils`, `sn_ja.ja_JourneyTemplateAjax`, `sn_ja.JAActivityConfigurations`.
- Journey Accelerator portal/security/calendar: `sn_ja.ja_JourneyPortalUtil`, `sn_ja.ja_PlanPortalUtils`, `sn_ja.ja_PortalUtils`, `sn_ja.ja_UJEInterface`, `sn_ja.ja_Security`, `sn_ja.ja_CalendarUtils`.

## Creation Order

1. Confirm the parent journey table and any child HR Service COE tables. Use `references/hrsd-coe-selection.md` when the COE, topic category/detail, or child service table is uncertain.
2. Create the intake record producer (`sc_cat_item_producer`) on the target HR case table, usually `sn_hr_le_case` for a journey parent or a concrete `sn_hr_core_case*` table for a child service.
3. Create producer variables (`item_option_new`) and choices (`question_choice`).
4. Create the base case template (`sn_hr_core_template`) used by the HR Service.
5. Create the lifecycle type (`sn_hr_le_type`).
6. Create the journey config (`sn_jny_journey_config`) linked to the lifecycle type.
7. Create the journey HR Service (`sn_hr_core_service`) linked to producer, template, lifecycle type, and journey config.
8. Create activity sets (`sn_hr_le_activity_set`) for each Lifecycle Event column.
9. Create activities (`sn_hr_le_activity`) inside each set.
10. Create any supporting HR templates, child HR services, document templates, catalog item references, or approval references.
11. Create activity field mappings (`sn_hr_le_activity_field_mapping`) for activities that generate cases, requests, or tasks.

Prefer cloning or templating a known-good sample before creating these from scratch. The UI writes many required defaults that are easy to miss.

## Key Fields

`sn_hr_core_service` journey service:
- `fulfillment_type=journey`
- `journey_config=<sn_jny_journey_config>`
- `le_type=<sn_hr_le_type or baseline leave type depending on UI>`
- `producer=<sc_cat_item_producer>`
- `template=<sn_hr_core_template>`
- `service_table=<target HR case table>`
- `topic_detail`, `badge`, `subject_person_access`, and header configs affect portal/HR display.

`sn_hr_le_type`:
- `event_type=hr_services`
- `display_activity_set=true`
- `title=<lifecycle name>`
- `sort_activities_by` controls activity ordering.

`sn_jny_journey_config`:
- `le_type=<sn_hr_le_type>`
- `name=<journey name>`
- `type=<Journey type such as Parental Leave of Absence>`
- manager/mentor fields control Journey UI behavior.

`sn_hr_le_activity_set`:
- `le_type=<sn_hr_le_type>`
- `title`, `display_title`, `display_order`
- `trigger_type=immediate` for columns that start immediately.
- `trigger_type=condition` with `condition_table` and `condition` for conditional columns.
- `trigger_type=other_activity_sets` with `activity_set_dependencies` for dependency-based columns.
- Conditional variables use encoded query syntax with variable sys_ids, for example `variables.<item_option_new_sys_id>IN100,80^EQ`.

`sn_hr_le_activity`:
- `activity_set=<sn_hr_le_activity_set>`
- `activity_type` commonly `approval`, `fulfiller`, or `employee`.
- `fulfiller_activity` determines the card kind: Approval, HR Task, HR Service, Catalog Item, Flow, etc.
- Set exactly one relevant target reference depending on type: `hr_template`, `hr_service`, `catalog_item`, `flow`, approvers/groups/users.
- `display_order` orders cards within a set.
- `wait_for_generated_tasks_to_complete` affects dependency/runtime completion behavior.

`sn_hr_core_template`:
- `table` is the record type generated by the activity, often `sn_hr_core_task` or an HR case table.
- `template` is an encoded field assignment string. For HR tasks, include fields such as `short_description`, `hr_task_type`, `state`, `assignment_group`, `task_support_team`, and parent-case user fields.
- Use functional, user-facing names and descriptions for HR templates. Do not include story/change numbers in `name`, `short_description`, `short_description_for_employee`, or generated HR task text.
- For simple HR task completion work, prefer the OOTB `hr_task_type=mark_when_complete` (`Mark When Complete`) over checklist task types unless the requirement explicitly needs checklist items.

`sn_hr_le_activity_field_mapping`:
- `activity=<sn_hr_le_activity>`
- `map_from=field` is common.
- `map_from_table=sn_hr_le_case` with `map_from_field` such as `subject_person` or `opened_for`.
- `map_to_table` and `map_to_field` target generated records such as `sn_hr_core_case`, `sc_request`, or `sn_hr_core_task`.

## Sample Patterns

Activity selection rule:
- Use `activity_type=approval` for native approvals. Do not model approval as an HR task.
- Use `activity_type=employee` plus `fulfiller_activity=HR Task` when the subject person, opened-for user, manager, mentor, or another employee-facing participant must complete a to-do.
- Use `activity_type=fulfiller` when HR, IT, Facilities, Payroll, Legal, or another support team must complete work, or when the activity should directly create a child HR Service, Catalog Item, Order Guide, Incident, Flow, or template-based record.
- Use `activity_type=notification` when the journey only sends email and no completion tracking is needed.
- Use `activity_type=flow` when the journey must run automation/integration logic through a published subflow with mapped inputs.
- Use `activity_type=content` when the journey should schedule informational content such as banners or guidance.
- Use `activity_type=activity_container` only when member activities in the same activity set need grouped sequencing/parallelization. Containers cannot contain other containers, and member activities cannot be moved out for standalone reuse.

Approval card:
- `sn_hr_le_activity.activity_type=approval`
- `fulfiller_activity=Approval`
- set `approvers` or approver groups/users.
- `approval_accept_option`, `approval_reject_option`, and missing approver behavior matter.
- For manager approval demos, prefer the OOTB approval selector such as `Subject person Manager` before custom script.
- Rejection comments are normally enforced by OOTB `Reject` UI Actions on `sysapproval_approver`; do not add a Business Rule just to require comments unless non-UI/API rejection paths must also be blocked.
- OOTB approval rejection logic raises events such as `approval.rejected`; HR also has `sn_hr_core.approval_rejected` and notification `HR Case Approval Rejected`. Inspect these before creating custom events or notifications.
- The OOTB HR rejection notification may send to `event.parm1` and may not include the manager's rejection comment. If the requirement is "email the subject person with the reason", a small additive notification/mail script that targets `subject_person` and reads the latest rejected `sysapproval_approver.comments` is usually cleaner than a Business Rule on approvals.
- For service-specific initial approval request emails, create an additive notification on `sysapproval_approver` triggered by event `approval.inserted`, with condition `state=requested` and a related-record condition/script that limits it to the target HR Service/Journey. Send to the `approver` field for manager/leader approvals.
- If the custom service-specific approval request email should replace the generic platform approval email for that approval, set its notification weight higher than OOTB `Approval Request` (for example custom `20` vs OOTB `10`). Verify in `sys_email` that the custom message is sent and the generic one is ignored for the same recipient/approval.

## Fast Path: Lifecycle Event With Manager Approvals

Use this path when the user asks for an HR Service/Lifecycle Event/Journey with manager or leader approval. The preferred shape is native Lifecycle Event approval activities, not Business Rules on `sysapproval_approver`.

1. Inspect a working demo journey first. In Simen's PDI, `Demo Manager Approval Journey` is the best approval reference. Read its HR Service, producer, lifecycle type, journey config, activity sets, and approval activity records before creating new metadata.
2. Identify and reuse the OOTB approval option when possible. For subject-person manager approvals, use `Subject person Manager` from `sn_hr_core_service_approval_option`. For field-based approvals, create or reuse a `sn_hr_core_service_approval_option` with `case_table=<case table>` and `approval_assign_to=<case field path>`, for example `u_new_department.dept_head`.
3. Split update sets by scope before writing. Journey/configuration records usually belong in `Journey designer` (`sn_jny`). Custom approval options belong in `Human Resources: Core` (`sn_hr_core`). Never leave a mixed-scope update set.
4. Build the intake first: record producer, variables, choices, and any case fields needed by approval options. If an approver must be resolved from a submitted variable, copy that value to a real case field in the producer script so the approval option can resolve from the case.
5. Create the HR Service as a journey service: `fulfillment_type=journey`, `service_table=sn_hr_le_case` unless a more specific parent table is required, plus producer, template, lifecycle type, and journey config.
6. Create branch-specific approval activity sets when only one approval path should run. Put the branch condition on the activity set, not only on the approval activities. For example, if the submitter role variable decides who approves, create one condition-triggered set for the incoming-manager approval path and one condition-triggered set for the outgoing-manager approval path.
7. Create approval activities with native fields:
   - `activity_type=approval`
   - `fulfiller_activity=Approval`
   - `approvers=<sn_hr_core_service_approval_option>`
   - `approval_accept_option=anyone` unless the requirement says otherwise
   - `approval_reject_option=resubmit` or the closest OOTB option that matches the desired Journey behavior
   - activity-level `condition` for branch-specific approvers, using encoded variable syntax such as `variables.<variable sys_id>=<value>^EQ`
8. For an outgoing/incoming manager split, avoid scripted approval generation if the UI model can express it:
   - If submitter is outgoing manager, route to the incoming manager by a case field path such as `u_new_department.dept_head`.
   - If submitter is incoming manager, route to the outgoing manager by `Subject person Manager`.
   - If the form accepts multiple employees with different managers, note the limitation if only one `subject_person` drives the native manager approval. Do not add Business Rules unless the user explicitly accepts scripted fan-out.
9. Be precise with dependent HR handling sets:
   - `Other Activity Sets` waits for all listed dependencies to reach an end state. Do not list two mutually exclusive condition-triggered approval sets as dependencies for a single HR handling set unless both will really complete.
   - `Combination` supports `and`/`or` across trigger categories such as date, condition, and dependencies, but the dependency list itself is still evaluated as a single dependencies-complete check. It is not a native "dependency A OR dependency B" fan-in.
   - If a single downstream set must start after either branch, an Advanced trigger script can do that, but that is custom code. The no-code OOTB pattern is usually two downstream HR handling sets, each dependent on its matching approval set, each creating the same HR task/template.
10. Remember `evaluation_interval` on `sn_hr_le_activity_set`. Condition and advanced triggers can wait for reevaluation when they are not true at initial evaluation. If the condition is based on immutable intake data, the initial evaluation should decide the path; do not rely on a later 4-hour reevaluation for core routing.
11. Create service-specific approval and rejection notifications only when the standard emails do not meet the wording/recipient requirement. Use additive notifications and mail scripts; do not use approval Business Rules just to change message text or include rejection comments.
12. Add catalog user criteria for visibility/access using existing criteria before creating new scripted criteria. For leaders/managers, look for an existing `Managers` user criterion. For HR access, look for existing HRSM/HRSP criteria that match the portal audience.
13. Add small catalog client behavior when the form must display derived reference data, such as department head. Prefer a catalog client script using `g_form.getReference()` over server-side approval logic. Verify `cat_variable` is bound to the `IO:<item_option_new sys_id>` value.
14. After Journey records are created, query for auto-created placeholder activity sets such as `Activity Set 1/2/3`. Delete unintended placeholder metadata and remove related `sys_update_xml` rows from the delivered update set.
15. Verify capture and behavior:
   - update-set summaries for every touched scope show `mixed_scope=false`
   - no story-named approval Business Rules exist
   - no story/change number appears in HR template names or generated task text
   - approval activities point to the intended approval options
   - branch conditions use the correct variable sys_ids and values
   - downstream HR handling sets depend only on the matching branch approval set unless an explicit Advanced trigger is approved
   - catalog criteria are attached to the producer
   - client scripts are bound to the intended variables
   - rejection notification reads the latest rejected approval comment when required
16. Restore developer preferences from the original snapshot before final handoff.

Useful reference records from the PDI:
- `Demo Manager Approval Journey` HR Service: `b6ba93efc33c435065eefdec0501316a`
- Demo approval activity: `8fba93efc33c435065eefdec05013185`
- Demo approver option `Subject person Manager`: `be5cd47a3b322200d901655593efc402`
- Approval option table: `sn_hr_core_service_approval_option`
- HR Task fulfiller activity config: `sn_hr_le_fulfiller_activity_config` `b09d36cfc3132200b599b4ad81d3aef5` (`HR Task`)

HR task card:
- `activity_type=fulfiller` or `employee`
- `fulfiller_activity=<HR Task config sys_id>`, not a display value. In the PDI use `b09d36cfc3132200b599b4ad81d3aef5`.
- `hr_template=<sn_hr_core_template>`
- Choose Employee vs Fulfiller by assignee, not by task type: employee-facing actors use Employee; support teams use Fulfiller.
- The selected HR template must have `table=sn_hr_core_task`, `parent_case_table=sn_hr_le_case` for journey parent tasks, and an encoded `template` containing `hr_task_type=<choice>` plus required type-specific fields.
- For simple manual acknowledgement, prefer `hr_task_type=mark_when_complete`; use `checklist` only when individual checklist items matter.
- For structured input, use `collect_Information` with `employee_form`; use `take_survey` only when a survey artifact is the desired output.
- For document collection, use `upload_documents`; for signing, use current `e_sign` with e-signature template config.
- For child work started from a to-do, use `hr_service`, `submit_catalog_item`, or `submit_order_guide` and consider `wait_for_generated_tasks_to_complete`.
- For integration/vendor-owned closure, use `action_url` only when an external/action URL process will auto-close the task.
- For manager-led Journey Accelerator plans, use `create_JA_plan`; do not substitute normal Lifecycle Event checklists when Journey Accelerator is the intended experience.
- When creating by Table API, include the correct `fulfiller_activity` on insert. If the saved activity displays a blank card type, delete/recreate it; patching `fulfiller_activity` did not repair bad PDI records reliably.

HR task template examples:
- Submit catalog item: `hr_task_type=submit_catalog_item^sc_cat_item=<sc_cat_item>`.
- Submit catalog item variable mapping: create `sn_hr_le_activity_field_mapping` with `map_from_table=sn_hr_le_case`, `map_from_field=<case field>`, `map_to_table=task`, `map_to_field=variables`, and `map_to_variable=<item_option_new>`. Use this to prefill a catalog variable from lifecycle data, for example `subject_person` into a `sys_user` reference variable.
- Collect input: `hr_task_type=collect_Information^employee_form=<sn_hr_core_employee_form>`.
- Checklist: `hr_task_type=checklist`.
- E-signature: `hr_task_type=e_sign^sn_esign_esignature_configuration=<sn_esign_configuration>`.
- Schedule meeting: `hr_task_type=meeting^meeting_subject=<text>^meeting_details=<html>^schedule_method=manual`.
- Mark complete: `hr_task_type=mark_when_complete`.
- Survey: `hr_task_type=take_survey^survey=<asmt_metric_type>`.
- Upload documents: `hr_task_type=upload_documents`.
- URL: `hr_task_type=url^url=<https URL>`.
- View video: `hr_task_type=view_video^url=<video URL>`.
- Auto-close integration: `hr_task_type=action_url^integrating_system=<vendor/system>`. In the PDI, creating arbitrary new `action_url` templates is blocked by Business Rule `Stop create update action_url task type`; reuse supported OOTB/vendor templates unless the integration setup explicitly permits creation.
- Journey Accelerator plan: `hr_task_type=create_JA_plan^auto_create_plan=false` for a manager-facing plan creation/review action.

Catalog item card:
- `activity_type=fulfiller`
- `fulfiller_activity=Catalog Item`
- `catalog_item=<sc_cat_item>`
- add `sn_hr_le_activity_field_mapping` from lifecycle case fields to `sc_request` fields, such as `subject_person -> requested_for`.
- Prefer this direct activity over HR task type `submit_catalog_item` when no person needs to review/launch the catalog request from a to-do.

HR service card:
- `activity_type=fulfiller`
- `fulfiller_activity=HR Service`
- `hr_service=<sn_hr_core_service>` for the generated child service/case.
- add mappings from lifecycle case fields to the generated HR case, such as `subject_person -> subject_person`, `opened_for -> opened_for`.
- Prefer this direct activity over HR task type `hr_service` when the child case should be created automatically as part of the lifecycle.

Flow activity card:
- `activity_type=flow`
- `fulfiller_activity=Flow`
- `flow=<sys_hub_flow subflow>`
- create `sys_hub_flow_input` records for the subflow inputs, for example a `reference` input `subject_person` to `sys_user`.
- add `sn_hr_le_activity_field_mapping` from the LE case to the subflow input, for example `map_from_table=sn_hr_le_case`, `map_from_field=subject_person`, `map_to_flow_input=<sys_hub_flow_input sys_id>`, and verify `valid=true`.
- The subflow can call a custom Flow Action (`sys_hub_action_type_definition`) containing a Script step. This keeps the Lifecycle Event visible and admin-owned while keeping integration logic in a scriptable Flow Action wrapper.
- Prefer Flow for automation and integrations, not for native approvals, simple emails, simple HR tasks, or content delivery.

## Fast Path: HRSD Flow Activity With Scripted Action

Use this path when Simen wants a Lifecycle Event activity to trigger integration-style scripted logic, similar to the FFI onboarding pattern.

Build shape:
1. Create the HR Service as `fulfillment_type=journey` with a record producer, HR template, lifecycle type, and journey config.
2. Create one or more `sn_hr_le_activity_set` records. For a simple demo, use one immediate set.
3. Create a published subflow in the same app/scope as the Journey work, usually `sn_jny`.
4. Create a custom Flow Action with a Script step. Put reusable integration logic here, not in a Business Rule on generated HR tasks.
5. Add the action instance to the subflow and map subflow inputs to action inputs.
6. Create a Flow activity: `sn_hr_le_activity.activity_type=flow`, `fulfiller_activity=Flow`, `flow=<subflow sys_id>`.
7. Create `sn_hr_le_activity_field_mapping` rows from the LE case to subflow inputs. For person-driven demos, map `sn_hr_le_case.subject_person` to a `subject_person` reference input and verify `valid=true`.
8. Compile the action/subflow before testing. Use `sn_fd.FlowAPI.getRunner().subflow('<scope>.<internal_name>').compile()` after metadata creation or script-step changes.

Implementation shortcuts:
- Prefer cloning a known-good manual Flow action/subflow update XML over hand-building all Flow Designer internals. Flow Designer metadata has snapshots, compressed values, variable records, action instances, and element mappings that are easy to miss.
- Use global Xplore for update-XML cloning or compressed Flow metadata work because scoped Xplore blocks `GlideUpdateManager2` and `GlideCompressionUtil`.
- When storing script-step source through Xplore, run `Invoke-ServiceNowXploreScript.ps1` with `-NoFixGsLog`; otherwise literal `gs.info(...)` inside the stored script can be rewritten to Xplore's log shim.
- After `GlideUpdateManager2.loadXML(...)`, force-capture the top action and flow records with `Save-ServiceNowCustomerUpdate.ps1`; do not assume Flow Designer metadata lands in the intended update set.
- Watch for automatic `sn_hr_le.activity_status_flow_ids` changes. Capture that system property in a separate Human Resources: Lifecycle Events update set so the Journey Designer update set remains single-scope.
- Creating Journey services/activities programmatically may auto-create placeholder activity sets or blank invalid flow mappings. Re-query and remove unintended placeholder metadata and related `sys_update_xml` rows before delivery.

Testing sequence:
1. Direct action test:
   `sn_fd.FlowAPI.getRunner().action('<scope>.<action_internal_name>').inForeground().withInputs(...).run().getOutputs()`
   Confirm expected outputs and the Script step log.
2. Direct subflow test:
   `sn_fd.FlowAPI.getRunner().subflow('<scope>.<subflow_internal_name>').inForeground().withInputs(...).run()`
   If the context completes without running the action, compile the subflow and retest.
3. HRSD wrapper test in `sn_hr_le` scope:
   `new sn_hr_le.hr_LEActivityFlow().generateFlowActivity(parentCase, activity, true)`
   Confirm it returns a `sys_flow_context`, the context completes, and the Script step log appears.
4. Producer/API test:
   Submit with `/api/sn_sc/servicecatalog/items/<producer_sys_id>/submit_producer` and confirm the HR case is created. In the PDI, producer/API tests can create the case without visible lifecycle activity status rows, so use the HRSD wrapper test as the reliable proof that the Flow activity mapping and launch path work.

## Verification

- After creating records, inspect `sys_update_xml` for all touched scopes; Journey Designer records usually use the Journey designer scope/package (`sn_jny` display) even when related catalog/HR records are present.
- Open the Lifecycle Event UI and verify the visual board: activity set order, trigger labels, card order, card badges, and target type labels.
- Submit a test HR service from the portal/UI and verify generated HR case, activity sets, tasks, approvals, child services, requests, and field mappings.
- For HR Task card demos, verify every activity in the set has `fulfiller_activity` display value `HR Task`, points to the intended `hr_template`, and the template's encoded `hr_task_type` matches the desired experience.
- For `submit_catalog_item` HR tasks, verify both request-field mappings and catalog-variable mappings. Catalog variables use `map_to_field=variables` plus `map_to_variable=<item_option_new>`, not only `map_to_field`.
- Clean up test cases, requests, tasks, approvals, and generated child records; keep metadata update sets.

## Lessons Learned

- `sn_jny` scoped Xplore blocks some reflection helpers such as `getFields()`. Use global Xplore for schema exploration or query `sys_dictionary` with explicit fields.
- In the PDI demo data, Xplore can fail to see imported HRSD/Journey records that are readable through Table API by exact `sys_id`. For HRSD metadata study, prefer Table API graph reads first and use Xplore only as a secondary behavior check.
- `sn_hr_le_activity` inherits user-facing `title` from `sn_hr_le_activity_base`; the card sequence field is `order_number`, not `display_order`. Activity sets use `display_order`.
- Activity field mappings have a `valid` flag. Several baseline/demo Journey mappings point to generic targets such as `sn_hr_core_case` or request fields and show `valid=false`; do not clone those blindly. For new build work, map to the concrete generated table/field or variable/flow input and verify `valid=true` where the platform supports validation.
- Record producers for Journey HR Services commonly do more than call the generic case creation utility. Examples from the PDI demos: New Hire calls `sn_hr_le.hr_ActivityUtils().createCaseFromProducer`; Parental Leave also creates and links a Leave of Absence detail record through `sn_jny.LeaveOfAbsenceUtil`; Voluntary Separation updates the subject person's HR profile `employment_end_date` from the producer variable.
- Date-triggered Journey sets can target related fields, not only direct case fields. Demo examples include `subject_person_job.job_start_date`, `leave_of_absence.first_day_of_leave`, and `leave_of_absence.estimated_last_day_of_leave`.
- Creating `sn_hr_core_service` and `sn_hr_le_activity` with server-side GlideRecord can fail with an empty `getLastErrorMessage()`. Prefer Table API `POST/PATCH` for these records, then verify capture in the Journey Designer update set.
- HR templates (`sn_hr_core_template`) can have scope/visibility differences between global and `sn_jny`; if a read path is inconsistent, verify by sys_id and use the creation path that captures in the active Journey Designer update set.
- Creating a journey service can auto-create placeholder `Activity Set 1/2/3` records. Delete unintended placeholder activity sets and their `sys_update_xml` rows before delivery.
- For HR Service activity field mappings, map to the concrete generated case table, for example `sn_hr_core_case_total_rewards`, not generic `sn_hr_core_case`, when the child HR service uses an extended HR case table.
- A failed Table API mapping create can still insert a record before returning a validation error. Always re-query the target mapping table and remove duplicates or invalid generic-table mappings.
- Record producer runtime tests through `sn_sc.CartJS().orderNow()` may create the HR case and then throw a request-context null pointer in Xplore. Treat the error as non-fatal only after re-querying the generated case, journey context, activity set contexts, tasks, and approvals.
- If Lifecycle Event activity sets need date milestones based on intake variables, copy the intake date into real HR case date fields in the producer script. Date triggers should point to normal fields such as `first_day_of_leave`; variables in `payload` are not good date trigger fields.
- Date-triggered activity sets do not reliably use the activity set `condition` as a gate. Put conditional logic on the activities inside the date-triggered set; if the condition is false, the set can launch and finish without creating tasks.
- Producer/API tests can create an HR LE case, approval, or HR task even when Lifecycle Event activity set contexts fault. Do not mark an end-to-end LE test as passed until `sn_hr_le_activity_set_context`/activity statuses and Flow context logs show the expected non-faulted progression.
- For end-to-end lifecycle tests, use one current/future-date case to verify awaiting date milestones, one old-date positive case to verify date milestones launch, and one old-date negative case to verify activity-level conditions suppress task creation.
- Manual PDI update set `Flow desinger Action test` showed the cleaner FFI-style Flow path: Journey activity `Activity SubFlow test` (`sn_hr_le_activity`) in Pre-Hire uses `activity_type=flow`, `fulfiller_activity=Flow`, and points to published subflow `Subflow test`; an activity field mapping maps `sn_hr_le_case.subject_person` into the subflow input `subject_person`; the subflow has a single action instance calling custom action `Script test`; that action has a `subject_person` input, an `output_test` string output, and a Script step. Adding the Flow activity also updated `sn_hr_le.activity_status_flow_ids` in the HR Lifecycle Events scope; treat that property as an automatic platform side effect and watch for mixed-scope update-set capture.
- For record-producer submissions through API, use `/api/sn_sc/servicecatalog/items/<producer_sys_id>/submit_producer`; `/order_now` can return a 500 for producers. In this PDI, `submit_producer` created the New Hire LE case, but the HR Activity Set Launcher completed without creating activity set contexts/tasks for that demo case, so verify runtime generation separately before relying on producer API tests as full Journey end-to-end proof.
- For Flow activity demos, the clean working shape is: Journey HR Service -> Lifecycle Event -> one `sn_hr_le_activity_set` -> one `sn_hr_le_activity` with `activity_type=flow`, `fulfiller_activity=Flow`, and `flow=<published subflow>` -> valid `sn_hr_le_activity_field_mapping` from `sn_hr_le_case.subject_person` to the subflow `subject_person` input -> subflow action instance -> custom action Script step. The HRSD wrapper can be tested directly with `new sn_hr_le.hr_LEActivityFlow().generateFlowActivity(parentCase, activity, true)` in the `sn_hr_le` scope; it should return a `sys_flow_context` and the context should complete.
- When cloning Flow Designer action/subflow metadata from update XML, global Xplore is required for `GlideUpdateManager2` and compression helpers such as `GlideCompressionUtil`; scoped Xplore blocks those APIs. After `loadXML`, force-capture the action and subflow top records with `Save-ServiceNowCustomerUpdate.ps1` because Flow metadata does not always land in the intended update set automatically.
- Be careful when writing script-step source through Xplore. The Xplore helper's default gs-log fix can rewrite literal `gs.info(...)` text inside strings to `global.snd_Xplore.gsinfo(...)`; pass `-NoFixGsLog` for mutation scripts that store Flow action script text.
- After changing Flow action script variables or cloned Flow metadata, compile before runtime testing. `sn_fd.FlowAPI.getRunner().subflow('<scope>.<internal_name>').compile()` refreshed the subflow plan in the PDI; before compile, the subflow could complete without executing its action instance even though the action itself ran directly.
- Flow activity testing in this PDI needed layered checks: direct action execution proved the Script step and output, direct subflow execution proved the action instance fired after compile, and `hr_LEActivityFlow.generateFlowActivity(parentCase, activity, true)` proved the Lifecycle Event Flow activity wrapper could map case fields and start the subflow. Full producer submission still created a case without visible activity set/status rows, so do not use producer API alone as proof of Lifecycle Event activity execution.
- Approval rejection lesson from 2026-05-18 PDI demo: for an HR Service/Journey approval activity where manager rejection should notify the subject person with a reason, start by inspecting `sysapproval_approver` UI Actions, `approval.rejected`, `sn_hr_core.approval_rejected`, and OOTB notification `HR Case Approval Rejected`. The better OOTB-first design is usually: keep OOTB reject/comment behavior, add only a targeted notification or mail script if the OOTB HR email lacks `subject_person` recipient logic or comment text. Use a Business Rule only when enforcing rejection comments outside normal UI paths or queuing a custom event is explicitly required.
- 2026-05-23 HR Task activity demo in the PDI confirmed the working Table API shape: create `sn_hr_core_template` rows in Journey Designer with `table=sn_hr_core_task`, `parent_case_table=sn_hr_le_case`, assignment fields, and encoded `template`; then create Employee/Fulfiller `sn_hr_le_activity` rows with `fulfiller_activity=b09d36cfc3132200b599b4ad81d3aef5` and `hr_template=<template>`. A wrong `sn_hr_le_fulfiller_activity_config` sys_id inserted activities whose card type displayed blank, and PATCH did not correct them; delete/recreate was required.
- The same demo created valid HR Task activities for `submit_catalog_item`, `collect_Information`, `checklist`, `e_sign`, `meeting`, `mark_when_complete`, `take_survey`, `upload_documents`, `url`, `view_video`, `action_url` via an OOTB CIC Plus template, and `create_JA_plan`. `hr_service` and `submit_order_guide` were skipped in that demo because they need suitable child service/order-guide setup and field mappings to be meaningful.
- OOTB catalog-variable mappings confirm the pattern for catalog-backed lifecycle activities: `map_to_table=task`, `map_to_field=variables`, and `map_to_variable=<item_option_new>`. Example inspected in the PDI: activity `Reclaim Assets` maps `sn_hr_le_case.subject_person` to a catalog variable `Requested for` and is marked `valid=true`.

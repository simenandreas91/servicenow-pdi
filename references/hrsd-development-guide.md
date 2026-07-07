# HRSD Development Guide

Use this as the first compact model guide for HRSD HR Service, Lifecycle Event, Journey Designer, activity, and HR task-template work. PDI metadata and OOTB examples inspected 2026-05-18.

## Key Tables

| Concept | Table | Notes |
| --- | --- | --- |
| HR Service | `sn_hr_core_service` | Employee-facing service. Key fields: `name`, `value`, `fulfillment_type`, `service_table`, `template`, `producer`, `topic_detail`, `hr_criteria`, `le_type`, `journey_config`, `flow`. |
| Lifecycle Event type | `sn_hr_le_type` | Journey/Lifecycle definition. Key fields: `title`, `event_type`, `display_activity_set`, `sort_activities_by`, `active`. Active PDI examples include Onboarding, Offboarding, Parental Leave, and custom Simen demos. |
| Journey configuration | `sn_jny_journey_config` | Visual Journey Designer config linked from `sn_hr_core_service.journey_config` and `sn_hr_le_type`. |
| Activity Set | `sn_hr_le_activity_set` | Stage/column under a Lifecycle Event. Key fields: `le_type`, `title`, `display_title`, `display_order`, `trigger_type`, trigger date/table/field, dependencies, condition table/condition, display booleans. |
| Activity | `sn_hr_le_activity` | Card inside an Activity Set. Key fields: `activity_set`, `title`, `activity_type`, `order_number`, `owning_group`, plus exactly one target pattern such as approval fields, `hr_template`, `hr_service`, `catalog_item`, `order_guide`, `flow`, `email_template`, or `plan_type`. |
| HR Template | `sn_hr_core_template` | Template record used by HR Services and HR activities. For HR tasks, it normally has `table=sn_hr_core_task`, `parent_case_table`, `assignment_type`, assignment/due-date fields, and an encoded `template` containing `hr_task_type` plus type-specific fields. |
| HR Task runtime | `sn_hr_core_task` | Generated to-do/task table. `hr_task_type` controls the task experience. Type-specific fields include `hr_service`, `sc_cat_item`, `order_guide`, `employee_form`, `survey`, `url`, `hr_task_document`, `meeting_*`, `integrating_system`, and Journey Accelerator plan fields. |
| Activity field mapping | `sn_hr_le_activity_field_mapping` | Maps parent case fields to generated cases, tasks, requests, or Flow inputs. Verify `valid=true` when the platform supports validation. |
| HR Criteria | `sn_hr_core_criteria` | HRSD wrapper for eligibility/audience rules. Often points to `user_criteria`; used on HR Services and some activity logic. PDI examples include Employees Only, New Hire, Office Based Employees, and US Employees - Tax forms Collection. |
| Topic category/detail | `sn_hr_core_topic_category`, `sn_hr_core_topic_detail` | Service taxonomy. Must align with the selected COE/service table; see `references/hrsd-coe-selection.md`. |
| Document Template | `sn_doc_template`, extended by `sn_doc_html_template` | HTML/PDF document template metadata. For HRSD demos, prefer HTML templates (`sn_doc_html_template`) with `table=<HR case table>`, `html_script_body`, language, page settings, and optional header/footer image fields. |

## HR Service Additional Information

The **HR Service Additional Information** section on `sn_hr_core_service` controls service-specific information on the HR case form after a case exists. It is not the same as the Employee Center/record producer intake form, and it does not create fields by itself.

- `service_table_fields` is a `field_list` against the HR service's `service_table`. Use it when a field already exists on the HR case/COE table and should appear only for this HR service, such as `benefit_provider`, `document_template`, or a dot-walked field like `subject_person_hr_profile.employment_end_date`.
- `subject_person_related_lists` is a glide list of `sys_relationship` records. Use it when agents need a subject-person-specific related list on this HR service's cases, such as benefits, direct deposit, retirement, or similar profile data related lists.
- These fields drive OOTB Classic/UI16 HR case display logic: display Business Rule `Scratchpad: Show HR Service Fields` reads the service's `service_table_fields` and `subject_person_related_lists`; UI policies `Show HR service fields on load - HR Case` and `Show HR service fields on load - LE Case` show fields based on case table scope; client script `Show HR service fields` responds when `hr_service` changes.
- Add the selected fields and related lists to the relevant COE case form layout first. HR Service Additional Information only tells the UI which of those configured fields/lists to show for the selected service; it does not add them to the form layout.
- If a selected field appears on every HR case instead of only this service, add it to the OOTB `Hide HR service fields and related lists` UI policy actions so it is hidden by default and then shown back by the service-specific logic.
- Scope matters. The OOTB scratchpad logic groups fields by dictionary scope and table hierarchy; fields in Global, the service table's scope, or inherited HR Core fields are handled. Cross-scope fields that are not inherited by the service table may not be controlled automatically.
- Do not use this tab for initial intake questions. For Employee Center intake, use record producer variables. For HR agent case creation before the case exists, use `case_creation_service_config`. If a producer answer must become a case field, map/copy it into a real case field, then optionally expose that field through `service_table_fields`.

## Record Producer Case Description Population

PDI research on 2026-07-06 found two OOTB record producer script patterns:

- Normal HR Services use `new sn_hr_core.hr_ServicesUtil(current, gs).createCaseFromProducer(producer, cat_item.sys_id);`. In the PDI, 42 active/inactive HR producer scripts with `createCaseFromProducer` use this line, mostly Employee Center Core producers on concrete COE tables such as Payroll, Operations, Workforce Administration, and Total Rewards.
- Journey/Lifecycle Event HR Services use `new sn_hr_le.hr_ActivityUtils().createCaseFromProducer(current, producer, cat_item.sys_id);`. In the PDI, 7 producer scripts use this line, mostly Journey Designer producers on `sn_hr_le_case` plus the OOTB Parental Leave demo. `hr_ActivityUtils.createCaseFromProducer` is a thin wrapper that delegates to `new sn_hr_core.hr_ServicesUtil(current).createCaseFromProducer(producer, recordProducerId)`.

Use the Journey/Lifecycle line for new HR Services when `sn_hr_core_service.fulfillment_type=journey`, the intake is backed by Lifecycle Event/Journey Designer metadata, or the service must create a Journey context. Use the Core line for simple/non-journey HR Services. Do not mix them only to change description behavior; both paths rely on the same Core `hr_ServicesUtil` and `hr_CaseUtils` logic for the question/answer output.

The generated question/variable output path is:

1. `hr_ServicesUtil.createCaseFromProducer(producer, rpId)` finds the active `sn_hr_core_service` whose `producer` equals the record producer sys_id.
2. `_getProducerQuestions(producer, rpId)` uses `global.HRSecurityUtils().getRelevantVariablesForCatItem(rpId)`, reads submitted values from `producer['IO' + variable.id]`, resolves display values for references, list collectors, choices, dates, date-times, and MRVS rows, then creates question objects through `hr_CaseUtils.getQuestion(...)`.
3. `hr_CaseUtils.populateCase(service, questions, 'self_service')` sets service/topic/template fields, subject/opened-for/profile/payload/common case fields, and calls `_setCommonFields(...)`.
4. `_setCommonFields(...)` assigns:
   - `current.description = this._getSimpleDescriptionFromAnswers(questions, serviceValue)`
   - `current.rich_description = this._getDescriptionFromAnswers(questions, serviceValue)`
5. `_getDescriptionFromAnswers(...)` starts with existing `current.description` converted from newlines to `<br>`, then appends `_getDetailsFromAnswers(..., RICH_DESCRIPTION_FIELD)`. The appended block begins with `The following fields have been provided:` and then `Question: answer` pairs separated by `<br/><br/>`. Non-HTML variable answers are HTML-escaped; HTML variable type `23` is not escaped by that OOTB path.

For a one-off service-specific static intro, keep the OOTB call and prepend controlled static content after it runs:

```javascript
(function () {
  current.opened_for = gs.getUserID();
  current.subject_person = gs.getUserID();

  new sn_hr_le.hr_ActivityUtils().createCaseFromProducer(current, producer, cat_item.sys_id);

  prependRichDescription(
    '<p><strong>Before HR starts processing:</strong></p>' +
    '<p>This request will be reviewed against the approved staffing plan.</p>'
  );

  function prependRichDescription(introHtml) {
    if (!introHtml) return;
    var existing = current.getValue('rich_description') || '';
    current.setValue('rich_description', introHtml + (existing ? '<br/><br/>' + existing : ''));
  }
})();
```

Use the Core call in the same shape for non-journey services. If the intro includes any dynamic value, escape it first with `GlideStringUtil.escapeHTML(String(value || ''))`. If plain `description` must mirror the same intro for integrations/reporting, prepend plain text to `current.description` as well; do not put HTML into plain `description` unless the target field/use case expects it.

For many services or if business-owned intro text should be centrally maintained, prefer an additive implementation of extension point `sn_hr_core.HRPopulateCaseFields` over copying custom snippets into many record producers. That extension point runs after `hr_CaseUtils` builds `description` and `rich_description`; the Journey plugin already uses it through `sn_jny.jny_HRPopulateCaseFields` to create the Journey context. A custom implementation should:

- implement `handles(hrService)` to match only intended services, preferably by stable service sys_id or `value`.
- implement `setFields(hrService, hrCase)` to prepend controlled static HTML to `hrCase.rich_description`.
- be registered in `sys_extension_instance` with `point=sn_hr_core.HRPopulateCaseFields`, `script_include=<custom include>`, active, and an order that does not conflict with OOTB Journey population.
- avoid user-provided HTML and avoid changing OOTB `hr_CaseUtils`/`hr_ServicesUtil`.

Do not use **HR Service Additional Information** for this. It controls service-specific fields/related lists on the HR case form after creation, not intake description rendering. Do not rely on the HR case template's `description`/`rich_description` for this prepend behavior either: the OOTB `Apply Template (before)` Business Rule runs after the producer script during insert and only fills blank fields, so it does not reliably seed the generated question output and can be confusing when combined with producer-generated descriptions.

## How Lifecycle Event Activities Work

- An HR Service with `fulfillment_type=journey` points to a Lifecycle Event type (`le_type`), Journey config (`journey_config`), intake producer, and HR template.
- The Lifecycle Event type owns ordered Activity Sets. Activity Sets are stages/columns and launch by trigger type: immediate, date, other activity sets, condition, advanced script, combination, or rescind.
- Activities are cards inside Activity Sets. `activity_type` chooses the broad behavior; the target fields choose the concrete generated artifact.
- Employee/Fulfiller activities that create to-dos usually point to an HR Template. The HR Template creates an `sn_hr_core_task` and the template's `hr_task_type` controls the portal/workspace experience.
- Fulfiller activities can also launch child HR Services or catalog items directly through `hr_service`, `catalog_item`, or `order_guide`.
- Flow activities point at `sys_hub_flow` subflows and need field mappings from the parent case into subflow inputs.
- Notification activities use `sn_hr_core_email_content` email content plus recipient fields/users/groups on the activity.
- Activity sets and activities both have conditions. In the PDI, date-triggered activity-set conditions are not reliable gates by themselves; put conditional logic on activities when suppression matters.

## Activity Set Trigger Types

Activity Sets are Lifecycle Event stages. The trigger type controls when the stage's activities become available; `display_order` only controls visual order and does not control timing. Official ServiceNow docs describe these trigger methods as immediate, date, other activity sets, advanced script, condition, and combination. In the PDI, `sn_hr_le_activity_set.trigger_type` also has a `rescind` choice for rescind handling; treat that as a dedicated rescind-process pattern, not a normal stage trigger.

Decision guide:

| Trigger type | Value | Use when | Key fields / notes |
| --- | --- | --- | --- |
| Immediate | `immediate` | The first stage should launch as soon as the Lifecycle Event case is created/ready. Good for intake review, initial approval, welcome/pre-hire tasks, and simple demos. | Usually no trigger-specific fields. Keep only one or a few immediate sets unless parallel work is intentional. |
| Date | `date` | Work is tied to a real milestone date, such as job start date, first day of leave, estimated return date, employment end date, or 30/60/90-day check-in. | `trigger_table`, `trigger_field`, `ignore_empty_date`, `date_offset_type=before|after`, `date_offset_quantity`, `date_offset_units=days|weeks|months`. Date fields can be related paths such as `subject_person_job.job_start_date`. |
| Other Activity Sets | `other_activity_sets` | A stage must wait until one or more earlier stages finish, such as HR processing after manager approval or return-to-work tasks after confirm-return. | `activity_set_dependencies` is a glide list of prerequisite activity sets. The dependency list is AND-style: all selected sets must complete. |
| Advanced | `script` | OOTB Date/Condition/Dependency logic cannot express the rule, for example manager exists, date elapsed, and specific sets completed, or a custom business state must be checked. | `trigger_script` returns true/false. The script receives `parentCase` and `hrTriggerUtil`. Prefer this only when no-code triggers cannot model the requirement. |
| Condition | `condition` | The stage should launch when fields on an HR case/profile table match an encoded condition, such as case state, lifecycle variables copied to fields, location, employee type, or employment end date. | `condition_table`, `condition`, and `evaluation_interval`. For faster checks, use the `check_activity_set_trigger` event pattern instead of lowering the interval. |
| Combination | `combination` | The stage needs Date, Other Activity Sets, and/or Condition together, such as "after approval AND five days before leave" or "date OR condition" where the UI supports it. | Same fields as Date/Condition/Dependencies plus `combination_type=and|or`. Use carefully; dependencies inside `activity_set_dependencies` still behave as all selected dependencies complete. |

Trigger timing notes:
- When a Lifecycle Event case moves to Ready, HR Activity Launcher evaluates activity sets; activities only launch when the set's trigger condition is met.
- Non-immediate trigger checks can wait for the `evaluation_interval`, which defaults to four hours (`0 04:00:00` / display `4 Hours` in the PDI).
- Do not reduce the global/default evaluation interval casually. ServiceNow warns that frequent updates can cause activity sets to cancel before completion. Use the `check_activity_set_trigger` workflow event from a Business Rule/event/scheduled job when a condition should be reevaluated immediately.
- The `check_activity_set_trigger` event works for condition/script/date-style reevaluation, but not for sets triggered immediately or only by other activity sets.
- Changing trigger type, audience, or adding activities affects only activity sets/cases that have not already triggered. Existing generated activities are not rebuilt automatically.

## Activity Types

Use this decision ladder before creating a Lifecycle Event activity:

1. If a decision must approve/reject or gate downstream work, create an **Approval** activity.
2. If the activity is only communication with no completion tracking, create a **Notification** activity for email or a **Content** activity for scheduled informational content.
3. If the activity must run automation, integration, provisioning, or reusable logic, create a **Flow** activity backed by a published/compiled subflow.
4. If a human must do something, choose **Employee** when the actor is the subject person, opened-for user, manager, mentor, or another employee-facing participant. Choose **Fulfiller** when the actor is HR, IT, Facilities, Payroll, Legal, or another support team.
5. For Employee/Fulfiller human work, use **HR Task** plus an HR task template when the result is a to-do. Use **HR Service**, **Catalog Item**, or **Order Guide** when completion should create a formal child case/request.
6. Use **Activity container** only when multiple activities inside the same activity set must be grouped and ordered together. Prefer normal activity sets for major journey stages.

| Activity type | Value | Use when | PDI examples / notes |
| --- | --- | --- | --- |
| Approval | `approval` | A manager, group, or HR approval must block or govern downstream work. | Use `approvers`, `approver_users`, or `approver_groups`; tune `approval_accept_option`, rejection behavior, missing approver behavior, and `wait_for_generated_tasks_to_complete`. OOTB example: Manager approval. |
| Employee | `employee` | The subject person, opened-for user, manager, or another employee-facing actor must complete a to-do. | Usually points to an HR Template with `assignment_type=Employee`; examples include benefit enrollment, surveys, videos, uploads, and manager checklists. |
| Fulfiller | `fulfiller` | HR, IT, facilities, payroll, or another support team must complete work or create a child case/request. | Use HR Template for an HR task, `hr_service` for child HR case, or `catalog_item`/`order_guide` for request work. Examples: Background Check, Setup Email, Confirm Final Payroll. |
| Notification | `notification` | The journey should send a lifecycle email without creating a work item. | Use `email_template`, recipient fields/users/groups, and optional availability offsets. Examples: Parental Leave Request Received, Final Exit Email. |
| Flow | `flow` | The activity should run automation/integration logic that is better owned in Flow Designer/subflow. | Point `flow` to a published subflow and create valid activity field mappings for inputs. PDI examples include Account Setup and Notification Subflow and Simen flow demos. |
| Content | `content` | The journey needs display-only content, banner, guidance, or informational material. | PDI example: Separations Banner. Use for read-only information rather than a task. |
| Activity container | `activity_container` | Activities need grouping/nesting under a parent card/container. | PDI examples include Initiate Separation Activities and Onboarding Swag Request. Use sparingly; prefer normal Activity Sets for stages. |

Implementation notes:
- Employee and Fulfiller activities inherit most runtime behavior from the selected HR task template when `fulfiller_activity=HR Task`.
- Always set `owning_group` on `sn_hr_le_activity` when creating activities through API/script. Journey Builder treats Owning group as mandatory even when Table API creation paths appear permissive.
- Fulfiller activity configuration can also expose HR Service, Catalog Item, Order Guide, Flow, Incident, Template, Workflow, and custom activity types. Prefer the OOTB configuration type that creates the target artifact directly.
- Activity-level audience criteria personalize which subject persons receive the activity. Activity set audience/trigger logic runs first; activity audience is evaluated after the set triggers.
- For generated child records and Flow inputs, create `sn_hr_le_activity_field_mapping` records. Map to the concrete target table/field or flow input and verify `valid=true` when available.
- Australia docs also include Pulse Survey as a lifecycle activity type. Use it when the requirement is specifically a pulse survey; otherwise use HR task type `take_survey` or `collect_Information` depending on the data model required.

## HR Task Types

The active `sn_hr_core_task.hr_task_type` choices in the PDI are below. Choose these only after deciding that the Lifecycle Event should create an Employee/Fulfiller HR Task rather than a direct Approval, Flow, HR Service, Catalog Item, Order Guide, Notification, or Content activity.

| HR task type | Value | Use when | Required / important fields |
| --- | --- | --- | --- |
| HR Service | `hr_service` | A to-do should guide the assignee into another HR Service or create a child HR case. Good for benefit enrollment, payroll setup, profile completion, or child COE work. Prefer a direct Fulfiller `HR Service` activity if no intermediate to-do is needed. | `hr_service`; field mappings from LE case to generated case, such as `subject_person` and `opened_for`; set `wait_for_generated_tasks_to_complete` if the parent activity must wait for the child case. |
| Submit Catalog Item | `submit_catalog_item` | A to-do should submit one catalog item/request, usually IT, access, equipment, facilities, or workplace service. Prefer direct Fulfiller `Catalog Item` activity if no employee/agent action is needed first. | `sc_cat_item`; field mappings such as `subject_person -> requested_for`; wait flag if request completion gates the journey. |
| Submit Order Guide | `submit_order_guide` | The assignee needs a bundle of catalog items, such as new-hire equipment/access packages. Prefer direct Fulfiller `Automated Order Guide` when the order guide can be submitted automatically. | `order_guide`; request/requested-for mappings; wait flag if request completion gates the journey. |
| Collect Employee Input | `collect_Information` | Structured answers are needed from an employee, manager, opened-for user, or another case participant. Good for upstream branching and downstream activity creation from responses. | `employee_form`; assignee/assignment fields; verify survey/employee form visibility and who can respond. |
| Checklist | `checklist` | Manual multi-step work must be tracked in one task for HR, manager, IT, Facilities, or Payroll. | `checklist_items`; assignment group/user; short description with actionable text. |
| E-signature | `e_sign` | The user must electronically sign a managed document, knowledge article, or HR document template. | E-signature template or HR document template e-signature configuration; use current `e_sign`, not deprecated `credential`, `e_signature`, or `sign_document`. |
| Schedule a meeting | `meeting` | A meeting invite must be scheduled from HR case/task, such as new-hire check-in, return-to-work meeting, or manager conversation. | Meeting subject/details/attendees/start/end/scheduling fields; Microsoft Outlook spoke is required for calendar scheduling capability. |
| Mark When Complete | `mark_when_complete` | Simple acknowledgement/manual completion is enough. Best default for "confirm this", "do this outside ServiceNow", or lightweight manager/employee tasks. | Short description and description; task moves to Closed Complete when the user clicks Complete. Prefer this over Checklist when there are no real checklist items. |
| Take Survey | `take_survey` | A survey/assessment record is required for feedback, satisfaction, onboarding/leave pulse, or manager feedback. | `survey`; confirm whether the subject person or other case-access users can answer in lifecycle context. |
| Upload Documents | `upload_documents` | The assignee must attach files such as leave certification, return-to-work release, receipts, transcripts, tax forms, or profile documents. | Clear short description/instructions; task must be Ready or Work in Progress for upload. |
| URL | `url` | The task is to visit a link and acknowledge access, such as external policy, portal page, knowledge article, vendor site, or third-party process. | `url`; short description that explains the expected action. |
| View Video | `view_video` | The task is specifically to watch a video. | `url` to video/embed location; short description. |
| Auto-close integration task | `action_url` | An external integration/vendor flow should close the task through an action URL or integration callback pattern. Good for tax/e-sign/vendor tasks where ServiceNow waits on an external system. | `integrating_system` and action URL/integration fields; verify external closure path and avoid using this for normal manual work. |
| Create Journey Accelerator Action Plan | `create_JA_plan` | A manager-led Journey Accelerator plan/action plan should be created or reviewed, often for onboarding, internal mobility, mentoring, promotion, or career transition. | JA plan type/name/description/publish/auto-create fields as required. If not auto-created, the manager receives a to-do to create/review the plan. |

Inactive PDI choices observed: Credential (`credential`), old E-signature (`e_signature`), and Sign Document (`sign_document`). Do not use them for new demos unless a plugin/customer requirement explicitly reactivates the pattern.

HR task type selection shortcuts:
- Use `mark_when_complete` for the simplest manual acknowledgement.
- Use `checklist` only when multiple checklist items must be tracked inside one task.
- Use `collect_Information` when the response data should be structured and can drive downstream logic.
- Use `take_survey` when the artifact should be a survey response, not an employee form.
- Use `upload_documents` when the primary output is attachments.
- Use `url` or `view_video` for learning/reading/watching tasks that only need acknowledgement.
- Use `hr_service`, `submit_catalog_item`, or `submit_order_guide` when the task launches a child service/request and consider whether the Lifecycle Event activity should wait for that child artifact to complete.
- Use `action_url` only for integration-owned tasks that can auto-close from the external process.
- Use `create_JA_plan` only when Journey Accelerator is the desired manager/mentor action-plan experience, not for normal Lifecycle Event task lists.

## Employee/Fulfiller HR Task Configuration

Use this pattern when the selected activity type is Employee or Fulfiller and the card should create an HR Task.

1. Create or reuse an `sn_hr_core_template` with `table=sn_hr_core_task` and, for journey parent cases, `parent_case_table=sn_hr_le_case`.
2. Set template assignment fields deliberately:
   - employee-facing examples: `assignment_type=employee` and `assign_to=subject_person`, `opened_for`, or `subject_person.manager`
   - support-team examples: `assignment_type=fulfiller` with `assignment_group` or `assign_to=assigned_to`
3. Put the generated task defaults in `sn_hr_core_template.template` as an encoded assignment string, including `short_description`, `description`, `state`, `task_support_team`, parent-case visibility fields, `hr_task_type=<choice>`, and the type-specific reference fields.
4. Create the `sn_hr_le_activity` with `activity_type=employee` or `fulfiller`, `hr_template=<template sys_id>`, and the OOTB HR Task fulfiller activity config. In the PDI the valid config is `sn_hr_le_fulfiller_activity_config` `b09d36cfc3132200b599b4ad81d3aef5` (`HR Task`).
5. Set `owning_group`, `order_number`, `active=true`, and any `condition` or `audience_criteria` on the activity. Treat `owning_group` as mandatory for every HR activity, not just HR Task activities. Use `wait_for_generated_tasks_to_complete` when this task should gate downstream activity sets.
6. Verify the saved activity by reading display values. If `fulfiller_activity` displays blank, the activity is misconfigured even if insert succeeded.

Practical encoded template fields by task type:
- `hr_service`: set `hr_service=<sn_hr_core_service>` and create field mappings when a child case/request must inherit lifecycle case values.
- `submit_catalog_item`: set `sc_cat_item=<sc_cat_item>`. To prefill catalog variables, create `sn_hr_le_activity_field_mapping` with `map_from_table=sn_hr_le_case`, `map_from_field=<case field>`, `map_to_table=task`, `map_to_field=variables`, and `map_to_variable=<item_option_new>`. Match data types, for example `subject_person` can map to a catalog variable that references `sys_user`.
- `submit_order_guide`: set `order_guide=<sc_cat_item_guide>`; use when the assignee must launch a bundle rather than one item. Use the same variable mapping shape as catalog items when order-guide variables need lifecycle values.
- `collect_Information`: set `employee_form=<sn_hr_core_employee_form>`.
- `checklist`: set `hr_task_type=checklist`; add checklist items through the supported checklist model when individual item tracking matters.
- `e_sign`: set `sn_esign_esignature_configuration=<sn_esign_configuration>` or the customer-supported e-signature configuration field.
- `meeting`: set `meeting_subject`, `meeting_details`, and scheduling fields such as `schedule_method=manual`; calendar scheduling needs the Microsoft Outlook spoke.
- `mark_when_complete`: only task copy is normally required.
- `take_survey`: set `survey=<asmt_metric_type>`.
- `upload_documents`: write clear attachment instructions in `description`; generated task state must allow upload.
- `url`: set `url=<https URL>`.
- `view_video`: set `url=<video or embed URL>`.
- `action_url`: use an OOTB/vendor integration template with `integrating_system=<system>`; arbitrary new `action_url` templates may be blocked by Business Rule validation.
- `create_JA_plan`: set `hr_task_type=create_JA_plan` and Journey Accelerator plan fields when required; `auto_create_plan=false` creates a manager-facing create/review action.

HR task template due dates:
- Official HRSD docs describe HR task template **Due date** as either `Based on task assignment date` or `Based on parent case table`; reminders can also be populated from the template with `set_reminder`, `email_template`, `when_to_send`, and `interval`.
- The PDI stores the due-date mode and offset directly on `sn_hr_core_template`: `use_assignment_date`, `due_date_source`, `date_offset_type`, `date_offset_quantity`, and `date_offset_units`. Valid offset choices observed: `date_offset_type=before|on|after`; `date_offset_units=hours|days|weeks|months`.
- For parent-case-table due dates, set `use_assignment_date=false`, `parent_case_table=<case table>`, usually `link_element=parent`, `due_date_source=<date field or dot-walk from the parent case>`, and optional offset fields. Examples: `due_date_source=sys_created_on^date_offset_type=after^date_offset_quantity=28^date_offset_units=days` or `due_date_source=subject_person_job.job_start_date^date_offset_type=before^date_offset_quantity=2^date_offset_units=weeks`.
- Parent date sources can dot-walk through references, such as `subject_person_job.job_start_date` or `leave_of_absence.estimated_last_day_of_leave`. If the source field or an intermediate reference is empty, the generated HR task has no `due_date`; add field mappings or producer/case logic to populate real case fields before relying on the due date.
- For assignment-date due dates, set `use_assignment_date=true` plus the offset fields. `hr_TemplateUtils.applyBefore` copies those fields to the generated `sn_hr_core_task`; the Business Rule `Calculate due date from assignment date` calculates `due_date` from the current assignment time and then sets `use_assignment_date=false` on the task.
- PDI test on 2026-06-19 confirmed normal Business Rule behavior on short-lived HR tasks: parent `subject_person_job.job_start_date=2026-06-01` produced `2026-05-30 07:00:00` for 2 days before, `2026-05-18 07:00:00` for 2 weeks before, `2026-06-01 07:00:00` for on date, and `2026-06-16 07:00:00` for 15 days after. Assignment-date tests produced now+3 days, now-2 hours, and now for `after`, `before`, and `on`; all temporary tasks were deleted.
- When creating HR task templates programmatically, keep due-date settings on `sn_hr_core_template` fields, not inside the encoded `template` string. The encoded `template` still holds normal task defaults such as `short_description`, `hr_task_type`, `state`, `task_support_team`, and task-type-specific references.
- For HR task template `rich_description` field tokens, a non-inserting render check can use `new sn_hr_core.hr_TemplateUtils().applyBefore(templateSysId, taskGr, true)` on an initialized task with `parent` set, then `new sn_hr_core.VariableReplacer().replaceFieldTokens(taskGr.rich_description, taskGr)`. This verifies tokens such as `${parent.subject_person}` without creating a test task.

Field mapping notes:
- Use `map_to_table=sc_request` and `map_to_field=requested_for` when mapping to generated request fields.
- Use `map_to_table=task` or the concrete `map_to_table=sn_hr_core_task`, `map_to_field=variables`, and `map_to_variable=<item_option_new sys_id>` when mapping to catalog item/order guide variables. In the Activity Field Mapping UI this target can appear as **Questions**; the stored `map_to_field` value is still `variables`, and the chosen question is stored separately in `map_to_variable`. Related lists often show only `Map to field=variables`, so add/read the `map_to_variable` column or open the mapping record to confirm the selected question.
- Validate type compatibility yourself before creating mappings. A reference case field such as `subject_person` should map to a reference variable with the same target table, such as `sys_user`; date, choice, boolean, and text values should map to compatible variable types.
- For HR task type `submit_catalog_item`, the task template must include `hr_task_type=submit_catalog_item^sc_cat_item=<catalog item sys_id>` in `sn_hr_core_template.template`; the Lifecycle Event activity points to that HR template, not directly to `sn_hr_le_activity.catalog_item`.
- Catalog variable mappings do not create `question_answer` rows when the HR task is generated. The catalog launch path reads them through `sn_hr_le.hr_ActivitySetAJAX().getDefaultCatalogValues('sn_hr_core_task', <hr_task_sys_id>, 'variable')`, which returns a payload keyed by variable **name** from `item_option_new.name`, such as `requested_for: {value:<sys_user>, displayValue:<name>}`.

## Document Template HR Services

Use this pattern when a Lifecycle Event should generate or expose a document template through a child HR Service.

1. Create an HTML document template on `sn_doc_html_template`, not the base `sn_doc_template` table directly:
   - `name=<document template name>`
   - `table=<case table used for tokens>`, for example `sn_hr_le_case`
   - `state=published`, `active=true`, `language=en`
   - `html_script_body=<HTML body with ${field} tokens>`
   - optional layout fields: `page_size`, `top_bottom_margin`, `left_right_margin`, `footnote`, `header_image`, `footer_image`, and related image position/height fields.
2. Match the template table to the HR Service case table that will hold the document data. If the journey parent and child service use `sn_hr_le_case`, use `sn_hr_le_case` so tokens such as `${subject_person}`, `${opened_for}`, `${subject_person.manager}`, and `${number}` resolve from that case.
3. Create an HR case template (`sn_hr_core_template`) for the document HR Service. Use `table=<same HR case table>` and set `document_template=<sn_doc_template sys_id>` inside the encoded `template`, for example `short_description=Generate summary^document_template=<html_template>^priority=4^state=10^EQ`.
4. Create a child HR Service (`sn_hr_core_service`) with `fulfillment_type=simple`, `service_table=<same HR case table>`, `template=<HR template>`, and `service_table_fields=document_template`. The service table field exposes the document template field on the generated HR case.
   - Always set the mandatory case header view references: `header_config_opened_for=Default for opened for/approver` and `header_config_subject_person=Default for subject person/task assigned to`.
5. From the source Lifecycle Event, call the child document HR Service with either:
   - direct Fulfiller activity: `activity_type=fulfiller`, `fulfiller_activity=HR Service`, `hr_service=<child service>`
   - Employee HR Task: `activity_type=employee`, `fulfiller_activity=HR Task`, `hr_template=<task template>` where the HR task type is `hr_service`.
6. Create activity field mappings from the source case to the generated child case. At minimum map `subject_person -> subject_person` and `opened_for -> opened_for`; map any additional fields used by `${...}` tokens in `html_script_body`.

Participants:
- Use the `Participants` related list (`sn_doc_participant`) when the generated document needs online fill, review, or signature tasks. ServiceNow's document task flow uses participant `action` and `order` when initiating document tasks.
- For an internal HR participant, set `doc_template_user` to a user reference field on the template table, such as `subject_person`, `opened_for`, `assigned_to`, or a manager/user dot-walk when allowed. Leave `participant_name` and `participant_email` empty unless you intentionally want those fields to override the selected user's name/email or support an external participant.
- Choose `action=fill` when that participant supplies values, `action=review` when they only review, and `action=sign` when an e-signature task should be generated. For HTML templates with `action=sign`, insert a matching signature token such as `${signature:Subject Person}` in the body where the signature should render.
- Use `order` to sequence participant tasks. Keep the participant `name` stable and human-readable because signature tokens refer to it.

Document Template Blocks:
- Use `Document Template Blocks` when a clause, paragraph, or section should be reusable across multiple HTML templates or conditionally selected at generation time. Do not create separate full templates only to vary one clause by country, employment type, eligibility, or case attributes.
- Create a block container on `sn_doc_template_block` with `table=<same table or a parent table compatible with the HTML template>`, `name`, `active=true`, and optional `topic_detail`/description. Blocks are selectable from an HTML template only when the block table is in the template table hierarchy.
- Add one or more content rows on `sn_doc_template_block_content`. Each row has `block`, `name`, `order`, `active`, `body`, optional `applies_when`, optional `applies_to` user criteria, and `applies_to_user`. If multiple content rows match, the lower `order` wins; if no condition/user criteria is supplied, the content is always applicable.
- Add the block to the HTML template through the Add Blocks action whenever possible. The platform inserts a non-editable `data-dtblock-id="<block sys_id>"` snippet into `html_script_body` and maintains the `sn_doc_m2m_html_template_to_block` related-list row. The related-list row alone is not enough; the body must contain the block snippet where the conditional content should appear.
- For generated or scripted setup, verify both the block marker in `html_script_body` and the `sn_doc_m2m_html_template_to_block` row. The Document Templates utility identifies block markers by `data-dtblock-id`.

PDI lessons:
- `sn_doc_html_template` extends `sn_doc_template`; Table API can create the concrete HTML record and capture it in the active Journey Designer update set.
- Existing OOTB/demo HTML templates use `${field}` and dot-walked tokens such as `${subject_person.company}` in `html_script_body`.
- HR Service form labels "Opened for / Approver view" and "Subject person / Task assignee view" are stored as `header_config_opened_for` and `header_config_subject_person`, both referencing `sn_hr_core_config_case`. The normal defaults in the PDI are `86d9872eb3900300f5302ddc16a8dc8b` (`Default for opened for/approver`) and `c4e9872eb3900300f5302ddc16a8dc91` (`Default for subject person/task assigned to`).
- A direct HR Service activity can auto-create generic `sn_hr_core_case` mappings. If the child service uses a concrete table such as `sn_hr_le_case`, re-query mappings and keep the concrete valid mappings; remove duplicate generic mappings from the update set.
- Use Table API reads as the verification source for new document templates in this PDI. Scoped Xplore template application confirmed the HR template can assign `document_template`, but Xplore did not reliably read newly created `sn_doc_template` rows by sys_id.
- 2026-05-23 participant/block test created a `Subject Person` signing participant (`sn_doc_participant.action=sign`, `doc_template_user=subject_person`) and a reusable `sn_doc_template_block` on `sn_hr_le_case` with one unconditional `sn_doc_template_block_content` row. Capture was clean in the Journey Designer update set as `Participant`, `Document Template Block`, `Document Template Block Content`, and `HTML Template to Document Block`.
- In this PDI, creating the records server-side works, but the UI-generated block snippet required care: verify `DocumentTemplateBlockUtils.extractBlocksFromHtmlSnippet(html_script_body)` returns the block sys_id. If it does not, the runtime block replacement will not find the block even if the related-list M2M row exists.

## Recommended Demo Build Pattern

1. Pick the COE/service table first. Use `references/hrsd-coe-selection.md` for new HR Services and child services.
2. For a journey demo, use `sn_hr_le_case` for the journey parent unless the OOTB example proves a concrete COE parent is intended, as with Parental Leave on Total Rewards.
3. Clone or mirror an OOTB pattern close to the scenario: Onboarding for start-date stages, Offboarding for rescind/separation, Parental Leave for date milestones, child services, and notification-rich journeys.
4. Build the smallest path: HR Service, intake producer, HR template, Lifecycle Event type, Journey config, one immediate Activity Set, and one Activity.
5. Fill the HR Service `description` with approved service-introduction/help text from the design source when available. Do not leave generic placeholders such as "Service for <name>" on employee-facing services.
6. For HR record producers, fill both the employee-facing description and `meta` search keywords. The meta field is used by portal search when AI Search is not the active search path, so include likely employee terms, synonyms, and category words, not only the formal service name.
7. Add a fitting `icon` and `picture` for Employee Center record producers. Use the customer's design system where known: brand colors, restrained line-style iconography, accessible contrast, and relevant imagery. Verify update XML includes the `sys_attachment` and `sys_attachment_doc` payloads for image fields, not only the image sys_id values.
8. For producer deflection, prefer AI Search Assist (`aisa_rp_config`) when the portal has `sp_portal.enable_ais=true` and an active/published AI Search profile exists; keep Contextual Search (`cxs_rp_config`) as fallback. For long free-text HR inquiry questions, the OOTB `ESC AISA Long text to query Search Application` profile is a strong fit because it targets HR knowledge and catalog sources.
9. Prefer Employee/Fulfiller activity plus HR Template for human tasks; use Flow only for automation/integration; use child HR Service or catalog item activity when the result should be a real case/request.
10. When creating `sn_hr_le_activity`, set `owning_group` deliberately along with `activity_set`, `title`, `activity_type`, `fulfiller_activity`, `order_number`, and the target reference such as `hr_template`, `hr_service`, `catalog_item`, `order_guide`, or `flow`.
11. Add activity field mappings for any generated child case, request, task, or subflow input. Map to the concrete target table, not generic `sn_hr_core_case`, when the child service uses a COE extension.
12. Before saving or API-creating an HR Service, validate the final form state after choosing fulfillment type, COE/service table, topic detail, template, producer, case options, HR criteria, and related config. Mandatory fields are dynamic and can appear after those choices, such as Opened for / Approver view, Subject person / Task assignee view, and Case creation service config. Fill the dynamic mandatory fields deliberately rather than relying only on base `sys_dictionary` mandatory flags.
13. Set `sn_hr_core_service.value` together with `name` when creating HR Services through API/script. The UI normally auto-generates the value from the name, but programmatic creation can leave it blank; use lower snake case, for example `Meld inn rekrutteringsbehov` -> `meld_inn_rekrutteringsbehov`.
14. If the HR case needs service-specific case fields or subject-person related lists after creation, configure **HR Service Additional Information** deliberately. Also update the relevant COE case form layout and OOTB hide/show UI policy actions so the fields are present but hidden for unrelated HR services.
15. Verify both design-time records and runtime artifacts: submit the producer or use the HRSD wrapper, inspect generated parent case, activity set contexts, activities/tasks/approvals/requests/flows, and confirm update-set capture.

## Common Pitfalls

- `sn_hr_core_service.service_table`, HR template table/parent table, record producer table, topic detail, and child-service table must agree. Mismatches produce confusing forms, mappings, security, and reporting.
- HR Service descriptions are part of the employee-facing service design. Populate them from the design document or agreed UX copy; do not only update the record producer copy.
- Empty record-producer descriptions and meta fields hurt Employee Center discoverability. Do not leave OOTB placeholder content empty when delivering an employee-facing HR service; add clear description copy and searchable tags.
- Empty or generic record-producer icon/picture fields make services harder to scan in Employee Center. Add branded, relevant imagery and confirm the binary attachment content is captured before promotion.
- Contextual Search and AI Search Assist can coexist on a producer. If AI Search Assist is configured but Contextual Search still appears, verify the portal's Enable AI Search flag, the `aisa_rp_config.active` flag, the AI Search profile's active/published state, and the active search variable on the producer.
- If AI Search portal results find a catalog item/record producer but the action opens `id=form&table=sc_cat_item` instead of `id=sc_cat_item`, check `sp_ai_search_results_action_config` for the portal. Custom/branded portals may be missing from the action config `portals` list for the `ESC Portal Catalogs` source. Add portal-specific navigation and request actions pointing to the `sc_cat_item` portal page instead of changing the catalog item.
- HR Service mandatory fields are partly UI/configuration-driven. The fields required for a valid service can change when fulfillment type, COE/service table, template, producer, case options, HR criteria, views, or case creation service config change. Inspect an equivalent OOTB service or read the configured form state before creating a new service through Table API.
- Empty `sn_hr_core_service.value` fields can slip through API-created HR Services even when the UI would have generated one from `name`. Set and verify the value explicitly, and confirm exported XML contains `<value>...`.
- HR Service Additional Information does not add fields or related lists to form layouts. Missing form-layout entries make `service_table_fields` and `subject_person_related_lists` look broken; missing hide-policy actions can make those fields visible for every service in the COE.
- For most HR Services, set `header_config_opened_for` to `Default for opened for/approver` and `header_config_subject_person` to `Default for subject person/task assigned to`. These are the mandatory form fields labeled "Opened for / Approver view" and "Subject person / Task assignee view"; do not confuse them with the boolean `subject_person_access`.
- `sn_hr_le_activity.order_number` orders cards; `sn_hr_le_activity_set.display_order` orders stages. Do not confuse these with generic display order fields.
- Missing `sn_hr_le_activity.owning_group` is easy to overlook in scripted/API creation. Set it on every activity; Owning group is mandatory in Journey Builder and should be treated as mandatory in automation.
- Activity Sets can auto-create placeholder stages when a Journey service is created. Remove unintended placeholders and their update XML before delivery.
- Date triggers can target related fields such as `subject_person_job.job_start_date` or `leave_of_absence.first_day_of_leave`; make sure intake variables are copied to real case fields if a date trigger depends on them.
- A date-triggered Activity Set condition may not suppress the set reliably. Put the condition on the activities when task suppression matters.
- `sn_hr_core_template.template` is an encoded field assignment string. Validate required type-specific fields: `hr_service`, `sc_cat_item`, `order_guide`, `employee_form`, `survey`, `url`, e-sign config, or integration fields.
- Flow activities need published/compiled subflows and valid field mappings. Direct Flow tests are not enough; verify the HRSD wrapper path with `sn_hr_le.hr_LEActivityFlow().generateFlowActivity(...)`.
- Creating HR Services and activities through server-side GlideRecord can fail with little error detail in the PDI. Prefer Table API writes for these metadata records and then verify update capture.
- Avoid cloning invalid OOTB/demo mappings blindly. Some baseline mappings target generic tables or show invalid validation state.
- For Employee/Fulfiller HR Task activities, resolve the HR Task config from `sn_hr_le_fulfiller_activity_config` by name/display value. In the PDI the working sys_id is `b09d36cfc3132200b599b4ad81d3aef5`; using the wrong config sys_id can insert an activity with a blank card type.
- Do not rely on patching `sn_hr_le_activity.fulfiller_activity` after insert to repair a bad HR Task activity. In the PDI, the bad value persisted; deleting and recreating the activity with the correct config was the reliable fix.
- New `action_url` HR task templates can be blocked by the OOTB Business Rule `Stop create update action_url task type`. Reuse supported OOTB/vendor integration templates or build the vendor integration through the intended setup path.

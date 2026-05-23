# HRSD Development Guide

Use this as the first compact model guide for HRSD HR Service, Lifecycle Event, Journey Designer, activity, and HR task-template work. PDI metadata and OOTB examples inspected 2026-05-18.

## Key Tables

| Concept | Table | Notes |
| --- | --- | --- |
| HR Service | `sn_hr_core_service` | Employee-facing service. Key fields: `name`, `fulfillment_type`, `service_table`, `template`, `producer`, `topic_detail`, `hr_criteria`, `le_type`, `journey_config`, `flow`. |
| Lifecycle Event type | `sn_hr_le_type` | Journey/Lifecycle definition. Key fields: `title`, `event_type`, `display_activity_set`, `sort_activities_by`, `active`. Active PDI examples include Onboarding, Offboarding, Parental Leave, and custom Simen demos. |
| Journey configuration | `sn_jny_journey_config` | Visual Journey Designer config linked from `sn_hr_core_service.journey_config` and `sn_hr_le_type`. |
| Activity Set | `sn_hr_le_activity_set` | Stage/column under a Lifecycle Event. Key fields: `le_type`, `title`, `display_title`, `display_order`, `trigger_type`, trigger date/table/field, dependencies, condition table/condition, display booleans. |
| Activity | `sn_hr_le_activity` | Card inside an Activity Set. Key fields: `activity_set`, `title`, `activity_type`, `order_number`, `owning_group`, plus exactly one target pattern such as approval fields, `hr_template`, `hr_service`, `catalog_item`, `order_guide`, `flow`, `email_template`, or `plan_type`. |
| HR Template | `sn_hr_core_template` | Template record used by HR Services and HR activities. For HR tasks, it normally has `table=sn_hr_core_task`, `parent_case_table`, `assignment_type`, assignment/due-date fields, and an encoded `template` containing `hr_task_type` plus type-specific fields. |
| HR Task runtime | `sn_hr_core_task` | Generated to-do/task table. `hr_task_type` controls the task experience. Type-specific fields include `hr_service`, `sc_cat_item`, `order_guide`, `employee_form`, `survey`, `url`, `hr_task_document`, `meeting_*`, `integrating_system`, and Journey Accelerator plan fields. |
| Activity field mapping | `sn_hr_le_activity_field_mapping` | Maps parent case fields to generated cases, tasks, requests, or Flow inputs. Verify `valid=true` when the platform supports validation. |
| HR Criteria | `sn_hr_core_criteria` | HRSD wrapper for eligibility/audience rules. Often points to `user_criteria`; used on HR Services and some activity logic. PDI examples include Employees Only, New Hire, Office Based Employees, and US Employees - Tax forms Collection. |
| Topic category/detail | `sn_hr_core_topic_category`, `sn_hr_core_topic_detail` | Service taxonomy. Must align with the selected COE/service table; see `references/hrsd-coe-selection.md`. |

## How Lifecycle Event Activities Work

- An HR Service with `fulfillment_type=journey` points to a Lifecycle Event type (`le_type`), Journey config (`journey_config`), intake producer, and HR template.
- The Lifecycle Event type owns ordered Activity Sets. Activity Sets are stages/columns and launch by trigger type: immediate, date, other activity sets, condition, advanced script, combination, or rescind.
- Activities are cards inside Activity Sets. `activity_type` chooses the broad behavior; the target fields choose the concrete generated artifact.
- Employee/Fulfiller activities that create to-dos usually point to an HR Template. The HR Template creates an `sn_hr_core_task` and the template's `hr_task_type` controls the portal/workspace experience.
- Fulfiller activities can also launch child HR Services or catalog items directly through `hr_service`, `catalog_item`, or `order_guide`.
- Flow activities point at `sys_hub_flow` subflows and need field mappings from the parent case into subflow inputs.
- Notification activities use `sn_hr_core_email_content` email content plus recipient fields/users/groups on the activity.
- Activity sets and activities both have conditions. In the PDI, date-triggered activity-set conditions are not reliable gates by themselves; put conditional logic on activities when suppression matters.

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
5. Set `owning_group`, `order_number`, `active=true`, and any `condition` or `audience_criteria` on the activity. Use `wait_for_generated_tasks_to_complete` when this task should gate downstream activity sets.
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

Field mapping notes:
- Use `map_to_table=sc_request` and `map_to_field=requested_for` when mapping to generated request fields.
- Use `map_to_table=task`, `map_to_field=variables`, and `map_to_variable=<item_option_new sys_id>` when mapping to catalog item/order guide variables.
- Validate type compatibility yourself before creating mappings. A reference case field such as `subject_person` should map to a reference variable with the same target table, such as `sys_user`; date, choice, boolean, and text values should map to compatible variable types.

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
10. Add activity field mappings for any generated child case, request, task, or subflow input. Map to the concrete target table, not generic `sn_hr_core_case`, when the child service uses a COE extension.
11. Before saving or API-creating an HR Service, validate the final form state after choosing fulfillment type, COE/service table, topic detail, template, producer, case options, HR criteria, and related config. Mandatory fields are dynamic and can appear after those choices, such as Opened for / Approver view, Subject person / Task assignee view, and Case creation service config. Fill the dynamic mandatory fields deliberately rather than relying only on base `sys_dictionary` mandatory flags.
12. Verify both design-time records and runtime artifacts: submit the producer or use the HRSD wrapper, inspect generated parent case, activity set contexts, activities/tasks/approvals/requests/flows, and confirm update-set capture.

## Common Pitfalls

- `sn_hr_core_service.service_table`, HR template table/parent table, record producer table, topic detail, and child-service table must agree. Mismatches produce confusing forms, mappings, security, and reporting.
- HR Service descriptions are part of the employee-facing service design. Populate them from the design document or agreed UX copy; do not only update the record producer copy.
- Empty record-producer descriptions and meta fields hurt Employee Center discoverability. Do not leave OOTB placeholder content empty when delivering an employee-facing HR service; add clear description copy and searchable tags.
- Empty or generic record-producer icon/picture fields make services harder to scan in Employee Center. Add branded, relevant imagery and confirm the binary attachment content is captured before promotion.
- Contextual Search and AI Search Assist can coexist on a producer. If AI Search Assist is configured but Contextual Search still appears, verify the portal's Enable AI Search flag, the `aisa_rp_config.active` flag, the AI Search profile's active/published state, and the active search variable on the producer.
- If AI Search portal results find a catalog item/record producer but the action opens `id=form&table=sc_cat_item` instead of `id=sc_cat_item`, check `sp_ai_search_results_action_config` for the portal. Custom/branded portals may be missing from the action config `portals` list for the `ESC Portal Catalogs` source. Add portal-specific navigation and request actions pointing to the `sc_cat_item` portal page instead of changing the catalog item.
- HR Service mandatory fields are partly UI/configuration-driven. The fields required for a valid service can change when fulfillment type, COE/service table, template, producer, case options, HR criteria, views, or case creation service config change. Inspect an equivalent OOTB service or read the configured form state before creating a new service through Table API.
- `sn_hr_le_activity.order_number` orders cards; `sn_hr_le_activity_set.display_order` orders stages. Do not confuse these with generic display order fields.
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

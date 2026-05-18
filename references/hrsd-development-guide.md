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

| Activity type | Value | Use when | PDI examples / notes |
| --- | --- | --- | --- |
| Approval | `approval` | A manager, group, or HR approval must block or govern downstream work. | Use `approvers`, `approver_users`, or `approver_groups`; tune `approval_accept_option`, rejection behavior, missing approver behavior, and `wait_for_generated_tasks_to_complete`. OOTB example: Manager approval. |
| Employee | `employee` | The subject person, opened-for user, manager, or another employee-facing actor must complete a to-do. | Usually points to an HR Template with `assignment_type=Employee`; examples include benefit enrollment, surveys, videos, uploads, and manager checklists. |
| Fulfiller | `fulfiller` | HR, IT, facilities, payroll, or another support team must complete work or create a child case/request. | Use HR Template for an HR task, `hr_service` for child HR case, or `catalog_item`/`order_guide` for request work. Examples: Background Check, Setup Email, Confirm Final Payroll. |
| Notification | `notification` | The journey should send a lifecycle email without creating a work item. | Use `email_template`, recipient fields/users/groups, and optional availability offsets. Examples: Parental Leave Request Received, Final Exit Email. |
| Flow | `flow` | The activity should run automation/integration logic that is better owned in Flow Designer/subflow. | Point `flow` to a published subflow and create valid activity field mappings for inputs. PDI examples include Account Setup and Notification Subflow and Simen flow demos. |
| Content | `content` | The journey needs display-only content, banner, guidance, or informational material. | PDI example: Separations Banner. Use for read-only information rather than a task. |
| Activity container | `activity_container` | Activities need grouping/nesting under a parent card/container. | PDI examples include Initiate Separation Activities and Onboarding Swag Request. Use sparingly; prefer normal Activity Sets for stages. |

## HR Task Types

The active `sn_hr_core_task.hr_task_type` choices in the PDI are:

| HR task type | Value | Practical use |
| --- | --- | --- |
| HR Service | `hr_service` | Creates or guides the user into another HR Service from a to-do. Set `hr_service` in the template. Good for child HR Services such as benefit enrollment, payroll setup, or profile completion. |
| Submit Catalog Item | `submit_catalog_item` | Launches a catalog item/request from the journey. Set `sc_cat_item`; map requested-for data when needed. Good for IT equipment, access, or facilities requests. |
| Submit Order Guide | `submit_order_guide` | Launches an order guide. Set `order_guide`. Good when the assignee must choose from a bundle of related items, such as new-hire equipment. |
| Collect Employee Input | `collect_Information` | Presents an HR employee form. Set `employee_form`. Good for structured employee input that is not a full HR case. |
| Checklist | `checklist` | Creates a checklist-style task. Good for manual multi-step work by HR, manager, IT, or facilities. |
| E-signature | `e_sign` | Creates an e-signature task. Set the e-signature configuration field in the template. The old `e_signature` choice exists but is inactive; use `e_sign`. |
| Schedule a meeting | `meeting` | Creates a meeting-oriented task. Use meeting fields such as subject, details, attendees, scheduling method, start/end dates. No active OOTB template was found in the inspected PDI, but the type and fields are present. |
| Mark When Complete | `mark_when_complete` | Simple acknowledgement/manual completion task. Good for "confirm/update/do this outside the platform" tasks. |
| Take Survey | `take_survey` | Assigns a survey. Set `survey`. Good for onboarding, leave, satisfaction, and manager feedback. |
| Upload Documents | `upload_documents` | Asks the user to attach files. Good for leave certification, return-to-work release, receipts, transcripts, or profile documents. |
| URL | `url` | Provides a link to external site, portal page, knowledge article, video host, or third-party process. Set `url` and descriptive text. |
| View Video | `view_video` | Presents a video to watch. Set `url` to the embed/video URL. |
| Auto-close integration task | `action_url` | Integration-style task that can close through an external/action URL pattern. PDI example uses `integrating_system=cicplus` for tax forms. |
| Create Journey Accelerator Action Plan | `create_JA_plan` | Starts a Journey Accelerator plan/action-plan flow. Set JA plan-related fields such as plan type/name/description or auto-create behavior as required. |

Inactive PDI choices observed: Credential (`credential`), old E-signature (`e_signature`), and Sign Document (`sign_document`). Do not use them for new demos unless a plugin/customer requirement explicitly reactivates the pattern.

## Recommended Demo Build Pattern

1. Pick the COE/service table first. Use `references/hrsd-coe-selection.md` for new HR Services and child services.
2. For a journey demo, use `sn_hr_le_case` for the journey parent unless the OOTB example proves a concrete COE parent is intended, as with Parental Leave on Total Rewards.
3. Clone or mirror an OOTB pattern close to the scenario: Onboarding for start-date stages, Offboarding for rescind/separation, Parental Leave for date milestones, child services, and notification-rich journeys.
4. Build the smallest path: HR Service, intake producer, HR template, Lifecycle Event type, Journey config, one immediate Activity Set, and one Activity.
5. Prefer Employee/Fulfiller activity plus HR Template for human tasks; use Flow only for automation/integration; use child HR Service or catalog item activity when the result should be a real case/request.
6. Add activity field mappings for any generated child case, request, task, or subflow input. Map to the concrete target table, not generic `sn_hr_core_case`, when the child service uses a COE extension.
7. Verify both design-time records and runtime artifacts: submit the producer or use the HRSD wrapper, inspect generated parent case, activity set contexts, activities/tasks/approvals/requests/flows, and confirm update-set capture.

## Common Pitfalls

- `sn_hr_core_service.service_table`, HR template table/parent table, record producer table, topic detail, and child-service table must agree. Mismatches produce confusing forms, mappings, security, and reporting.
- `sn_hr_le_activity.order_number` orders cards; `sn_hr_le_activity_set.display_order` orders stages. Do not confuse these with generic display order fields.
- Activity Sets can auto-create placeholder stages when a Journey service is created. Remove unintended placeholders and their update XML before delivery.
- Date triggers can target related fields such as `subject_person_job.job_start_date` or `leave_of_absence.first_day_of_leave`; make sure intake variables are copied to real case fields if a date trigger depends on them.
- A date-triggered Activity Set condition may not suppress the set reliably. Put the condition on the activities when task suppression matters.
- `sn_hr_core_template.template` is an encoded field assignment string. Validate required type-specific fields: `hr_service`, `sc_cat_item`, `order_guide`, `employee_form`, `survey`, `url`, e-sign config, or integration fields.
- Flow activities need published/compiled subflows and valid field mappings. Direct Flow tests are not enough; verify the HRSD wrapper path with `sn_hr_le.hr_LEActivityFlow().generateFlowActivity(...)`.
- Creating HR Services and activities through server-side GlideRecord can fail with little error detail in the PDI. Prefer Table API writes for these metadata records and then verify update capture.
- Avoid cloning invalid OOTB/demo mappings blindly. Some baseline mappings target generic tables or show invalid validation state.

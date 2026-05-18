# HRSD COE / Case Table Selection

Use this before creating or changing an HR Service when the target Center of Excellence (COE), case table, topic category/detail, template table, or record producer table is not already fixed.

Research basis: ServiceNow Australia HRSD docs inspected 2026-05-18, plus Simen's PDI table/service inventory inspected 2026-05-18.

## Core Model

- HRSD COEs organize HR services by functional discipline. Each COE is an extension of `sn_hr_core_case`.
- A service is categorized as `COE -> topic category -> topic detail -> HR Service`.
- `sn_hr_core_service.service_table`, the HR case template COE/table, the record producer table, and topic category/detail must agree. Mismatches cause confusing forms, field mappings, security, reporting, and transfers.
- HR catalog item categories are employee-facing navigation and do not define the HR Service COE.
- COE security policies are evaluated by COE/table and can also filter by HR service and conditions. Treat COE choice as a security/reporting decision, not only a form-field decision.
- HR Service forms and case creation forms are service-specific overlays on top of the COE table. Fields added directly to a COE table appear for every service on that table unless hidden with UI policies.

## Selection Process

1. Identify the business discipline first: benefits/rewards, payroll, talent acquisition/screening, workforce admin/employee data, HR systems/report support, lifecycle journey, employee relations, or generic HR inquiry.
2. Check whether an active COE table and topic category/detail already match the requirement. Prefer reusing the closest active COE/topic over creating a new COE.
3. Inspect the candidate table's dictionary fields and existing HR services in the instance:
   - `sys_db_object` for `sn_hr_core_case*` and `sn_hr_le_case`.
   - `sys_dictionary` for service-specific fields on the candidate table.
   - `sn_hr_core_service` for active services with the same `service_table`.
   - `sn_hr_core_topic_category` and topic detail records for existing categorization.
4. Choose the narrowest COE that owns the process and data. If the data belongs to payroll, use Payroll even if the requester starts from a benefits journey. If the process is a journey parent, use Lifecycle Events for the parent and child HR Services on their own COEs.
5. Only use base `sn_hr_core_case` for true general inquiries or cross-HR requests without a better COE. Avoid it as a shortcut for services with payroll, rewards, workforce admin, talent, or lifecycle semantics.
6. If a required persistent field is unique to one service but the COE is otherwise correct, prefer a service-specific case form/creation configuration or variable/description capture. Add a COE-table field only when the data is reusable across multiple services in that COE or needed for reporting/automation.

## COE Guide

| Need / service shape | Preferred table | Use when | PDI signals |
| --- | --- | --- | --- |
| Benefits, retirement, leave of absence, tuition reimbursement, general rewards | `sn_hr_core_case_total_rewards` | The service concerns benefits, LOA, leave dates, reimbursement, benefit plans, retirement, tuition/course costs, or similar reward programs. | Active services include benefits, retirement, tuition, and `Parental Leave of Absence Request (Demo)`. Fields include `first_day_of_leave`, `estimated_last_day_of_leave`, `leave_type`, `leave_of_absence`, `benefit_provider`, course/reimbursement fields. |
| Payroll, direct deposit, pay discrepancy, final pay, payroll setup/deductions | `sn_hr_core_case_payroll` | The fulfillment owner and sensitive data are payroll-related. | Active services include direct deposit setup/inquiry, payroll discrepancy, final payroll, payroll setup. Fields include account/deposit/routing fields, `pay_discrepancy_type`, `direct_deposit`, `deposit_amount`, `deposit_percent`. |
| Background checks, drug screens, work visa, new hire documentation, start date, offer/counter-offer | `sn_hr_core_case_talent_management` | The process belongs to recruiting, pre-hire, screening, work authorization, or talent processes. | Active services include request background check, drug screen, work visa transfer, new hire documentation, change start date. Fields include background check IDs/status/result/link/package, drug screening fields, `visa_category`, `country_travelling_to`. |
| Employee profile/data updates, employment verification, relocation assistance, HR operations data changes, privacy access/erasure | `sn_hr_core_case_workforce_admin` | The service updates employee data, verifies employment, handles relocation logistics, or performs workforce administration. | Active services include employee profile update, verification of employment, relocation assistance; inactive examples include personal data report and erasure. Fields include `change_date`, relocation address/city/state/zip/country/date/reason, `office_location`, `recipient_email`, `work_visa_required`. |
| HR systems, HR portal support, HR accounts/access, HR reports, HRIT operational support | `sn_hr_core_case_operations` | The request is about HR tools, HR system access, reports, account setup, or HR portal/browser support. | Active services include HR account access, password reset, HR portal support, report request/inquiry, setup new hire HR profile. Fields include `user_name`, `hr_system`, `report_type`, `report_frequency`, `support_browser`, `support_type`. |
| Journey parent cases for onboarding, transitions, separation, lifecycle boards, activity sets, journey-specific branching | `sn_hr_le_case` | The HR Service is fulfilled as a Lifecycle Event/Journey and needs journey/activity-set runtime state. | Active services include New Hire Journey, Voluntary Separation, account notification, demo journey services. Fields include journey booleans such as `needs_work_visa`, `needs_transfer_work_visa`, `needs_relocation_assistance`, `needs_corporate_credit_card`. |
| General HR inquiry without a better COE | `sn_hr_core_case` | The request is generic, low-structure, and not owned by a domain COE. | PDI active services are `General Inquiry` and `Bulk Parent Case`. |
| Benefits-only package COE | `sn_hr_core_case_benefits` | Use only when the instance/customer has activated and intentionally separated Benefits from Total Rewards. | Australia docs note Benefits is inactive by default. In Simen's PDI it has no custom fields beyond `sys_id` and no services. |
| Compensation-only package COE | `sn_hr_core_case_compensation` | Use only when compensation work is separately activated and owned outside Total Rewards. | Australia docs note Compensation is inactive by default. In Simen's PDI it has no custom fields beyond `sys_id` and no services. |
| Corporate communications package COE | `sn_hr_core_case_corporate_communication` | Use for HR corporate communications cases only if activated and business-owned as a separate COE. | Australia docs note Corporate Communications is inactive by default. In Simen's PDI it has no custom fields beyond `sys_id` and no services. |
| Global mobility package COE | `sn_hr_core_case_global_mobility` | Use for global mobility/assignment/immigration mobility services only if activated and business-owned as a separate COE. | Australia docs note Global Mobility is inactive by default. In Simen's PDI it has no custom fields beyond `sys_id` and no services. |

## Common Mapping Decisions

- Parental leave / leave of absence: use `sn_hr_core_case_total_rewards`, especially when leave dates, leave type, benefit deductions, or return-to-work milestones matter. For a journey, use `sn_hr_le_case` as the parent and Total Rewards for leave-related child HR Services.
- Onboarding: use `sn_hr_le_case` for the journey parent. Use Talent Management for background check, drug screen, visa, offer/start-date, or new-hire documentation child services; use Payroll for payroll setup/direct deposit; use Operations for HR account/system setup; use Workforce Admin for HR profile or employee data setup.
- Separation/offboarding: use `sn_hr_le_case` for the journey parent. Use Payroll for final pay, Total Rewards for benefits/leave/rewards implications, Workforce Admin for employee data or employment verification, and Operations for system/account actions.
- Relocation: use Workforce Administration when the core request is relocation assistance/logistics or destination office/address data. If the core issue is visa/work authorization screening, use Talent Management or a child Talent service.
- Employment verification: use Workforce Administration because the PDI has a dedicated service and `recipient_email` field there.
- Payroll deductions during leave: use Payroll for payroll-owned deduction execution even when the parent leave case is Total Rewards or Lifecycle Events.
- HR system/reporting support: use HRIT Operations, not generic HR Case.

## Implementation Checks

- Before creating `sn_hr_core_service`, confirm the intended `service_table` exists, is active/usable in the COE configuration, and has matching topic category/detail options.
- Make the `sn_hr_core_template.table` match the service table. Official docs explicitly require the HR case template COE to match the associated HR Service COE.
- For self-service, prefer creating the HR catalog item/record producer through HRSD-supported configuration. Do not create duplicate HR Services for the same request path.
- When adding fields, remember table-level fields are shared by every service on that COE. Hide service-specific fields with UI policies or use HR Service Additional Information / case creation configuration where appropriate.
- For Journey Designer field mappings, map to the concrete generated case table such as `sn_hr_core_case_total_rewards`, not generic `sn_hr_core_case`, when the child service uses an extended COE table.
- For security troubleshooting, use COE Security Diagnostics and inspect `sn_hr_core_coe_security_policy`; collaborators can override COE restrictions in normal case handling.

## PDI Quick Inventory

Installed HR case tables in Simen's PDI:

- `sn_hr_core_case`: HR Case base table.
- `sn_hr_core_case_total_rewards`: active services and concrete leave/benefit/reimbursement fields.
- `sn_hr_core_case_payroll`: active services and concrete payroll/direct-deposit fields.
- `sn_hr_core_case_talent_management`: active services and concrete screening/visa/background-check fields.
- `sn_hr_core_case_workforce_admin`: active services and concrete relocation/employment-verification fields.
- `sn_hr_core_case_operations`: active services and concrete HRIT/report/support fields.
- `sn_hr_le_case`: active journey/lifecycle services and journey option fields.
- `sn_hr_core_case_benefits`, `sn_hr_core_case_compensation`, `sn_hr_core_case_corporate_communication`, `sn_hr_core_case_global_mobility`: present but no active PDI services found and no custom fields beyond `sys_id` in the inspected PDI.

Active PDI topic categories by COE:

- `sn_hr_core_case`: General.
- `sn_hr_core_case_total_rewards`: Benefits.
- `sn_hr_core_case_payroll`: Payroll Administration, Time and Expense Management.
- `sn_hr_core_case_talent_management`: Talent Management, Separations (Demo).
- `sn_hr_core_case_workforce_admin`: Employee Data Management, HR Operations.
- `sn_hr_core_case_operations`: Accounts / Account Access Control, HR System Support, Reporting.
- `sn_hr_le_case`: Talent Acquisition, Separation (Demo), Accounts / Access Control.

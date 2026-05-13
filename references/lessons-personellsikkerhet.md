# Personellsikkerhet Lessons

Durable notes for Simen's `x_personellsikkerh` Personellsikkerhet app on PDI `dev396302`.

## Instance And Helper Use

- Generic shell variables `SN_INSTANCE`, `SN_USER`, and `SN_PASS` may point at an older PDI. For this app, prefer helper calls with `-Profile pdi -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'` and clear generic env vars in the command when needed.
- Use update set context in scope `x_personellsikkerh` / sys_id `5a901a5caf0efe10442b822dc62749ba`.
- Credentials belong in the `.env` or OS credential store, never in `SKILL.md` or repo docs.

## App-Specific Patterns

- Main table: `x_personellsikkerh_personellsikkerhet`. It is the master person/security record and references `sys_user` through field `navn`.
- Main task table: `x_personellsikkerh_oppgaver`. Reklarering tasks reference person records through field `ansatt` and use `oppgavetype=reklarering`.
- Employee/manager follow-up task table: `x_personellsikkerh_oppgaver_for_ansatt`.
- `PersonellsikkerhetOppgaveManager` owns reklarering task creation and status transitions. Prefer extending this Script Include for process logic instead of duplicating transition rules in Business Rules or UI Actions.
- `PersonellsikkerhetAnsattOppgaveManager` owns follow-up notifications/tasks after FSA approval.
- `PersonellsikkerhetUserSync` maps from `sys_user` and `sn_hr_core_profile` into person records. On the current PDI, scoped read access to `sn_hr_core_profile` may be missing, producing `ScopeAccessNotGrantedException`; inspect/fix cross-scope access before relying on it for bulk sync.

## Notifications And Events

- Existing notifications often use events and `sysevent_email_action.generation_type=event`. When creating a new event notification through Table API, explicitly set `generation_type='event'`; otherwise the default may be `engine`, causing processed events without generated `sys_email`.
- If a notification uses `event_parm_1=true`, pass an email address when available, not only a user sys_id. Existing app code often uses `grUser.getValue('email') || grUser.getUniqueValue()`.
- `sysevent_email_action.item` may show `event.parm1` automatically when `event_parm_1=true`.
- Verify notifications by checking both `sysevent` (`state=processed`, parm values) and `sys_email` (subject, recipients, target table). A processed event alone is not proof an email was generated.

## Update Set Hygiene

- Creating dictionary fields through Table API may also create a `sys_ui_element` and a form-layout customer update. Remove a purely technical tracking field from the form layout if users should not see it, and delete unintended form-layout update XML from the delivery update set.
- Xplore/Table API tests in scoped apps can create `sys_scope_privilege` update XML noise. Remove unintended cross-scope privilege customer updates from the delivery update set before final handoff.
- `sysauto_script` records sometimes do not capture automatically. Use `Save-ServiceNowCustomerUpdate.ps1 -Table sysauto_script -SysId <id> -UpdateSetSysId <update_set>` when the scheduled job is a legitimate deliverable.
- For behavior tests, use constrained demo records and restore changed field values. Delete test `sys_email` records left in `send-ready` state after verification when the email itself is not a deliverable.

## Demo Data Marker

- Demo person records created during the initial PDI setup use marker `CODEX_DEMO_PERSONELLSIKKERHET_2026_05_13` in `x_personellsikkerh_personellsikkerhet.merknad` and demo users `demo.ps.ffi01` through `demo.ps.ffi10`.

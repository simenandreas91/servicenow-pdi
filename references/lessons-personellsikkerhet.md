# Personellsikkerhet Lessons

Durable notes for Simen's `x_personellsikkerh` Personellsikkerhet app on PDI `dev396302`.

## Instance And Helper Use

- FFI's real ServiceNow environment is on-premise and not reachable from this Codex environment. Use Simen's PDI `dev396302` as the mirror/reproduction instance for FFI/Personellsikkerhet behavior, and ask for FFI record numbers, screenshots, exported XML, logs, or exact configuration details when a discrepancy exists only in FFI.
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
- The person-to-user security-field sync is the Business Rule `Sync security fields to user` on `x_personellsikkerh_personellsikkerhet`; extend it in place for `navn`, `sikkerhetsklareringsniv`, `autorisasjonsniva`, `autorisasjonsdato`, and `gyldig_klarering_til` instead of adding duplicate user update rules. The user expiry field label `Utløpsdato sikkerhetsklarering` has element `u_utl_psdato_sikkerhetsklarering`.
- When mirroring `sikkerhetsklareringsniv` choices to HR Lifecycle case field `sn_hr_le_case.u_sikkerhetsklareringsniva`, compare `sys_choice` rows by label/value/language/sequence/inactive/dependent value. ServiceNow captures the target field's full set as one `Choice list` update named `sys_choice_sn_hr_le_case_u_sikkerhetsklareringsniva`.

## Notifications And Events

- Existing notifications often use events and `sysevent_email_action.generation_type=event`. When creating a new event notification through Table API, explicitly set `generation_type='event'`; otherwise the default may be `engine`, causing processed events without generated `sys_email`.
- If a notification uses `event_parm_1=true`, pass an email address when available, not only a user sys_id. Existing app code often uses `grUser.getValue('email') || grUser.getUniqueValue()`.
- `sysevent_email_action.item` may show `event.parm1` automatically when `event_parm_1=true`.
- Verify notifications by checking both `sysevent` (`state=processed`, parm values) and `sys_email` (subject, recipients, target table). A processed event alone is not proof an email was generated.
- For reklarering go-live/backfill work on `x_personellsikkerh_oppgaver`, inspect both `sysevent_email_action` and the producer code before scripting. In the current clone, initial reklarering notifications on the parent task use `generation_type=engine`, `action_insert=true`, and the shared global event name `activate.life.cycle.migration`; POB reminders use `x_personellsikkerh.pob.reminder`; authorization conversation follow-up uses `x_personellsikkerh.autorisasjonssamtale_`.
- `Reklaring behov - ansatt` and `Reklaring behov - leder` are active notifications on `x_personellsikkerh_oppgaver` that both listen to `activate.life.cycle.migration`. Their recipients are field-based (`ansatt.navn` and `ansatt.navn.manager`), so a one-time start-of-process backfill only needs `gs.eventQueue('activate.life.cycle.migration', grTask, '', '')` for each matching parent task; do not calculate recipient parms unless the notification configuration changes.
- Do not infer target statuses from labels alone. The `prosesstatus` choice list has contained `Reklarering behov`, while older scheduled logic queried `Reklaring behov`. Use `sys_choice` plus live aggregate counts on existing records, and include both values in one-time backfills when both may exist.
- For one-time notification backfill Fix Scripts, default `DRY_RUN = true`, log candidate task numbers/sys_ids and event parms, and only set tracking fields (`pob_f_rste_varsling_sendt`, `pob_sist_purret`) when actually queueing events. Run the dry-run through Xplore in `x_personellsikkerh` before creating/updating the `sys_script_fix`.

## Update Set Hygiene

- Creating dictionary fields through Table API may also create a `sys_ui_element` and a form-layout customer update. Remove a purely technical tracking field from the form layout if users should not see it, and delete unintended form-layout update XML from the delivery update set.
- Xplore/Table API tests in scoped apps can create `sys_scope_privilege` update XML noise. Remove unintended cross-scope privilege customer updates from the delivery update set before final handoff.
- `sysauto_script` records sometimes do not capture automatically. Use `Save-ServiceNowCustomerUpdate.ps1 -Table sysauto_script -SysId <id> -UpdateSetSysId <update_set>` when the scheduled job is a legitimate deliverable.
- `Set-ServiceNowUpdateSetContext.ps1 -Name <same name>` creates a new update set; it does not select an existing one by name. When returning to an already-created update set, pass `-UpdateSetSysId <sys_id>` to avoid empty duplicate update sets.
- For behavior tests, use constrained demo records and restore changed field values. Delete test `sys_email` records left in `send-ready` state after verification when the email itself is not a deliverable.

## Demo Data Marker

- Demo person records created during the initial PDI setup use marker `CODEX_DEMO_PERSONELLSIKKERHET_2026_05_13` in `x_personellsikkerh_personellsikkerhet.merknad` and demo users `demo.ps.ffi01` through `demo.ps.ffi10`.

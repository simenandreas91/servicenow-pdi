$ErrorActionPreference = 'Stop'

$xploreScript = @'
(function () {
  var result = { created: [], jobFound: false, reminderEvents: 0, emails: [] };
  var userId = '38c17f3fcc980310b214a0b7a2acbbef';
  var serviceId = '6628cde49f331200d9011977677fcf0b';

  function newCase(label) {
    var hrCase = new GlideRecord('sn_hr_core_case');
    hrCase.initialize();
    hrCase.setValue('short_description', '[STRY0010053-55 retest 2026-05-22] ' + label);
    hrCase.setValue('hr_service', serviceId);
    hrCase.setValue('opened_for', userId);
    hrCase.setValue('opened_by', userId);
    hrCase.setValue('subject_person', userId);
    hrCase.setValue('state', '1');
    var id = hrCase.insert();
    hrCase.get(id);
    hrCase.setValue('state', '3');
    hrCase.update();
    hrCase.get(id);
    return hrCase;
  }

  function ageProposal(hrCase, daysAgo) {
    var proposedAt = new GlideDateTime();
    proposedAt.addDaysUTC(-daysAgo);
    hrCase.setValue('u_proposed_solution_at', proposedAt);
    hrCase.update();
    hrCase.get(hrCase.getUniqueValue());
  }

  function capture(hrCase, label) {
    hrCase.get(hrCase.getUniqueValue());
    result.created.push({
      label: label,
      sys_id: String(hrCase.getUniqueValue()),
      number: String(hrCase.getValue('number')),
      state: String(hrCase.getValue('state')),
      proposed_at: String(hrCase.getValue('u_proposed_solution_at')),
      reminder_sent: String(hrCase.getValue('u_proposed_solution_reminder_sent')),
      close_notes: String(hrCase.getValue('close_notes'))
    });
  }

  function addEmployeeComment(hrCase) {
    var journal = new GlideRecord('sys_journal_field');
    journal.initialize();
    journal.autoSysFields(false);
    journal.setValue('name', 'sn_hr_core_case');
    journal.setValue('element', 'comments');
    journal.setValue('element_id', hrCase.getUniqueValue());
    journal.setValue('value', 'Employee response demo comment for STRY0010053-55 retest.');
    journal.setValue('sys_created_by', 'simen.knudsen@varenergi.no');
    journal.setValue('sys_created_on', new GlideDateTime());
    journal.insert();
  }

  var stamp = newCase('Stamp on Awaiting Acceptance');
  var reminder = newCase('Reminder threshold');
  ageProposal(reminder, 6);
  var close = newCase('Auto-close threshold');
  ageProposal(close, 16);
  var response = newCase('Employee comment prevents close');
  ageProposal(response, 16);
  addEmployeeComment(response);

  var job = new GlideRecord('sysauto_script');
  result.jobFound = job.get('3e307bb821c9c350d8cb70a2b1956acf');
  if (result.jobFound)
    eval(String(job.getValue('script')));

  capture(stamp, 'stamp');
  capture(reminder, 'reminder');
  capture(close, 'close');
  capture(response, 'employee_response');

  var event = new GlideRecord('sysevent');
  event.addQuery('name', 'sn_hr_core.proposed_solution_reminder');
  event.addQuery('instance', reminder.getUniqueValue());
  event.query();
  while (event.next())
    result.reminderEvents++;

  var mail = new GlideRecord('sys_email');
  mail.addQuery('subject', 'CONTAINS', reminder.getValue('number'));
  mail.addQuery('subject', 'CONTAINS', 'proposed solution');
  mail.orderByDesc('sys_created_on');
  mail.setLimit(5);
  mail.query();
  while (mail.next()) {
    result.emails.push({
      sys_id: String(mail.getUniqueValue()),
      type: String(mail.getValue('type')),
      subject: String(mail.getValue('subject'))
    });
  }

  gs.print('CODEX_RESULT_START' + JSON.stringify(result) + 'CODEX_RESULT_END');
})();
'@

& '/root/.agents/skills/servicenow-pdi/scripts/Invoke-ServiceNowXploreScript.ps1' `
  -Script $xploreScript `
  -Profile other `
  -EnvPath /root/codex-workspace/.env

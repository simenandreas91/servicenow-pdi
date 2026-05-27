(function () {
  var SCOPE = '70b67750c7010110eadc357098c26026'; // Journey designer
  var HR_CORE_SCOPE = 'd4ac3fff5b311200a4656ede91f91af2';
  var HR_CATALOG = '7b0370019f22120047a2d126c42e7075';
  var HR_CATEGORY = 'f227415e53032200eb7c0a1806dc34f6'; // Talent Management, from demo
  var TOPIC_DETAIL = '58a50d1e53032200eb7c0a1806dc348a'; // New Hire Onboarding fallback used by demo
  var JNY_TYPE = 'd85d1ce2772201101fb2ad00fd5a9996'; // Onboarding
  var HR_ACTIVITY_WRITERS = 'bf0b2a70e7723200c1dc8a63c2f6a93e';
  var HR_WORKFORCE_ADMIN = '2d07493377a33300d0e310389a10615a';
  var APPROVER_SUBJECT_MANAGER = 'be5cd47a3b322200d901655593efc402';
  var FULFILLER_APPROVAL = 'bb9204447fac1a10fd79c12efc8665e6';
  var FULFILLER_HR_TASK = 'b09d36cfc3132200b599b4ad81d3aef5';
  var result = {};

  function ensure(table, key, value, values, scope) {
    var gr = new GlideRecord(table);
    gr.addQuery(key, value);
    gr.setLimit(1);
    gr.query();
    var exists = gr.next();
    if (!exists) {
      gr.initialize();
      gr.setValue(key, value);
    }
    for (var k in values) {
      if (values.hasOwnProperty(k) && gr.isValidField(k))
        gr.setValue(k, values[k]);
    }
    if (scope && gr.isValidField('sys_scope')) gr.setValue('sys_scope', scope);
    if (exists && (table == 'sc_cat_item_producer' || table == 'sn_hr_core_template'))
      return String(gr.getUniqueValue());
    var id = exists ? gr.update() : gr.insert();
    if (!id) throw 'Failed to save ' + table + ' ' + value + ': ' + gr.getLastErrorMessage();
    return String(exists ? gr.getUniqueValue() : id);
  }

  function ensureVariable(producerId, name, values) {
    var gr = new GlideRecord('item_option_new');
    gr.addQuery('cat_item', producerId);
    gr.addQuery('name', name);
    gr.setLimit(1);
    gr.query();
    var exists = gr.next();
    if (!exists) {
      gr.initialize();
      gr.setValue('cat_item', producerId);
      gr.setValue('name', name);
    }
    for (var k in values) {
      if (values.hasOwnProperty(k) && gr.isValidField(k))
        gr.setValue(k, values[k]);
    }
    if (gr.isValidField('sys_scope')) gr.setValue('sys_scope', SCOPE);
    var id = exists ? gr.update() : gr.insert();
    if (!id) throw 'Failed to save variable ' + name + ': ' + gr.getLastErrorMessage();
    return String(exists ? gr.getUniqueValue() : id);
  }

  function ensureDictionaryField(tableName, element, label, type, reference) {
    var gr = new GlideRecord('sys_dictionary');
    gr.addQuery('name', tableName);
    gr.addQuery('element', element);
    gr.setLimit(1);
    gr.query();
    var exists = gr.next();
    if (!exists) {
      gr.initialize();
      gr.setValue('name', tableName);
      gr.setValue('element', element);
      gr.setValue('internal_type', type);
    }
    gr.setValue('column_label', label);
    gr.setValue('active', true);
    if (reference) gr.setValue('reference', reference);
    if (gr.isValidField('sys_scope')) gr.setValue('sys_scope', SCOPE);
    if (exists)
      return String(gr.getUniqueValue());
    var id = exists ? gr.update() : gr.insert();
    if (!id) throw 'Failed to save dictionary field ' + tableName + '.' + element + ': ' + gr.getLastErrorMessage();
    return String(exists ? gr.getUniqueValue() : id);
  }

  result.new_department_field = ensureDictionaryField('sn_hr_le_case', 'u_new_department', 'Ny organisatorisk enhet', 'reference', 'cmn_department');

  var receivingHeadOption = ensure('sn_hr_core_service_approval_option', 'name', 'STRY0013657 - Ny organisatorisk enhet leder', {
    active: true,
    case_table: 'sn_hr_le_case',
    approval_assign_to: 'u_new_department.dept_head'
  }, HR_CORE_SCOPE);
  result.receiving_head_approval_option = receivingHeadOption;

  var producer = ensure('sc_cat_item_producer', 'name', 'Endring av personaltilhørighet Request', {
    active: true,
    table_name: 'sn_hr_le_case',
    sc_catalogs: HR_CATALOG,
    category: HR_CATEGORY,
    availability: 'on_both',
    short_description: 'Meld inn endring av personaltilhørighet for en eller flere ansatte.',
    description: '<p>Dette skjemaet benyttes for å gjøre endring av personaltilhørighet for en eller flere ansatte. Større omorganiseringer gjøres ved å kontakte strategisk HR.</p><p><strong>Tilgang:</strong> Skjema skal kun være tilgjengelig for HR og ledere ved FFI.</p>',
    meta: 'personaltilhørighet organisasjon organisatorisk enhet avdeling forskningsområde forskningsprogram leder HR FFI',
    script: "new sn_hr_le.hr_ActivityUtils().createCaseFromProducer(current, producer, cat_item.sys_id);"
  }, SCOPE);
  result.producer = producer;

  var vRole = ensureVariable(producer, 'leader_role', {
    question_text: 'Er du avgivende eller mottakende leder?',
    type: 5,
    order: 100,
    mandatory: true
  });
  var vType = ensureVariable(producer, 'change_type', {
    question_text: 'Hva gjelder endringen?',
    type: 5,
    order: 200,
    mandatory: true
  });
  var vDept = ensureVariable(producer, 'new_department', {
    question_text: 'Velg ny organisatorisk enhet',
    type: 8,
    order: 300,
    mandatory: true,
    reference: 'cmn_department',
    attributes: 'ref_ac_columns=name;id;dept_head,ref_auto_completer=AJAXTableCompleter'
  });
  ensureVariable(producer, 'new_department_head', {
    question_text: 'Leder for team/enhet',
    type: 8,
    order: 310,
    mandatory: false,
    reference: 'sys_user',
    read_only: true,
    attributes: 'ref_ac_columns=name;employee_number,ref_auto_completer=AJAXTableCompleter'
  });
  var vEmployees = ensureVariable(producer, 'employees_to_move', {
    question_text: 'Navn på den eller de som skal flyttes',
    type: 21,
    order: 400,
    mandatory: true,
    list_table: 'sys_user',
    attributes: 'glide_list,ref_ac_columns=name;employee_number,ref_auto_completer=AJAXTableCompleter'
  });
  ensureVariable(producer, 'effective_date', {
    question_text: 'Endringen gjelder fra følgende dato',
    type: 10,
    order: 500,
    mandatory: true,
    help_text: 'Flytting skal skje fra den første i hver måned av regnskapsmessige årsaker.',
    instructions: 'Flytting skal skje fra den første i hver måned av regnskapsmessige årsaker.'
  });
  result.variables = { leader_role: vRole, change_type: vType, new_department: vDept, employees_to_move: vEmployees };

  var caseTemplate = ensure('sn_hr_core_template', 'name', 'STRY0013657 - LE case Endring av personaltilhørighet', {
    table: 'sn_hr_le_case',
    template: 'short_description=Endring av personaltilhørighet^state=10^EQ',
    short_description_for_employee: 'Endring av personaltilhørighet'
  }, SCOPE);
  result.case_template = caseTemplate;

  var taskTemplate = ensure('sn_hr_core_template', 'name', 'STRY0013657 - HR gjennomfører endring av personaltilhørighet', {
    table: 'sn_hr_core_task',
    parent_case_table: 'sn_hr_le_case',
    assignment_type: 'fulfiller',
    owning_group: HR_WORKFORCE_ADMIN,
    short_description_for_employee: 'HR gjennomfører endring av personaltilhørighet',
    template: 'short_description=HR gjennomfører endring av personaltilhørighet^hr_task_type=checklist^state=10^task_support_team=users_and_groups^assignment_group=' + HR_WORKFORCE_ADMIN + '^EQ'
  }, SCOPE);
  result.hr_task_template = taskTemplate;

  var leType = ensure('sn_hr_le_type', 'title', 'Endring av personaltilhørighet', {
    event_type: 'hr_services',
    active: true,
    display_activity_set: true,
    sort_activities_by: 'due_date'
  }, SCOPE);
  result.le_type = leType;

  var journeyConfig = ensure('sn_jny_journey_config', 'name', 'Journey for Endring av personaltilhørighet', {
    active: true,
    le_type: leType,
    type: JNY_TYPE,
    description: 'Journey for endring av personaltilhørighet med ledergodkjenning og HR-oppgave.',
    manager_field: 'opened_for',
    manager_field_table: 'sn_hr_le_case',
    manager_type: 'le_case_user',
    use_as_template: true
  }, SCOPE);
  result.journey_config = journeyConfig;

  var service = ensure('sn_hr_core_service', 'name', 'Endring av personaltilhørighet', {
    value: 'endring_av_personaltilhorighet',
    active: true,
    fulfillment_type: 'journey',
    service_table: 'sn_hr_le_case',
    producer: producer,
    template: caseTemplate,
    topic_detail: TOPIC_DETAIL,
    le_type: leType,
    journey_config: journeyConfig,
    description: 'Dette skjemaet benyttes for å gjøre endring av personaltilhørighet for en eller flere ansatte. Større omorganiseringer gjøres ved å kontakte strategisk HR.',
    fulfillment_instructions: '<p>HR gjør organisatoriske endringer i henhold til innmeldt skjema.</p>',
    subject_person_access: false
  }, SCOPE);
  result.service = service;

  var prod = new GlideRecord('sc_cat_item_producer');
  if (prod.get(producer)) {
    prod.setValue('script', [
      "(function() {",
      "  current.hr_service = '" + service + "';",
      "  current.short_description = 'Endring av personaltilhørighet';",
      "  current.u_new_department = producer.new_department;",
      "  var employees = String(producer.employees_to_move || '');",
      "  if (employees) current.subject_person = employees.split(',')[0];",
      "  current.description = 'Rolle: ' + producer.leader_role.getDisplayValue() + '\\n' +",
      "    'Endringen gjelder: ' + producer.change_type.getDisplayValue() + '\\n' +",
      "    'Ny organisatorisk enhet: ' + producer.new_department.getDisplayValue() + '\\n' +",
      "    'Leder for ny enhet/team: ' + producer.new_department_head.getDisplayValue() + '\\n' +",
      "    'Ansatte som skal flyttes: ' + producer.employees_to_move.getDisplayValue() + '\\n' +",
      "    'Gjelder fra: ' + producer.effective_date;",
      "  new sn_hr_le.hr_ActivityUtils().createCaseFromProducer(current, producer, cat_item.sys_id);",
      "})();"
    ].join('\\n'));
    prod.update();
  }

  var approvalSet = ensure('sn_hr_le_activity_set', 'title', 'Ledergodkjenning - Endring av personaltilhørighet', {
    le_type: leType,
    display_title: 'Ledergodkjenning',
    display_order: 100,
    trigger_type: 'immediate',
    active: true
  }, SCOPE);
  result.approval_set = approvalSet;

  result.incoming_approval_activity = ensure('sn_hr_le_activity', 'title', 'Mottakende leder godkjenner endringen', {
    activity_set: approvalSet,
    activity_type: 'approval',
    fulfiller_activity: FULFILLER_APPROVAL,
    owning_group: HR_ACTIVITY_WRITERS,
    approvers: receivingHeadOption,
    approval_accept_option: 'anyone',
    approval_reject_option: 'resubmit',
    missing_all_approvers: 'substitute',
    missing_some_approvers: 'skip',
    wait_for_generated_tasks_to_complete: true,
    order_number: 100,
    condition_table: 'sn_hr_le_case',
    condition: 'variables.' + vRole + '=avgivende_leder^EQ'
  }, SCOPE);

  result.outgoing_approval_activity = ensure('sn_hr_le_activity', 'title', 'Avgivende leder godkjenner endringen', {
    activity_set: approvalSet,
    activity_type: 'approval',
    fulfiller_activity: FULFILLER_APPROVAL,
    owning_group: HR_ACTIVITY_WRITERS,
    approvers: APPROVER_SUBJECT_MANAGER,
    approval_accept_option: 'anyone',
    approval_reject_option: 'resubmit',
    missing_all_approvers: 'substitute',
    missing_some_approvers: 'skip',
    wait_for_generated_tasks_to_complete: true,
    order_number: 200,
    condition_table: 'sn_hr_le_case',
    condition: 'variables.' + vRole + '=mottakende_leder^EQ'
  }, SCOPE);

  var hrSet = ensure('sn_hr_le_activity_set', 'title', 'HR behandling - Endring av personaltilhørighet', {
    le_type: leType,
    display_title: 'HR behandling',
    display_order: 200,
    trigger_type: 'other_activity_sets',
    activity_set_dependencies: approvalSet,
    active: true
  }, SCOPE);
  result.hr_set = hrSet;

  result.hr_task_activity = ensure('sn_hr_le_activity', 'title', 'HR gjennomfører organisatorisk endring', {
    activity_set: hrSet,
    activity_type: 'fulfiller',
    fulfiller_activity: FULFILLER_HR_TASK,
    hr_template: taskTemplate,
    owning_group: HR_ACTIVITY_WRITERS,
    order_number: 100,
    wait_for_generated_tasks_to_complete: true
  }, SCOPE);

  gs.print('CODEX_RESULT_START' + new global.JSON().encode(result) + 'CODEX_RESULT_END');
})();

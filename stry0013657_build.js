(function () {
  var SCOPE = 'd4ac3fff5b311200a4656ede91f91af2'; // Human Resources: Core
  var HR_CATALOG = '7b0370019f22120047a2d126c42e7075';
  var HR_CATEGORY = '32c78de49f331200d9011977677fcf97'; // HR Systems fallback category
  var WORKFORCE_TABLE = 'sn_hr_core_case_workforce_admin';
  var HR_GROUP = '2d07493377a33300d0e310389a10615a'; // HR Workforce Administration
  var TOPIC_CATEGORY = '06bc29ba53422200d901a7e6a11c0868'; // Employee Data Management
  var MANAGERS_USER_CRITERIA = '7a5370019f22120047a2d126c42e7066';
  var HR_CASE_WRITER_USER_CRITERIA = 'fa5370019f22120047a2d126c42e7066';
  var HEADER_OPENED_FOR = '86d9872eb3900300f5302ddc16a8dc8b';
  var HEADER_SUBJECT = 'c4e9872eb3900300f5302ddc16a8dc91';
  var EVENT_REJECTED = 'sn_hr_core.stry0013657.personaltilhorighet.rejected';

  var result = {};

  function first(table, field, value) {
    var gr = new GlideRecord(table);
    gr.addQuery(field, value);
    gr.setLimit(1);
    gr.query();
    return gr.next() ? gr : null;
  }

  function ensure(table, field, value, values) {
    var gr = new GlideRecord(table);
    gr.addQuery(field, value);
    gr.setLimit(1);
    gr.query();
    var exists = gr.next();
    if (!exists) {
      gr.initialize();
      gr.setValue(field, value);
    }
    for (var k in values) {
      if (values.hasOwnProperty(k) && gr.isValidField(k))
        gr.setValue(k, values[k]);
    }
    if (gr.isValidField('sys_scope')) gr.setValue('sys_scope', SCOPE);
    var id = exists ? gr.update() : gr.insert();
    if (!id) throw 'Failed to save ' + table + ' ' + value + ': ' + gr.getLastErrorMessage();
    return String(exists ? gr.getUniqueValue() : id);
  }

  function ensureChoice(questionId, text, value, order) {
    var gr = new GlideRecord('question_choice');
    gr.addQuery('question', questionId);
    gr.addQuery('value', value);
    gr.setLimit(1);
    gr.query();
    var exists = gr.next();
    if (!exists) {
      gr.initialize();
      gr.setValue('question', questionId);
      gr.setValue('value', value);
    }
    gr.setValue('text', text);
    gr.setValue('order', order);
    if (gr.isValidField('inactive')) gr.setValue('inactive', false);
    if (gr.isValidField('sys_scope')) gr.setValue('sys_scope', SCOPE);
    var id = exists ? gr.update() : gr.insert();
    if (!id) throw 'Failed to save choice ' + text + ': ' + gr.getLastErrorMessage();
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

  var topicDetail = ensure('sn_hr_core_topic_detail', 'name', 'Endring av personaltilhørighet', {
    topic_category: TOPIC_CATEGORY,
    active: true
  });
  result.topic_detail = topicDetail;

  var template = ensure('sn_hr_core_template', 'name', 'Endring av personaltilhørighet', {
    table: WORKFORCE_TABLE,
    parent_case_table: 'sn_hr_core_case',
    owning_group: HR_GROUP,
    template: 'short_description=Endring av personaltilhørighet^state=11^approval=requested^EQ',
    short_description_for_employee: 'Endring av personaltilhørighet'
  });
  result.template = template;

  var producerScript = [
    "(function() {",
    "  var employees = producer.employees_to_move + '';",
    "  current.short_description = 'Endring av personaltilhørighet';",
    "  current.opened_for = gs.getUserID();",
    "  current.hr_service = '__SERVICE_SYS_ID__';",
    "  current.assignment_group = '';",
    "  current.state = 11;",
    "  current.approval = 'requested';",
    "  if (producer.effective_date) current.change_date = producer.effective_date;",
    "  if (employees) current.subject_person = employees.split(',')[0];",
    "  var summary = [];",
    "  summary.push('Rolle: ' + producer.leader_role.getDisplayValue());",
    "  summary.push('Endringen gjelder: ' + producer.change_type.getDisplayValue());",
    "  summary.push('Ny organisatorisk enhet: ' + producer.new_department.getDisplayValue());",
    "  summary.push('Leder for ny enhet/team: ' + producer.new_department_head.getDisplayValue());",
    "  summary.push('Ansatte som skal flyttes: ' + producer.employees_to_move.getDisplayValue());",
    "  summary.push('Gjelder fra: ' + producer.effective_date);",
    "  current.description = summary.join('\\n');",
    "})();"
  ].join('\n');

  var producer = ensure('sc_cat_item_producer', 'name', 'Endring av personaltilhørighet', {
    active: true,
    table_name: WORKFORCE_TABLE,
    availability: 'on_both',
    short_description: 'Meld inn endring av personaltilhørighet for en eller flere ansatte.',
    description: '<p>Dette skjemaet benyttes for å gjøre endring av personaltilhørighet for en eller flere ansatte. Større omorganiseringer gjøres ved å kontakte strategisk HR.</p><p><strong>Tilgang:</strong> Skjema skal kun være tilgjengelig for HR og ledere ved FFI.</p>',
    meta: 'personaltilhørighet organisasjon organisatorisk enhet avdeling forskningsområde forskningsprogram leder HR FFI',
    script: producerScript,
    redirect_url: 'generated_record'
  });
  result.producer = producer;

  var vRole = ensureVariable(producer, 'leader_role', {
    question_text: 'Er du avgivende eller mottakende leder?',
    type: 5,
    order: 100,
    mandatory: true
  });
  ensureChoice(vRole, 'Avgivende leder', 'avgivende_leder', 100);
  ensureChoice(vRole, 'Mottakende leder', 'mottakende_leder', 200);

  var vType = ensureVariable(producer, 'change_type', {
    question_text: 'Hva gjelder endringen?',
    type: 5,
    order: 200,
    mandatory: true
  });
  ensureChoice(vType, 'Endring til ny avdeling', 'ny_avdeling', 100);
  ensureChoice(vType, 'Endring til nytt forskningsområde/enhet/team', 'nytt_forskningsomrade_enhet_team', 200);
  ensureChoice(vType, 'Endring til nytt forskningsprogram/gruppe/team', 'nytt_forskningsprogram_gruppe_team', 300);
  ensureChoice(vType, 'Leder', 'leder', 400);

  ensureVariable(producer, 'new_department', {
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

  ensureVariable(producer, 'employees_to_move', {
    question_text: 'Navn på den eller de som skal flyttes',
    type: 21,
    order: 400,
    mandatory: true,
    list_table: 'sys_user',
    reference: 'sys_user',
    attributes: 'ref_ac_columns=name;employee_number,ref_auto_completer=AJAXTableCompleter'
  });

  ensureVariable(producer, 'effective_date', {
    question_text: 'Endringen gjelder fra følgende dato',
    type: 10,
    order: 500,
    mandatory: true,
    help_text: 'Flytting skal skje fra den første i hver måned av regnskapsmessige årsaker.',
    instructions: 'Flytting skal skje fra den første i hver måned av regnskapsmessige årsaker.'
  });

  var criteriaManagers = ensure('sn_hr_core_criteria', 'name', 'STRY0013657 - Ledere', {
    description: 'Tilgang for brukere som er ledere.',
    related_user_criteria: MANAGERS_USER_CRITERIA,
    active: true
  });
  var criteriaHr = ensure('sn_hr_core_criteria', 'name', 'STRY0013657 - HR saksbehandlere', {
    description: 'Tilgang for HR-brukere som kan skrive HR-saker.',
    related_user_criteria: HR_CASE_WRITER_USER_CRITERIA,
    active: true
  });
  result.hr_criteria = criteriaManagers + ',' + criteriaHr;

  var service = ensure('sn_hr_core_service', 'name', 'Endring av personaltilhørighet', {
    value: 'endring_av_personaltilhorighet',
    active: true,
    fulfillment_type: 'simple',
    service_table: WORKFORCE_TABLE,
    producer: producer,
    template: template,
    topic_detail: topicDetail,
    hr_criteria: criteriaManagers + ',' + criteriaHr,
    header_config_opened_for: HEADER_OPENED_FOR,
    header_config_subject_person: HEADER_SUBJECT,
    subject_person_access: false,
    description: 'Dette skjemaet benyttes for å gjøre endring av personaltilhørighet for en eller flere ansatte. Større omorganiseringer gjøres ved å kontakte strategisk HR.',
    fulfillment_instructions: '<p>HR gjør organisatoriske endringer i henhold til innmeldt skjema.</p>'
  });
  result.service = service;

  var prodGr = new GlideRecord('sc_cat_item_producer');
  if (prodGr.get(producer)) {
    prodGr.setValue('script', producerScript.replace('__SERVICE_SYS_ID__', service));
    prodGr.update();
  }

  var utilScript = "var STRY0013657PersonaltilhorighetUtil = Class.create();\n" +
    "STRY0013657PersonaltilhorighetUtil.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {\n" +
    "  SERVICE: '" + service + "',\n" +
    "  HR_GROUP: '" + HR_GROUP + "',\n" +
    "  getDepartmentHead: function() {\n" +
    "    var deptId = this.getParameter('sysparm_department') || '';\n" +
    "    var answer = { sys_id: '', display: '' };\n" +
    "    var dept = new GlideRecord('cmn_department');\n" +
    "    if (deptId && dept.get(deptId) && dept.dept_head) {\n" +
    "      answer.sys_id = String(dept.getValue('dept_head'));\n" +
    "      answer.display = String(dept.dept_head.getDisplayValue());\n" +
    "    }\n" +
    "    return new global.JSON().encode(answer);\n" +
    "  },\n" +
    "  isTargetCase: function(caseGr) {\n" +
    "    return caseGr && caseGr.isValidRecord() && String(caseGr.getValue('hr_service')) === this.SERVICE;\n" +
    "  },\n" +
    "  getVariable: function(caseGr, name) {\n" +
    "    try { if (caseGr.variables && caseGr.variables[name]) return String(caseGr.variables[name]); } catch (e) {}\n" +
    "    return '';\n" +
    "  },\n" +
    "  getApprovers: function(caseGr) {\n" +
    "    var role = this.getVariable(caseGr, 'leader_role');\n" +
    "    var approvers = {};\n" +
    "    if (role === 'avgivende_leder') {\n" +
    "      var deptId = this.getVariable(caseGr, 'new_department');\n" +
    "      var dept = new GlideRecord('cmn_department');\n" +
    "      if (deptId && dept.get(deptId) && dept.getValue('dept_head')) approvers[String(dept.getValue('dept_head'))] = true;\n" +
    "    } else {\n" +
    "      var employees = this.getVariable(caseGr, 'employees_to_move').split(',');\n" +
    "      for (var i = 0; i < employees.length; i++) {\n" +
    "        var userId = employees[i].trim();\n" +
    "        if (!userId) continue;\n" +
    "        var user = new GlideRecord('sys_user');\n" +
    "        if (user.get(userId)) {\n" +
    "          if (user.getValue('manager')) approvers[String(user.getValue('manager'))] = true;\n" +
    "          else if (user.department && user.department.dept_head) approvers[String(user.department.dept_head)] = true;\n" +
    "        }\n" +
    "      }\n" +
    "    }\n" +
    "    var list = [];\n" +
    "    for (var id in approvers) if (approvers.hasOwnProperty(id) && id) list.push(id);\n" +
    "    return list;\n" +
    "  },\n" +
    "  getLatestApprovalComment: function(approvalId) {\n" +
    "    var jf = new GlideRecord('sys_journal_field');\n" +
    "    jf.addQuery('element_id', approvalId);\n" +
    "    jf.addQuery('element', 'comments');\n" +
    "    jf.orderByDesc('sys_created_on');\n" +
    "    jf.setLimit(1);\n" +
    "    jf.query();\n" +
    "    return jf.next() ? String(jf.getValue('value')) : '';\n" +
    "  },\n" +
    "  type: 'STRY0013657PersonaltilhorighetUtil'\n" +
    "});";

  result.script_include = ensure('sys_script_include', 'name', 'STRY0013657PersonaltilhorighetUtil', {
    active: true,
    client_callable: true,
    access: 'public',
    description: 'Approval and department helper for Endring av personaltilhørighet.',
    script: utilScript,
    api_name: 'sn_hr_core.STRY0013657PersonaltilhorighetUtil'
  });

  var clientScript = [
    "function onChange(control, oldValue, newValue, isLoading) {",
    "  if (isLoading) return;",
    "  g_form.clearValue('new_department_head');",
    "  if (!newValue) return;",
    "  var ga = new GlideAjax('sn_hr_core.STRY0013657PersonaltilhorighetUtil');",
    "  ga.addParam('sysparm_name', 'getDepartmentHead');",
    "  ga.addParam('sysparm_department', newValue);",
    "  ga.getXMLAnswer(function(answer) {",
    "    if (!answer) return;",
    "    var data = JSON.parse(answer);",
    "    if (data.sys_id) g_form.setValue('new_department_head', data.sys_id, data.display);",
    "  });",
    "}"
  ].join('\n');
  result.client_script = ensure('catalog_script_client', 'name', 'STRY0013657 - Populate department head', {
    active: true,
    type: 'onChange',
    ui_type: 10,
    applies_to: 'item',
    applies_catalog: true,
    cat_item: producer,
    cat_variable: 'new_department',
    script: clientScript
  });

  var caseBrScript = "(function executeRule(current, previous) {\n" +
    "  var util = new sn_hr_core.STRY0013657PersonaltilhorighetUtil();\n" +
    "  if (!util.isTargetCase(current)) return;\n" +
    "  var approvers = util.getApprovers(current);\n" +
    "  if (!approvers.length) {\n" +
    "    current.work_notes = 'Fant ingen ledergodkjenner. Saken er sendt til HR Workforce Administration for manuell vurdering.';\n" +
    "    current.assignment_group = util.HR_GROUP;\n" +
    "    current.state = 10;\n" +
    "    current.approval = 'not requested';\n" +
    "    current.update();\n" +
    "    return;\n" +
    "  }\n" +
    "  for (var i = 0; i < approvers.length; i++) {\n" +
    "    var appr = new GlideRecord('sysapproval_approver');\n" +
    "    appr.initialize();\n" +
    "    appr.sysapproval = current.sys_id;\n" +
    "    appr.source_table = current.getTableName();\n" +
    "    appr.document_id = current.sys_id;\n" +
    "    appr.approver = approvers[i];\n" +
    "    appr.state = 'requested';\n" +
    "    appr.approval_column = 'approval';\n" +
    "    appr.approval_journal_column = 'approval_history';\n" +
    "    appr.insert();\n" +
    "  }\n" +
    "})(current, previous);";
  result.case_business_rule = ensure('sys_script', 'name', 'STRY0013657 - Create personaltilhorighet approval', {
    active: true,
    collection: WORKFORCE_TABLE,
    when: 'after',
    action_insert: true,
    action_update: false,
    advanced: true,
    order: 100,
    script: caseBrScript
  });

  var approvalBrScript = "(function executeRule(current, previous) {\n" +
    "  if (!current.sysapproval) return;\n" +
    "  var c = new GlideRecord('sn_hr_core_case_workforce_admin');\n" +
    "  if (!c.get(current.sysapproval)) return;\n" +
    "  var util = new sn_hr_core.STRY0013657PersonaltilhorighetUtil();\n" +
    "  if (!util.isTargetCase(c)) return;\n" +
    "  if (current.state == 'rejected') {\n" +
    "    var reason = util.getLatestApprovalComment(current.getUniqueValue()) || 'Ingen begrunnelse registrert.';\n" +
    "    c.comments = 'Organisatorisk endringsforespørsel avvist av ' + current.approver.getDisplayValue() + ': ' + reason;\n" +
    "    c.work_notes = 'Saken avsluttes fordi ledergodkjenning ble avvist.';\n" +
    "    c.approval = 'rejected';\n" +
    "    c.state = 4;\n" +
    "    c.update();\n" +
    "    gs.eventQueue('" + EVENT_REJECTED + "', c, c.getValue('opened_for'), reason);\n" +
    "    return;\n" +
    "  }\n" +
    "  if (current.state == 'approved') {\n" +
    "    var pending = new GlideRecord('sysapproval_approver');\n" +
    "    pending.addQuery('sysapproval', c.getUniqueValue());\n" +
    "    pending.addQuery('state', 'requested');\n" +
    "    pending.setLimit(1);\n" +
    "    pending.query();\n" +
    "    if (!pending.hasNext()) {\n" +
    "      c.approval = 'approved';\n" +
    "      c.state = 10;\n" +
    "      c.assignment_group = util.HR_GROUP;\n" +
    "      c.work_notes = 'Ledergodkjenning fullført. Saken er sendt til HR Workforce Administration for gjennomføring.';\n" +
    "      c.update();\n" +
    "    }\n" +
    "  }\n" +
    "})(current, previous);";
  result.approval_business_rule = ensure('sys_script', 'name', 'STRY0013657 - Complete personaltilhorighet approval', {
    active: true,
    collection: 'sysapproval_approver',
    when: 'after',
    action_insert: false,
    action_update: true,
    advanced: true,
    filter_condition: 'stateCHANGES',
    order: 100,
    script: approvalBrScript
  });

  result.event = ensure('sysevent_register', 'event_name', EVENT_REJECTED, {
    table: WORKFORCE_TABLE,
    description: 'Fired when Endring av personaltilhørighet approval is rejected.'
  });

  var rejectionMailScript = "(function runMailScript(current, template, email, email_action, event) {\n" +
    "  template.print('<p>Din sak om endring av personaltilhørighet er avvist.</p>');\n" +
    "  template.print('<p><strong>Begrunnelse:</strong><br>' + GlideStringUtil.escapeHTML(event.parm2 || 'Ingen begrunnelse registrert.') + '</p>');\n" +
    "  template.print('<p>Saken er avsluttet.</p>');\n" +
    "})(current, template, email, email_action, event);";
  result.rejection_mail_script = ensure('sys_script_email', 'name', 'STRY0013657_personaltilhorighet_rejected', {
    script: rejectionMailScript,
    new_lines_to_html: false
  });

  result.approval_notification = ensure('sysevent_email_action', 'name', 'STRY0013657 - Godkjenning endring av personaltilhørighet', {
    active: true,
    collection: 'sysapproval_approver',
    event_name: 'approval.inserted',
    recipient_fields: 'approver',
    weight: 20,
    subject: 'Godkjenning: Endring av personaltilhørighet',
    advanced_condition: "answer = current.sysapproval && current.sysapproval.hr_service == '" + service + "';",
    message_html: '<p>Det er meldt inn en sak om endring av personaltilhørighet som påvirker ditt team. Les gjennom innmeldt informasjon og godkjenn eller avvis den organisatoriske endringsforespørselen.</p><p>${URI_REF}</p>'
  });

  result.rejection_notification = ensure('sysevent_email_action', 'name', 'STRY0013657 - Avvist endring av personaltilhørighet', {
    active: true,
    collection: WORKFORCE_TABLE,
    event_name: EVENT_REJECTED,
    event_parm_1: true,
    weight: 20,
    subject: 'Endring av personaltilhørighet er avvist',
    message_html: '<p>${mail_script:STRY0013657_personaltilhorighet_rejected}</p>'
  });

  gs.print('CODEX_RESULT_START' + new global.JSON().encode(result) + 'CODEX_RESULT_END');
})();

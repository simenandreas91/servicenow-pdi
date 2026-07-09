$ErrorActionPreference = 'Stop'

$tableScript = '/root/.agents/skills/servicenow-pdi/scripts/Invoke-ServiceNowTable.ps1'
$profile = 'other'
$envPath = '/root/codex-workspace/.env'
$hrCoreScope = 'd4ac3fff5b311200a4656ede91f91af2'
$vaarTemplate = '1462e7ca918a3010f877b1d70a4d6a3d'

function Invoke-Table {
  param(
    [ValidateSet('GET', 'POST', 'PATCH')]
    [string]$Method = 'GET',
    [Parameter(Mandatory = $true)]
    [string]$Table,
    [string]$SysId,
    [string]$Query,
    [string]$Fields,
    [int]$Limit = 10,
    [hashtable]$Body
  )

  $params = @{
    Method = $Method
    Table = $Table
    DisplayValue = 'all'
    ExcludeReferenceLink = $true
    Profile = $profile
    EnvPath = $envPath
  }
  if ($SysId) { $params.SysId = $SysId }
  if ($Query) { $params.Query = $Query }
  if ($Fields) { $params.Fields = $Fields }
  if ($Method -eq 'GET') { $params.Limit = $Limit }
  if ($Body) { $params.BodyJson = ($Body | ConvertTo-Json -Depth 20 -Compress) }
  (& $tableScript @params) | ConvertFrom-Json
}

function Get-Value {
  param($Record, [string]$Field)
  $value = $Record.$Field
  if ($null -eq $value) { return $null }
  if ($value.PSObject.Properties.Name -contains 'value') { return $value.value }
  return $value
}

function Ensure-Record {
  param(
    [Parameter(Mandatory = $true)][string]$Table,
    [Parameter(Mandatory = $true)][string]$Query,
    [Parameter(Mandatory = $true)][hashtable]$Body,
    [Parameter(Mandatory = $true)][string]$Fields
  )

  $existing = Invoke-Table -Table $Table -Query $Query -Fields $Fields -Limit 1
  if (@($existing.result).Count -gt 0) {
    $sysId = Get-Value $existing.result[0] 'sys_id'
    return Invoke-Table -Method PATCH -Table $Table -SysId $sysId -Fields $Fields -Body $Body
  }
  return Invoke-Table -Method POST -Table $Table -Fields $Fields -Body $Body
}

$stampRuleScript = @'
(function executeRule(current, previous) {
    var awaitingAcceptance = '20';
    var currentState = current.getValue('state');
    var previousState = previous ? previous.getValue('state') : '';
    var enteredAwaitingAcceptance = currentState == awaitingAcceptance &&
        previousState != awaitingAcceptance;
    var leftAwaitingAcceptance = previousState == awaitingAcceptance &&
        currentState != awaitingAcceptance;

    if (enteredAwaitingAcceptance) {
        current.setValue('u_proposed_solution_at', new GlideDateTime());
        current.setValue('u_proposed_solution_reminder_sent', false);
        return;
    }

    if (leftAwaitingAcceptance) {
        current.setValue('u_proposed_solution_at', '');
        current.setValue('u_proposed_solution_reminder_sent', false);
    }
})(current, previous);
'@

$scheduledScript = @'
(function processProposedSolutions() {
    var AWAITING_ACCEPTANCE = '20';
    var CLOSED_COMPLETE = '3';
    var BUSINESS_SCHEDULE = '090eecae0a0a0b260077e1dfa71da828';
    var REMINDER_DURATION_MS = 27 * 60 * 60 * 1000;
    var CLOSE_DURATION_MS = 63 * 60 * 60 * 1000;
    var REMINDER_EVENT = 'sn_hr_core.proposed_solution_reminder';
    var AUTO_CLOSE_NOTE = 'Closed automatically because no employee response was received within 7 business days after the proposed solution.';

    var now = new GlideDateTime();
    var schedule = new GlideSchedule(BUSINESS_SCHEDULE);
    var hrCase = new GlideRecord('sn_hr_core_case');
    hrCase.addQuery('state', AWAITING_ACCEPTANCE);
    hrCase.addNotNullQuery('u_proposed_solution_at');
    hrCase.query();

    while (hrCase.next()) {
        if (hasEmployeeCommentSinceProposal(hrCase))
            continue;

        var elapsed = schedule.duration(new GlideDateTime(hrCase.u_proposed_solution_at), now).getNumericValue();
        if (elapsed >= CLOSE_DURATION_MS) {
            hrCase.close_notes = AUTO_CLOSE_NOTE;
            hrCase.state = CLOSED_COMPLETE;
            hrCase.update();
            continue;
        }

        if (!hrCase.u_proposed_solution_reminder_sent && elapsed >= REMINDER_DURATION_MS) {
            gs.eventQueue(REMINDER_EVENT, hrCase);
            hrCase.u_proposed_solution_reminder_sent = true;
            hrCase.update();
        }
    }

    function hasEmployeeCommentSinceProposal(hrCase) {
        var employeeUserNames = {};
        addUserName(employeeUserNames, hrCase.opened_for);
        addUserName(employeeUserNames, hrCase.opened_by);

        var journal = new GlideRecord('sys_journal_field');
        journal.addQuery('name', 'sn_hr_core_case');
        journal.addQuery('element_id', hrCase.getUniqueValue());
        journal.addQuery('element', 'comments');
        journal.addQuery('sys_created_on', '>=', hrCase.u_proposed_solution_at);
        journal.query();
        while (journal.next()) {
            if (employeeUserNames[String(journal.sys_created_by)])
                return true;
        }
        return false;
    }

    function addUserName(userNames, userReference) {
        if (!userReference)
            return;

        var user = userReference.getRefRecord();
        if (user.isValidRecord() && user.user_name)
            userNames[String(user.user_name)] = true;
    }
})();
'@

$notificationBody = '<div style="font-family: lato, arial, sans; font-size: 12pt; line-height: 1.5;"><p>HR has proposed a solution for your case.</p><p>Please open the case in Employee Center to review the proposed solution and respond if you need more help.</p><div>${mail_script:hr_link}</div></div>'
$reminderBody = '<div style="font-family: lato, arial, sans; font-size: 12pt; line-height: 1.5;"><p>This is a reminder that HR has proposed a solution for your case.</p><p>Please open the case in Employee Center to review it and respond if you need more help.</p><div>${mail_script:hr_link}</div></div>'

$records = [ordered]@{}

$records.proposed_solution_at = Ensure-Record `
  -Table 'sys_dictionary' `
  -Query 'name=sn_hr_core_case^element=u_proposed_solution_at' `
  -Fields 'sys_id,name,element,column_label,internal_type,sys_scope,sys_package' `
  -Body @{
    name = 'sn_hr_core_case'
    element = 'u_proposed_solution_at'
    column_label = 'Proposed solution at'
    internal_type = 'glide_date_time'
    sys_scope = $hrCoreScope
    sys_package = $hrCoreScope
  }

$records.proposed_solution_reminder_sent = Ensure-Record `
  -Table 'sys_dictionary' `
  -Query 'name=sn_hr_core_case^element=u_proposed_solution_reminder_sent' `
  -Fields 'sys_id,name,element,column_label,internal_type,sys_scope,sys_package' `
  -Body @{
    name = 'sn_hr_core_case'
    element = 'u_proposed_solution_reminder_sent'
    column_label = 'Proposed solution reminder sent'
    internal_type = 'boolean'
    default_value = 'false'
    sys_scope = $hrCoreScope
    sys_package = $hrCoreScope
  }

$records.stamp_rule = Ensure-Record `
  -Table 'sys_script' `
  -Query 'nameSTARTSWITHVår Energi - Track proposed solution^collection=sn_hr_core_case' `
  -Fields 'sys_id,name,collection,active,when,order,script,sys_scope,sys_package' `
  -Body @{
    name = 'Vår Energi - Track proposed solution'
    collection = 'sn_hr_core_case'
    active = $true
    when = 'before'
    order = '50'
    action_insert = $true
    action_update = $true
    advanced = $true
    script = $stampRuleScript
    sys_scope = $hrCoreScope
    sys_package = $hrCoreScope
  }

$records.reminder_event = Ensure-Record `
  -Table 'sysevent_register' `
  -Query 'event_name=sn_hr_core.proposed_solution_reminder' `
  -Fields 'sys_id,event_name,table,description,sys_scope,sys_package' `
  -Body @{
    event_name = 'sn_hr_core.proposed_solution_reminder'
    table = 'sn_hr_core_case'
    description = 'Reminder after three business days without an employee comment on an HR proposed solution.'
    sys_scope = $hrCoreScope
    sys_package = $hrCoreScope
  }

$records.proposal_notification = Ensure-Record `
  -Table 'sysevent_email_action' `
  -Query 'event_name=sn_hr_core_case.feedback^subject=Proposed solution for HR case ${number}^sys_scope=d4ac3fff5b311200a4656ede91f91af2' `
  -Fields 'sys_id,name,event_name,active,collection,subject,template,recipient_fields,message_html,sys_scope,sys_package' `
  -Body @{
    name = 'Vår Energi - Proposed solution'
    event_name = 'sn_hr_core_case.feedback'
    generation_type = 'event'
    collection = 'sn_hr_core_case'
    active = $true
    subject = 'Proposed solution for HR case ${number}'
    template = $vaarTemplate
    recipient_fields = 'opened_for'
    message_html = $notificationBody
    sys_scope = $hrCoreScope
    sys_package = $hrCoreScope
  }

$records.reminder_notification = Ensure-Record `
  -Table 'sysevent_email_action' `
  -Query 'event_name=sn_hr_core.proposed_solution_reminder^subject=Reminder: proposed solution for HR case ${number}^sys_scope=d4ac3fff5b311200a4656ede91f91af2' `
  -Fields 'sys_id,name,event_name,active,collection,subject,template,recipient_fields,message_html,sys_scope,sys_package' `
  -Body @{
    name = 'Vår Energi - Proposed solution reminder'
    event_name = 'sn_hr_core.proposed_solution_reminder'
    generation_type = 'event'
    collection = 'sn_hr_core_case'
    active = $true
    subject = 'Reminder: proposed solution for HR case ${number}'
    template = $vaarTemplate
    recipient_fields = 'opened_for'
    message_html = $reminderBody
    sys_scope = $hrCoreScope
    sys_package = $hrCoreScope
  }

$records.scheduled_job = Ensure-Record `
  -Table 'sysauto_script' `
  -Query 'name=Vår Energi - Process HR proposed solution response windows^sys_scope=d4ac3fff5b311200a4656ede91f91af2' `
  -Fields 'sys_id,name,active,run_type,run_time,run_start,script,sys_scope,sys_package' `
  -Body @{
    name = 'Vår Energi - Process HR proposed solution response windows'
    active = $true
    run_type = 'daily'
    run_time = '1970-01-01 10:00:00'
    run_start = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    script = $scheduledScript
    sys_scope = $hrCoreScope
    sys_package = $hrCoreScope
  }

$records | ConvertTo-Json -Depth 20

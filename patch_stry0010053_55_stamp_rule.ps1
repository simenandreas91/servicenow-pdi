$ErrorActionPreference = 'Stop'

$script = @'
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

$body = @{
  order = '50'
  script = $script
} | ConvertTo-Json -Compress

& '/root/.agents/skills/servicenow-pdi/scripts/Invoke-ServiceNowTable.ps1' `
  -Method PATCH `
  -Table sys_script `
  -SysId ee307bb821c9c350d8cb70a2b1956a74 `
  -BodyJson $body `
  -Fields 'sys_id,name,script,sys_scope,sys_package,sys_updated_on' `
  -DisplayValue all `
  -ExcludeReferenceLink `
  -Profile other `
  -EnvPath /root/codex-workspace/.env

param(
  [Parameter(Mandatory = $true)]
  [string]$EventName,

  [string]$RecordTable,
  [string]$RecordSysId,
  [string]$Parm1 = '',
  [string]$Parm2 = '',
  [switch]$Trigger,
  [int]$WaitSeconds = 3,
  [string]$CachePath,
  [int]$CacheTtlMinutes = 5,
  [switch]$Refresh,
  [switch]$NoCache,
  [string]$Profile,
  [string]$EnvPath,
  [string]$Instance
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_ServiceNowToolkitCommon.ps1')

$eventRegister = Invoke-ServiceNowToolkitTable `
  -Table 'sysevent_register' `
  -Query "event_name=$EventName" `
  -Fields 'sys_id,event_name,table,description,queue,sys_scope' `
  -Limit 20 `
  -DisplayValue all `
  -ExcludeReferenceLink `
  -Profile $Profile `
  -EnvPath $EnvPath `
  -Instance $Instance `
  -CachePath $CachePath `
  -CacheTtlMinutes $CacheTtlMinutes `
  -Refresh:$Refresh `
  -NoCache:$NoCache

$notifications = Invoke-ServiceNowToolkitTable `
  -Table 'sysevent_email_action' `
  -Query "event_name=$EventName" `
  -Fields 'sys_id,name,active,event_name,collection,subject,generation_type,event_parm_1,event_parm_2,recipient_fields,recipient_users,recipient_groups,condition,advanced_condition,sys_scope' `
  -Limit 100 `
  -DisplayValue all `
  -ExcludeReferenceLink `
  -Profile $Profile `
  -EnvPath $EnvPath `
  -Instance $Instance `
  -CachePath $CachePath `
  -CacheTtlMinutes $CacheTtlMinutes `
  -Refresh:$Refresh `
  -NoCache:$NoCache

$triggerResult = $null
if ($Trigger) {
  if (-not $RecordTable -or -not $RecordSysId) {
    throw 'Pass -RecordTable and -RecordSysId when using -Trigger.'
  }

  $safeTable = $RecordTable.Replace("'", "\\'")
  $safeSysId = $RecordSysId.Replace("'", "\\'")
  $safeEvent = $EventName.Replace("'", "\\'")
  $safeParm1 = $Parm1.Replace("'", "\\'")
  $safeParm2 = $Parm2.Replace("'", "\\'")

  $serverScript = @"
(function () {
  var result = { queued: false };
  var gr = new GlideRecord('$safeTable');
  if (!gr.get('$safeSysId')) {
    result.error = 'record_not_found';
    gs.print('CODEX_RESULT_START' + JSON.stringify(result) + 'CODEX_RESULT_END');
    return;
  }
  gs.eventQueue('$safeEvent', gr, '$safeParm1', '$safeParm2');
  result.queued = true;
  result.table = '$safeTable';
  result.sys_id = gr.getUniqueValue();
  result.parm1 = '$safeParm1';
  result.parm2 = '$safeParm2';
  gs.print('CODEX_RESULT_START' + JSON.stringify(result) + 'CODEX_RESULT_END');
})();
"@

  $xploreScript = Join-Path $PSScriptRoot 'Invoke-ServiceNowXploreScript.ps1'
  $xParams = @{ Script = $serverScript }
  if ($Profile) { $xParams.Profile = $Profile }
  if ($EnvPath) { $xParams.EnvPath = $EnvPath }
  if ($Instance) { $xParams.Instance = $Instance }
  $triggerResult = (& $xploreScript @xParams) | ConvertFrom-Json

  if ($WaitSeconds -gt 0) {
    Start-Sleep -Seconds $WaitSeconds
  }
}

$eventQuery = "name=$EventName"
if ($RecordSysId) { $eventQuery += "^instance=$RecordSysId" }
$eventQuery += '^sys_created_onONToday@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()^ORDERBYDESCsys_created_on'

$events = Invoke-ServiceNowToolkitTable `
  -Table 'sysevent' `
  -Query $eventQuery `
  -Fields 'sys_id,name,instance,parm1,parm2,state,sys_created_on' `
  -Limit 25 `
  -DisplayValue all `
  -ExcludeReferenceLink `
  -Profile $Profile `
  -EnvPath $EnvPath `
  -Instance $Instance `
  -CachePath $CachePath `
  -CacheTtlMinutes 0 `
  -Refresh `
  -NoCache

$emailQuery = 'sys_created_onONToday@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()^ORDERBYDESCsys_created_on'
if ($RecordTable) { $emailQuery = "target_table=$RecordTable^" + $emailQuery }
if ($RecordSysId) { $emailQuery = "instance=$RecordSysId^" + $emailQuery }

$emails = Invoke-ServiceNowToolkitTable `
  -Table 'sys_email' `
  -Query $emailQuery `
  -Fields 'sys_id,subject,recipients,type,state,target_table,instance,sys_created_on' `
  -Limit 25 `
  -DisplayValue all `
  -ExcludeReferenceLink `
  -Profile $Profile `
  -EnvPath $EnvPath `
  -Instance $Instance `
  -CachePath $CachePath `
  -CacheTtlMinutes 0 `
  -Refresh `
  -NoCache

$notificationRows = @($notifications.result | ForEach-Object { Convert-ServiceNowToolkitRow -Row $_ })
$warnings = [System.Collections.Generic.List[string]]::new()
foreach ($notification in $notificationRows) {
  if ($notification.generation_type -ne 'event') {
    $warnings.Add("Notification '$($notification.name)' has generation_type '$($notification.generation_type)', expected 'event' for event-driven email.")
  }
  if ($notification.event_parm_1 -eq 'true' -and [string]::IsNullOrWhiteSpace($Parm1) -and $Trigger) {
    $warnings.Add("Notification '$($notification.name)' uses event parm 1 as recipient, but -Parm1 was empty.")
  }
}

[ordered]@{
  tested_at = (Get-Date).ToString('o')
  event_name = $EventName
  trigger = $triggerResult
  event_register = @($eventRegister.result | ForEach-Object { Convert-ServiceNowToolkitRow -Row $_ })
  notifications = $notificationRows
  warnings = @($warnings)
  events_today = @($events.result | ForEach-Object { Convert-ServiceNowToolkitRow -Row $_ })
  emails_today = @($emails.result | ForEach-Object { Convert-ServiceNowToolkitRow -Row $_ })
} | ConvertTo-Json -Depth 20

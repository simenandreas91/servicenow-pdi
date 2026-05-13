param(
  [Parameter(Mandatory = $true)]
  [string]$Scope,

  [string[]]$Tables,
  [switch]$IncludeScriptBodies,
  [string]$CachePath,
  [int]$CacheTtlMinutes = 30,
  [switch]$Refresh,
  [switch]$NoCache,
  [string]$Profile,
  [string]$EnvPath,
  [string]$Instance
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_ServiceNowToolkitCommon.ps1')

if (-not $Tables -or $Tables.Count -eq 0) {
  $Tables = Get-ServiceNowToolkitDefaultArtifactTables
}

$scopeInfo = Resolve-ServiceNowToolkitScope `
  -Scope $Scope `
  -Profile $Profile `
  -EnvPath $EnvPath `
  -Instance $Instance `
  -CachePath $CachePath `
  -Refresh:$Refresh `
  -NoCache:$NoCache

$fieldMap = @{
  sys_script_include = 'sys_id,name,api_name,active,client_callable,sys_updated_on,sys_scope'
  sys_script = 'sys_id,name,collection,active,when,order,sys_updated_on,sys_scope'
  sys_script_client = 'sys_id,name,table,active,type,ui_type,sys_updated_on,sys_scope'
  sys_ui_action = 'sys_id,name,table,active,action_name,order,sys_updated_on,sys_scope'
  sys_ui_page = 'sys_id,name,active,sys_updated_on,sys_scope'
  sysauto_script = 'sys_id,name,active,run_type,run_time,sys_updated_on,sys_scope'
  sysevent_register = 'sys_id,event_name,table,description,queue,sys_updated_on,sys_scope'
  sysevent_email_action = 'sys_id,name,active,event_name,collection,subject,generation_type,sys_updated_on,sys_scope'
  sys_security_acl = 'sys_id,name,operation,type,active,admin_overrides,sys_updated_on,sys_scope'
  sys_script_fix = 'sys_id,name,active,unloadable,before,sys_updated_on,sys_scope'
  sys_transform_map = 'sys_id,name,source_table,target_table,active,sys_updated_on,sys_scope'
  sys_data_source = 'sys_id,name,type,import_set_table_name,sys_updated_on,sys_scope'
  sp_widget = 'sys_id,name,id,sys_updated_on,sys_scope'
}

$scriptFields = @{
  sys_script_include = ',script'
  sys_script = ',script,condition'
  sys_script_client = ',script'
  sys_ui_action = ',script,condition,client_script_v2'
  sys_ui_page = ',html,client_script,processing_script'
  sysauto_script = ',script,condition'
  sysevent_email_action = ',message_html,message_text,advanced_condition'
  sys_security_acl = ',script,condition'
  sys_script_fix = ',script'
  sys_transform_map = ',script'
  sys_data_source = ',data_loader,parsing_script'
  sp_widget = ',template,script,client_script,css,link'
}

$inventory = [ordered]@{
  generated_at = (Get-Date).ToString('o')
  scope = $scopeInfo
  tables = [ordered]@{}
}

foreach ($table in $Tables) {
  $fields = if ($fieldMap.ContainsKey($table)) { $fieldMap[$table] } else { 'sys_id,name,sys_updated_on,sys_scope' }
  if ($IncludeScriptBodies -and $scriptFields.ContainsKey($table)) {
    $fields += $scriptFields[$table]
  }

  $response = Invoke-ServiceNowToolkitTable `
    -Table $table `
    -Query "sys_scope=$($scopeInfo.sys_id)^ORDERBYname" `
    -Fields $fields `
    -Limit 500 `
    -DisplayValue all `
    -ExcludeReferenceLink `
    -Profile $Profile `
    -EnvPath $EnvPath `
    -Instance $Instance `
    -CachePath $CachePath `
    -CacheTtlMinutes $CacheTtlMinutes `
    -Refresh:$Refresh `
    -NoCache:$NoCache

  $rows = @($response.result | ForEach-Object { Convert-ServiceNowToolkitRow -Row $_ })
  $inventory.tables[$table] = [ordered]@{
    count = $rows.Count
    records = $rows
  }
}

$inventory | ConvertTo-Json -Depth 20

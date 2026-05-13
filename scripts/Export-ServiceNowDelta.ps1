param(
  [Parameter(Mandatory = $true)]
  [string]$Scope,

  [Parameter(Mandatory = $true)]
  [string]$Since,

  [string[]]$Tables,
  [string]$OutputPath,
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
  sys_script_include = 'sys_id,name,api_name,active,sys_updated_on,sys_updated_by,sys_scope'
  sys_script = 'sys_id,name,collection,active,when,sys_updated_on,sys_updated_by,sys_scope'
  sys_script_client = 'sys_id,name,table,active,type,sys_updated_on,sys_updated_by,sys_scope'
  sys_ui_action = 'sys_id,name,table,active,action_name,sys_updated_on,sys_updated_by,sys_scope'
  sys_ui_page = 'sys_id,name,active,sys_updated_on,sys_updated_by,sys_scope'
  sysauto_script = 'sys_id,name,active,run_type,sys_updated_on,sys_updated_by,sys_scope'
  sysevent_register = 'sys_id,event_name,table,description,sys_updated_on,sys_updated_by,sys_scope'
  sysevent_email_action = 'sys_id,name,active,event_name,collection,subject,sys_updated_on,sys_updated_by,sys_scope'
  sys_security_acl = 'sys_id,name,operation,type,active,sys_updated_on,sys_updated_by,sys_scope'
  sys_script_fix = 'sys_id,name,active,sys_updated_on,sys_updated_by,sys_scope'
  sys_transform_map = 'sys_id,name,source_table,target_table,active,sys_updated_on,sys_updated_by,sys_scope'
  sys_data_source = 'sys_id,name,type,import_set_table_name,sys_updated_on,sys_updated_by,sys_scope'
  sp_widget = 'sys_id,name,id,sys_updated_on,sys_updated_by,sys_scope'
}

$delta = [ordered]@{
  exported_at = (Get-Date).ToString('o')
  scope = $scopeInfo
  since = $Since
  tables = [ordered]@{}
}

foreach ($table in $Tables) {
  $fields = if ($fieldMap.ContainsKey($table)) { $fieldMap[$table] } else { 'sys_id,name,sys_updated_on,sys_updated_by,sys_scope' }
  $response = Invoke-ServiceNowToolkitTable `
    -Table $table `
    -Query "sys_scope=$($scopeInfo.sys_id)^sys_updated_on>=$Since^ORDERBYDESCsys_updated_on" `
    -Fields $fields `
    -Limit 1000 `
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
  $delta.tables[$table] = [ordered]@{
    count = $rows.Count
    records = $rows
  }
}

$json = $delta | ConvertTo-Json -Depth 20
if ($OutputPath) {
  $parent = Split-Path -Parent $OutputPath
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent | Out-Null
  }
  $json | Set-Content -LiteralPath $OutputPath -Encoding UTF8
}
$json

param(
  [Parameter(Mandatory = $true)]
  [string]$Text,

  [string]$Scope,
  [string[]]$Tables,
  [switch]$SearchBodies,
  [string]$CachePath,
  [int]$CacheTtlMinutes = 15,
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

$scopeInfo = $null
if ($Scope) {
  $scopeInfo = Resolve-ServiceNowToolkitScope `
    -Scope $Scope `
    -Profile $Profile `
    -EnvPath $EnvPath `
    -Instance $Instance `
    -CachePath $CachePath `
    -Refresh:$Refresh `
    -NoCache:$NoCache
}

$searchConfig = @{
  sys_script_include = @{ fields = 'sys_id,name,api_name,active,sys_updated_on,sys_scope'; query = 'nameLIKE{0}^ORapi_nameLIKE{0}' }
  sys_script = @{ fields = 'sys_id,name,collection,active,when,sys_updated_on,sys_scope'; query = 'nameLIKE{0}^ORcollectionLIKE{0}' }
  sys_script_client = @{ fields = 'sys_id,name,table,active,type,sys_updated_on,sys_scope'; query = 'nameLIKE{0}^ORtableLIKE{0}' }
  sys_ui_action = @{ fields = 'sys_id,name,table,active,action_name,sys_updated_on,sys_scope'; query = 'nameLIKE{0}^ORtableLIKE{0}^ORaction_nameLIKE{0}' }
  sys_ui_page = @{ fields = 'sys_id,name,active,sys_updated_on,sys_scope'; query = 'nameLIKE{0}' }
  sysauto_script = @{ fields = 'sys_id,name,active,run_type,sys_updated_on,sys_scope'; query = 'nameLIKE{0}' }
  sysevent_register = @{ fields = 'sys_id,event_name,table,description,sys_updated_on,sys_scope'; query = 'event_nameLIKE{0}^ORtableLIKE{0}^ORdescriptionLIKE{0}' }
  sysevent_email_action = @{ fields = 'sys_id,name,active,event_name,collection,subject,sys_updated_on,sys_scope'; query = 'nameLIKE{0}^ORevent_nameLIKE{0}^ORsubjectLIKE{0}' }
  sys_security_acl = @{ fields = 'sys_id,name,operation,type,active,sys_updated_on,sys_scope'; query = 'nameLIKE{0}^ORoperationLIKE{0}' }
  sys_script_fix = @{ fields = 'sys_id,name,active,sys_updated_on,sys_scope'; query = 'nameLIKE{0}' }
  sys_transform_map = @{ fields = 'sys_id,name,source_table,target_table,active,sys_updated_on,sys_scope'; query = 'nameLIKE{0}^ORsource_tableLIKE{0}^ORtarget_tableLIKE{0}' }
  sys_data_source = @{ fields = 'sys_id,name,type,import_set_table_name,sys_updated_on,sys_scope'; query = 'nameLIKE{0}^ORimport_set_table_nameLIKE{0}' }
  sp_widget = @{ fields = 'sys_id,name,id,sys_updated_on,sys_scope'; query = 'nameLIKE{0}^ORidLIKE{0}' }
}

$bodyFields = @{
  sys_script_include = @('script')
  sys_script = @('script', 'condition')
  sys_script_client = @('script')
  sys_ui_action = @('script', 'condition', 'client_script_v2')
  sys_ui_page = @('html', 'client_script', 'processing_script')
  sysauto_script = @('script', 'condition')
  sysevent_email_action = @('message_html', 'message_text', 'advanced_condition')
  sys_security_acl = @('script', 'condition')
  sys_script_fix = @('script')
  sys_transform_map = @('script')
  sys_data_source = @('data_loader', 'parsing_script')
  sp_widget = @('template', 'script', 'client_script', 'css', 'link')
}

$matches = [System.Collections.Generic.List[object]]::new()

foreach ($table in $Tables) {
  if (-not $searchConfig.ContainsKey($table)) { continue }
  $config = $searchConfig[$table]
  $query = [string]::Format($config.query, $Text)
  if ($scopeInfo) {
    $parts = $query -split '\^OR'
    $query = (($parts | ForEach-Object { "sys_scope=$($scopeInfo.sys_id)^$_" }) -join '^OR')
  }

  $fields = $config.fields
  if ($SearchBodies -and $bodyFields.ContainsKey($table)) {
    $fields += ',' + ($bodyFields[$table] -join ',')
  }

  $response = Invoke-ServiceNowToolkitTable `
    -Table $table `
    -Query $query `
    -Fields $fields `
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

  foreach ($row in @($response.result)) {
    $flat = Convert-ServiceNowToolkitRow -Row $row
    $matchedFields = [System.Collections.Generic.List[string]]::new()
    foreach ($prop in $flat.PSObject.Properties) {
      if ($null -ne $prop.Value -and ([string]$prop.Value).IndexOf($Text, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
        $matchedFields.Add($prop.Name)
      }
    }
    $matches.Add([pscustomobject]@{
      table = $table
      sys_id = $flat.sys_id
      name = if ($flat.PSObject.Properties.Name -contains 'name') { $flat.name } elseif ($flat.PSObject.Properties.Name -contains 'event_name') { $flat.event_name } else { '' }
      scope = if ($flat.PSObject.Properties.Name -contains 'sys_scope') { $flat.sys_scope } else { '' }
      updated = if ($flat.PSObject.Properties.Name -contains 'sys_updated_on') { $flat.sys_updated_on } else { '' }
      matched_fields = @($matchedFields)
      record = $flat
    })
  }
}

[ordered]@{
  searched_at = (Get-Date).ToString('o')
  text = $Text
  scope = $scopeInfo
  count = $matches.Count
  matches = @($matches)
} | ConvertTo-Json -Depth 20

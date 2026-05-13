param(
  [Parameter(Mandatory = $true)]
  [string]$Scope,

  [string]$Name,
  [string]$Description = '',
  [string]$UpdateSetSysId,
  [string]$UserSysId = '6816f79cc0a8016401c5a33be04be441',
  [string]$SnapshotPath,
  [string]$Profile,
  [string]$EnvPath,
  [string]$Instance
)

$ErrorActionPreference = 'Stop'
$tableScript = Join-Path $PSScriptRoot 'Invoke-ServiceNowTable.ps1'

function Invoke-Table {
  param(
    [string]$Method = 'GET',
    [Parameter(Mandatory = $true)][string]$Table,
    [string]$SysId,
    [string]$Query,
    [string]$Fields,
    [int]$Limit = 10,
    [string]$DisplayValue = 'false',
    [string]$BodyJson
  )

  $invokeParams = @{
    Method = $Method
    Table = $Table
    DisplayValue = $DisplayValue
    ExcludeReferenceLink = $true
  }
  if ($SysId) { $invokeParams.SysId = $SysId }
  if ($Query) { $invokeParams.Query = $Query }
  if ($Fields) { $invokeParams.Fields = $Fields }
  if ($Method -eq 'GET') { $invokeParams.Limit = $Limit }
  if ($BodyJson) { $invokeParams.BodyJson = $BodyJson }
  if ($Profile) { $invokeParams.Profile = $Profile }
  if ($EnvPath) { $invokeParams.EnvPath = $EnvPath }
  if ($Instance) { $invokeParams.Instance = $Instance }

  (& $tableScript @invokeParams) | ConvertFrom-Json
}

function Get-ScopeSysId {
  param([string]$ScopeValue)
  if ($ScopeValue -eq 'global') { return 'global' }
  if ($ScopeValue -match '^[0-9a-f]{32}$') { return $ScopeValue }

  $query = "scope=$ScopeValue^ORname=$ScopeValue"
  $scopeResponse = Invoke-Table -Table 'sys_scope' -Query $query -Fields 'sys_id,name,scope' -Limit 1
  if (-not $scopeResponse.result -or $scopeResponse.result.Count -eq 0) {
    throw "Could not resolve scope '$ScopeValue'."
  }
  return $scopeResponse.result[0].sys_id
}

function Get-Preference {
  param([string]$Name)
  $query = "user=$UserSysId^name=$Name"
  $response = Invoke-Table -Table 'sys_user_preference' -Query $query -Fields 'sys_id,name,value,user' -Limit 1
  if ($response.result -and $response.result.Count -gt 0) { return $response.result[0] }
  return $null
}

function Set-Preference {
  param([string]$Name, [string]$Value)
  $existing = Get-Preference -Name $Name
  $body = @{ user = $UserSysId; name = $Name; value = $Value } | ConvertTo-Json
  if ($existing) {
    Invoke-Table -Method PATCH -Table 'sys_user_preference' -SysId $existing.sys_id -Fields 'sys_id,name,value,user' -DisplayValue all -BodyJson $body | Out-Null
    return $existing.sys_id
  }
  $created = Invoke-Table -Method POST -Table 'sys_user_preference' -Fields 'sys_id,name,value,user' -DisplayValue all -BodyJson $body
  return $created.result.sys_id.value
}

$scopeSysId = Get-ScopeSysId -ScopeValue $Scope
$prefNames = @('apps.current_app', 'sys_update_set', "updateSetForScope$scopeSysId")
$snapshot = [ordered]@{
  user_sys_id = $UserSysId
  scope_sys_id = $scopeSysId
  captured_at = (Get-Date).ToString('o')
  preferences = @()
}

foreach ($prefName in $prefNames) {
  $pref = Get-Preference -Name $prefName
  $snapshot.preferences += [ordered]@{
    name = $prefName
    existed = [bool]$pref
    sys_id = if ($pref) { $pref.sys_id } else { $null }
    value = if ($pref) { $pref.value } else { $null }
  }
}

Set-Preference -Name 'apps.current_app' -Value $scopeSysId | Out-Null

if (-not $UpdateSetSysId) {
  if (-not $Name) { throw 'Provide -Name when -UpdateSetSysId is omitted.' }
  $body = @{
    name = $Name
    description = $Description
    application = $scopeSysId
    state = 'in progress'
  } | ConvertTo-Json
  $created = Invoke-Table -Method POST -Table 'sys_update_set' -Fields 'sys_id,name,state,application,description' -DisplayValue all -BodyJson $body
  $UpdateSetSysId = $created.result.sys_id.value
  $actualApplication = $created.result.application.value
  if ($actualApplication -ne $scopeSysId) {
    throw "Created update set in application '$actualApplication', expected '$scopeSysId'. Restore preferences before retrying."
  }
}

Set-Preference -Name "updateSetForScope$scopeSysId" -Value $UpdateSetSysId | Out-Null
Set-Preference -Name 'sys_update_set' -Value $UpdateSetSysId | Out-Null

if ($SnapshotPath) {
  $snapshot | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $SnapshotPath -Encoding UTF8
}

[ordered]@{
  scope_sys_id = $scopeSysId
  update_set_sys_id = $UpdateSetSysId
  snapshot_path = $SnapshotPath
  snapshot = $snapshot
} | ConvertTo-Json -Depth 10

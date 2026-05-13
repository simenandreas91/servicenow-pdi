param(
  [Parameter(Mandatory = $true)]
  [string]$UpdateSetSysId,

  [string]$ExpectedApplication,
  [string[]]$Names,
  [string]$Profile,
  [string]$EnvPath,
  [string]$Instance
)

$ErrorActionPreference = 'Stop'
$tableScript = Join-Path $PSScriptRoot 'Invoke-ServiceNowTable.ps1'

$query = "update_set=$UpdateSetSysId"
if ($Names -and $Names.Count -gt 0) {
  $query += '^nameIN' + ($Names -join ',')
}

$invokeParams = @{
  Table = 'sys_update_xml'
  Query = $query
  Fields = 'sys_id,name,update_set,application,target_name,type,sys_created_on'
  Limit = 200
  DisplayValue = 'all'
  ExcludeReferenceLink = $true
}
if ($Profile) { $invokeParams.Profile = $Profile }
if ($EnvPath) { $invokeParams.EnvPath = $EnvPath }
if ($Instance) { $invokeParams.Instance = $Instance }

$response = (& $tableScript @invokeParams) | ConvertFrom-Json
$rows = if ($response.result) { @($response.result) } else { @() }
$apps = @($rows | ForEach-Object { $_.application.value } | Sort-Object -Unique)
$missing = @()
if ($Names) {
  $found = @($rows | ForEach-Object { $_.name.value })
  $missing = @($Names | Where-Object { $_ -notin $found })
}

$ok = $true
if ($ExpectedApplication -and (@($apps | Where-Object { $_ -ne $ExpectedApplication }).Count -gt 0)) { $ok = $false }
if ($missing.Count -gt 0) { $ok = $false }

$result = [ordered]@{
  ok = $ok
  count = $rows.Count
  applications = $apps
  missing_names = $missing
  rows = $rows
}

$result | ConvertTo-Json -Depth 12
if (-not $ok) { exit 2 }

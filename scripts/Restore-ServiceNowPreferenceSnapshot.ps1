param(
  [Parameter(Mandatory = $true)]
  [string]$SnapshotPath,

  [string]$Profile,
  [string]$EnvPath,
  [string]$Instance
)

$ErrorActionPreference = 'Stop'
$tableScript = Join-Path $PSScriptRoot 'Invoke-ServiceNowTable.ps1'
$snapshot = Get-Content -LiteralPath $SnapshotPath -Raw | ConvertFrom-Json

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

function Get-Preference {
  param([string]$Name)
  $query = "user=$($snapshot.user_sys_id)^name=$Name"
  $response = Invoke-Table -Table 'sys_user_preference' -Query $query -Fields 'sys_id,name,value,user' -Limit 1
  if ($response.result -and $response.result.Count -gt 0) { return $response.result[0] }
  return $null
}

$restored = @()
foreach ($pref in $snapshot.preferences) {
  $current = Get-Preference -Name $pref.name
  if ($pref.existed) {
    if (-not $current) {
      $body = @{ user = $snapshot.user_sys_id; name = $pref.name; value = $pref.value } | ConvertTo-Json
      $created = Invoke-Table -Method POST -Table 'sys_user_preference' -Fields 'sys_id,name,value,user' -DisplayValue all -BodyJson $body
      $restored += @{ name = $pref.name; action = 'created'; sys_id = $created.result.sys_id.value }
    } else {
      $body = @{ value = $pref.value } | ConvertTo-Json
      Invoke-Table -Method PATCH -Table 'sys_user_preference' -SysId $current.sys_id -Fields 'sys_id,name,value,user' -DisplayValue all -BodyJson $body | Out-Null
      $restored += @{ name = $pref.name; action = 'patched'; sys_id = $current.sys_id }
    }
  } elseif ($current) {
    Invoke-Table -Method DELETE -Table 'sys_user_preference' -SysId $current.sys_id | Out-Null
    $restored += @{ name = $pref.name; action = 'deleted'; sys_id = $current.sys_id }
  } else {
    $restored += @{ name = $pref.name; action = 'unchanged_missing'; sys_id = $null }
  }
}

@{ restored = $restored } | ConvertTo-Json -Depth 6

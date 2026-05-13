param(
  [string]$UpdateSetSysId,
  [string]$Name,
  [string]$UserSysId = '6816f79cc0a8016401c5a33be04be441',
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

if (-not $UpdateSetSysId) {
  if ($Name) {
    $updateSetResponse = Invoke-ServiceNowToolkitTable `
      -Table 'sys_update_set' `
      -Query "name=$Name^ORDERBYDESCsys_updated_on" `
      -Fields 'sys_id,name,state,application,description,sys_updated_on' `
      -Limit 1 `
      -DisplayValue all `
      -ExcludeReferenceLink `
      -Profile $Profile `
      -EnvPath $EnvPath `
      -Instance $Instance `
      -CachePath $CachePath `
      -CacheTtlMinutes $CacheTtlMinutes `
      -Refresh:$Refresh `
      -NoCache:$NoCache
    if (@($updateSetResponse.result).Count -lt 1) { throw "No update set found with name '$Name'." }
    $UpdateSetSysId = $updateSetResponse.result[0].sys_id.value
  } else {
    $prefResponse = Invoke-ServiceNowToolkitTable `
      -Table 'sys_user_preference' `
      -Query "user=$UserSysId^name=sys_update_set" `
      -Fields 'sys_id,name,value' `
      -Limit 1 `
      -DisplayValue false `
      -ExcludeReferenceLink `
      -Profile $Profile `
      -EnvPath $EnvPath `
      -Instance $Instance `
      -CachePath $CachePath `
      -CacheTtlMinutes $CacheTtlMinutes `
      -Refresh:$Refresh `
      -NoCache:$NoCache
    if (@($prefResponse.result).Count -lt 1 -or [string]::IsNullOrWhiteSpace($prefResponse.result[0].value)) {
      throw 'No update set sys_id was provided and no current sys_update_set preference was found.'
    }
    $UpdateSetSysId = $prefResponse.result[0].value
  }
}

$updateSet = Invoke-ServiceNowToolkitTable `
  -Table 'sys_update_set' `
  -Query "sys_id=$UpdateSetSysId" `
  -Fields 'sys_id,name,state,application,description,sys_updated_on' `
  -Limit 1 `
  -DisplayValue all `
  -ExcludeReferenceLink `
  -Profile $Profile `
  -EnvPath $EnvPath `
  -Instance $Instance `
  -CachePath $CachePath `
  -CacheTtlMinutes $CacheTtlMinutes `
  -Refresh:$Refresh `
  -NoCache:$NoCache

if (@($updateSet.result).Count -lt 1) {
  throw "Update set not found: $UpdateSetSysId"
}

$rowsResponse = Invoke-ServiceNowToolkitTable `
  -Table 'sys_update_xml' `
  -Query "update_set=$UpdateSetSysId^ORDERBYtype^ORDERBYtarget_name" `
  -Fields 'sys_id,name,type,target_name,application,sys_created_on' `
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

$rows = @($rowsResponse.result | ForEach-Object { Convert-ServiceNowToolkitRow -Row $_ })
$apps = @($rows | ForEach-Object { $_.application } | Sort-Object -Unique)
$types = @($rows | Group-Object -Property type | Sort-Object Name | ForEach-Object {
    [pscustomobject]@{ type = $_.Name; count = $_.Count }
  })
$expectedApp = $updateSet.result[0].application.value
$unexpectedApps = @($apps | Where-Object { $_ -ne $expectedApp })
$possibleNoise = @($rows | Where-Object {
    $_.type -in @('Cross scope privilege', 'Form Layout') -or $_.name -like 'sys_scope_privilege_*'
  })

[ordered]@{
  generated_at = (Get-Date).ToString('o')
  update_set = Convert-ServiceNowToolkitRow -Row $updateSet.result[0]
  count = $rows.Count
  applications = $apps
  mixed_scope = $unexpectedApps.Count -gt 0
  unexpected_applications = $unexpectedApps
  counts_by_type = $types
  possible_noise = $possibleNoise
  rows = $rows
} | ConvertTo-Json -Depth 20

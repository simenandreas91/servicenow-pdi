$ErrorActionPreference = 'Stop'

function Get-ServiceNowToolkitCacheRoot {
  param([string]$CachePath)

  if ([string]::IsNullOrWhiteSpace($CachePath)) {
    $CachePath = Join-Path (Get-Location).Path '.servicenow-cache'
  }

  if (-not (Test-Path -LiteralPath $CachePath)) {
    New-Item -ItemType Directory -Path $CachePath -Force | Out-Null
  }

  return (Resolve-Path -LiteralPath $CachePath).Path
}

function Get-ServiceNowToolkitCacheKey {
  param([string]$Text)

  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
  return (($hash | ForEach-Object { $_.ToString('x2') }) -join '')
}

function Invoke-ServiceNowToolkitTable {
  param(
    [Parameter(Mandatory = $true)][string]$Table,
    [string]$Query,
    [string]$Fields,
    [int]$Limit = 100,
    [ValidateSet('false', 'true', 'all')][string]$DisplayValue = 'all',
    [switch]$ExcludeReferenceLink,
    [string]$Profile,
    [string]$EnvPath,
    [string]$Instance,
    [string]$CachePath,
    [int]$CacheTtlMinutes = 30,
    [switch]$Refresh,
    [switch]$NoCache
  )

  $cacheRoot = Get-ServiceNowToolkitCacheRoot -CachePath $CachePath
  $cacheInput = @{
    table = $Table
    query = $Query
    fields = $Fields
    limit = $Limit
    display_value = $DisplayValue
    profile = $Profile
    instance = $Instance
  } | ConvertTo-Json -Compress
  $cacheFile = Join-Path $cacheRoot ("table-{0}.json" -f (Get-ServiceNowToolkitCacheKey -Text $cacheInput))

  if (-not $NoCache -and -not $Refresh -and (Test-Path -LiteralPath $cacheFile)) {
    $age = (Get-Date) - (Get-Item -LiteralPath $cacheFile).LastWriteTime
    if ($age.TotalMinutes -le $CacheTtlMinutes) {
      return Get-Content -LiteralPath $cacheFile -Raw | ConvertFrom-Json
    }
  }

  $tableScript = Join-Path $PSScriptRoot 'Invoke-ServiceNowTable.ps1'
  $params = @{
    Table = $Table
    Limit = $Limit
    DisplayValue = $DisplayValue
  }
  if ($Query) { $params.Query = $Query }
  if ($Fields) { $params.Fields = $Fields }
  if ($ExcludeReferenceLink) { $params.ExcludeReferenceLink = $true }
  if ($Profile) { $params.Profile = $Profile }
  if ($EnvPath) { $params.EnvPath = $EnvPath }
  if ($Instance) { $params.Instance = $Instance }

  $raw = & $tableScript @params
  if (-not $NoCache) {
    $raw | Set-Content -LiteralPath $cacheFile -Encoding UTF8
  }
  return $raw | ConvertFrom-Json
}

function Resolve-ServiceNowToolkitScope {
  param(
    [Parameter(Mandatory = $true)][string]$Scope,
    [string]$Profile,
    [string]$EnvPath,
    [string]$Instance,
    [string]$CachePath,
    [switch]$Refresh,
    [switch]$NoCache
  )

  if ($Scope -eq 'global') {
    return [pscustomobject]@{ sys_id = 'global'; scope = 'global'; name = 'Global' }
  }
  if ($Scope -match '^[0-9a-f]{32}$') {
    $query = "sys_id=$Scope"
  } else {
    $query = "scope=$Scope^ORname=$Scope"
  }

  $response = Invoke-ServiceNowToolkitTable `
    -Table 'sys_scope' `
    -Query $query `
    -Fields 'sys_id,scope,name' `
    -Limit 1 `
    -DisplayValue all `
    -ExcludeReferenceLink `
    -Profile $Profile `
    -EnvPath $EnvPath `
    -Instance $Instance `
    -CachePath $CachePath `
    -Refresh:$Refresh `
    -NoCache:$NoCache

  $rows = @($response.result)
  if ($rows.Count -lt 1) {
    throw "Could not resolve scope '$Scope'."
  }

  return [pscustomobject]@{
    sys_id = $rows[0].sys_id.value
    scope = $rows[0].scope.value
    name = $rows[0].name.value
  }
}

function Convert-ServiceNowToolkitValue {
  param($Value)

  if ($null -eq $Value) { return $null }
  if ($Value.PSObject.Properties.Name -contains 'value') { return $Value.value }
  return $Value
}

function Convert-ServiceNowToolkitRow {
  param($Row)

  $out = [ordered]@{}
  foreach ($prop in $Row.PSObject.Properties) {
    $out[$prop.Name] = Convert-ServiceNowToolkitValue -Value $prop.Value
  }
  return [pscustomobject]$out
}

function Get-ServiceNowToolkitDefaultArtifactTables {
  @(
    'sys_script_include',
    'sys_script',
    'sys_script_client',
    'sys_ui_action',
    'sys_ui_page',
    'sysauto_script',
    'sysevent_register',
    'sysevent_email_action',
    'sys_security_acl',
    'sys_script_fix',
    'sys_transform_map',
    'sys_data_source',
    'sp_widget'
  )
}

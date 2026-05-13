function Get-ServiceNowDotEnvPath {
  param([string]$ExplicitPath)

  if (-not [string]::IsNullOrWhiteSpace($ExplicitPath)) {
    if (Test-Path -LiteralPath $ExplicitPath) {
      return (Resolve-Path -LiteralPath $ExplicitPath).Path
    }
    throw "ServiceNow .env file was not found: $ExplicitPath"
  }

  $current = Get-Location
  while ($null -ne $current) {
    $candidate = Join-Path -Path $current.Path -ChildPath '.env'
    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
    $current = $current.Parent
  }

  return $null
}

function Read-ServiceNowDotEnv {
  param([string]$Path)

  $values = @{}
  if ([string]::IsNullOrWhiteSpace($Path)) {
    return $values
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#') -or $line -notmatch '=') {
      return
    }

    $parts = $line -split '=', 2
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    $values[$key] = $value
  }

  return $values
}

function Resolve-ServiceNowConnection {
  param(
    [string]$Profile,
    [string]$Instance,
    [string]$EnvPath
  )

  $dotEnvPath = Get-ServiceNowDotEnvPath -ExplicitPath $EnvPath
  $dotEnv = Read-ServiceNowDotEnv -Path $dotEnvPath

  if ([string]::IsNullOrWhiteSpace($Profile)) {
    $Profile = $env:SN_PROFILE
  }
  if ([string]::IsNullOrWhiteSpace($Profile) -and $dotEnv.ContainsKey('SN_PROFILE')) {
    $Profile = $dotEnv['SN_PROFILE']
  }

  $resolvedInstance = $Instance
  if ([string]::IsNullOrWhiteSpace($resolvedInstance)) {
    $resolvedInstance = $env:SN_INSTANCE
  }
  if ([string]::IsNullOrWhiteSpace($resolvedInstance) -and $dotEnv.ContainsKey('SN_INSTANCE')) {
    $resolvedInstance = $dotEnv['SN_INSTANCE']
  }

  $userName = $env:SN_USER
  if ([string]::IsNullOrWhiteSpace($userName) -and $dotEnv.ContainsKey('SN_USER')) {
    $userName = $dotEnv['SN_USER']
  }

  $password = $env:SN_PASS
  if ([string]::IsNullOrWhiteSpace($password) -and $dotEnv.ContainsKey('SN_PASS')) {
    $password = $dotEnv['SN_PASS']
  }

  if (-not [string]::IsNullOrWhiteSpace($Profile)) {
    $normalizedProfile = ($Profile -replace '[^A-Za-z0-9_]', '_').ToUpperInvariant()
    $profileInstanceKey = "SN_${normalizedProfile}_INSTANCE"
    $profileUserKey = "SN_${normalizedProfile}_USER"
    $profilePassKey = "SN_${normalizedProfile}_PASS"

    if ([string]::IsNullOrWhiteSpace($resolvedInstance) -and $dotEnv.ContainsKey($profileInstanceKey)) {
      $resolvedInstance = $dotEnv[$profileInstanceKey]
    }
    if ([string]::IsNullOrWhiteSpace($userName) -and $dotEnv.ContainsKey($profileUserKey)) {
      $userName = $dotEnv[$profileUserKey]
    }
    if ([string]::IsNullOrWhiteSpace($password) -and $dotEnv.ContainsKey($profilePassKey)) {
      $password = $dotEnv[$profilePassKey]
    }
  }

  if ([string]::IsNullOrWhiteSpace($resolvedInstance)) {
    throw 'Set SN_INSTANCE or SN_<PROFILE>_INSTANCE in environment variables or .env before calling ServiceNow.'
  }
  if ([string]::IsNullOrWhiteSpace($userName) -or [string]::IsNullOrWhiteSpace($password)) {
    throw 'Set SN_USER/SN_PASS or SN_<PROFILE>_USER/SN_<PROFILE>_PASS in environment variables or .env before calling ServiceNow.'
  }

  [pscustomobject]@{
    Instance = $resolvedInstance.TrimEnd('/')
    UserName = $userName
    Password = $password
    Profile = $Profile
    DotEnvPath = $dotEnvPath
  }
}

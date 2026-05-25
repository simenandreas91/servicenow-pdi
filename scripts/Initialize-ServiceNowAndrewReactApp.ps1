param(
  [string]$ProjectPath = (Get-Location).Path,
  [string]$Profile = 'pdi',
  [string]$EnvPath = 'C:\Users\simen\Documents\Codex\ServiceNow\.env',
  [string]$Instance,
  [switch]$Install
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/Resolve-ServiceNowConnection.ps1"
$connection = Resolve-ServiceNowConnection -Profile $Profile -Instance $Instance -EnvPath $EnvPath

$resolvedProjectPath = (Resolve-Path -LiteralPath $ProjectPath).Path
$viteConfigPath = Join-Path -Path $resolvedProjectPath -ChildPath 'vite.config.ts'
$packageJsonPath = Join-Path -Path $resolvedProjectPath -ChildPath 'package.json'

if (-not (Test-Path -LiteralPath $viteConfigPath)) {
  throw "vite.config.ts was not found in $resolvedProjectPath"
}
if (-not (Test-Path -LiteralPath $packageJsonPath)) {
  throw "package.json was not found in $resolvedProjectPath"
}

$viteConfig = Get-Content -LiteralPath $viteConfigPath -Raw
$proxyPattern = "('/api'\s*:\s*)['""][^'""]+['""]"
$replacement = "`${1}'$($connection.Instance)/'"
if ($viteConfig -notmatch $proxyPattern) {
  throw "Could not find a Vite '/api' proxy entry in $viteConfigPath"
}
$updatedViteConfig = [regex]::Replace($viteConfig, $proxyPattern, $replacement, 1)
Set-Content -LiteralPath $viteConfigPath -Value $updatedViteConfig -Encoding utf8NoBOM

$localEnvPath = Join-Path -Path $resolvedProjectPath -ChildPath '.env'
@(
  "VITE_REACT_APP_USER='$($connection.UserName)'",
  "VITE_REACT_APP_PASSWORD='$($connection.Password)'"
) | Set-Content -LiteralPath $localEnvPath -Encoding utf8NoBOM

if ($Install) {
  Push-Location -LiteralPath $resolvedProjectPath
  try {
    npm install
  }
  finally {
    Pop-Location
  }
}

[pscustomobject]@{
  project = $resolvedProjectPath
  instance = $connection.Instance
  profile = $connection.Profile
  vite_config_updated = $true
  env_created = $true
  env_path = $localEnvPath
  installed = [bool]$Install
} | ConvertTo-Json -Depth 4

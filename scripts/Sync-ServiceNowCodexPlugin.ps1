[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Destination
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$destinationRoot = (Resolve-Path -LiteralPath $Destination).Path
$pluginManifest = Join-Path $destinationRoot '.codex-plugin\plugin.json'
$packageSource = Join-Path $repositoryRoot 'plugin-package'
$sourceManifest = Join-Path $packageSource '.codex-plugin\plugin.json'

if (-not (Test-Path -LiteralPath $pluginManifest -PathType Leaf)) {
  throw "Destination is not a ServiceNow Codex plugin source: $destinationRoot"
}

if (-not (Test-Path -LiteralPath $sourceManifest -PathType Leaf)) {
  throw "Canonical plugin package is missing: $sourceManifest"
}

$skillDestination = Join-Path $destinationRoot 'skills\servicenow-pdi'
$copyPlan = @(
  @{ Source = Join-Path $packageSource '.codex-plugin'; Destination = $destinationRoot; Recurse = $true },
  @{ Source = Join-Path $packageSource '.mcp.json'; Destination = Join-Path $destinationRoot '.mcp.json'; Recurse = $false },
  @{ Source = Join-Path $repositoryRoot 'SKILL.md'; Destination = Join-Path $skillDestination 'SKILL.md'; Recurse = $false },
  @{ Source = Join-Path $repositoryRoot 'agents'; Destination = $skillDestination; Recurse = $true },
  @{ Source = Join-Path $repositoryRoot 'references'; Destination = $skillDestination; Recurse = $true }
)

if (-not (Test-Path -LiteralPath $skillDestination)) {
  New-Item -ItemType Directory -Path $skillDestination -Force | Out-Null
}

foreach ($item in $copyPlan) {
  Copy-Item -LiteralPath $item.Source -Destination $item.Destination -Force -Recurse:$item.Recurse
}

$scriptDestination = Join-Path $skillDestination 'scripts'
if (-not (Test-Path -LiteralPath $scriptDestination)) {
  New-Item -ItemType Directory -Path $scriptDestination -Force | Out-Null
}

$obsoleteRuntimeScripts = @(
  'Confirm-ServiceNowUpdateCapture.ps1',
  'Restore-ServiceNowPreferenceSnapshot.ps1',
  'Set-ServiceNowUpdateSetContext.ps1'
)

foreach ($obsoleteScript in $obsoleteRuntimeScripts) {
  $obsoletePath = Join-Path $scriptDestination $obsoleteScript
  if (Test-Path -LiteralPath $obsoletePath -PathType Leaf) {
    Remove-Item -LiteralPath $obsoletePath -Force
  }
}

Get-ChildItem -LiteralPath (Join-Path $repositoryRoot 'scripts') -File |
  Where-Object { $_.Name -ne 'Sync-ServiceNowCodexPlugin.ps1' } |
  Copy-Item -Destination $scriptDestination -Force

$runtimeSyncScript = Join-Path $scriptDestination 'Sync-ServiceNowCodexPlugin.ps1'
if (Test-Path -LiteralPath $runtimeSyncScript -PathType Leaf) {
  Remove-Item -LiteralPath $runtimeSyncScript -Force
}

Write-Output "Repository: $repositoryRoot"
Write-Output "Plugin: $destinationRoot"
Write-Output "Skill: $skillDestination"
Write-Output 'Copied: plugin manifest, MCP manifest, SKILL.md, agents, references, runtime scripts'
Write-Output 'The sync overwrites matching files, removes retired context/capture helpers plus the packaging-only sync script, and otherwise preserves plugin-only files.'

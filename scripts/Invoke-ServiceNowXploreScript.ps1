param(
  [string]$Script,
  [string]$ScriptPath,
  [string]$Instance,
  [string]$Scope = 'global',
  [string]$ScopeSysId,
  [string]$UserData = '',
  [string]$UserDataType = 'String',
  [int]$MaxDepth = 1,
  [switch]$ShowProps,
  [switch]$UseEsLatest,
  [switch]$NoFixGsLog,
  [switch]$Raw,
  [string]$Profile,
  [string]$EnvPath
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Script) -and [string]::IsNullOrWhiteSpace($ScriptPath)) {
  throw 'Pass either -Script or -ScriptPath.'
}
if (-not [string]::IsNullOrWhiteSpace($ScriptPath)) {
  $Script = Get-Content -LiteralPath $ScriptPath -Raw
}

. "$PSScriptRoot/Resolve-ServiceNowConnection.ps1"
$connection = Resolve-ServiceNowConnection -Profile $Profile -Instance $Instance -EnvPath $EnvPath
$Instance = $connection.Instance
$userName = $connection.UserName
$password = $connection.Password

$pair = '{0}:{1}' -f $userName, $password
$auth = [Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{
  Authorization = "Basic $auth"
  Accept = 'application/json'
  'User-Agent' = 'Codex-ServiceNow-PDI/1.0'
}

function Resolve-ServiceNowScopeName {
  param(
    [string]$InstanceUrl,
    [hashtable]$Headers,
    [string]$SysId
  )

  if ([string]::IsNullOrWhiteSpace($SysId) -or $SysId -eq 'global') {
    return 'global'
  }

  $uri = '{0}/api/now/table/sys_scope/{1}?sysparm_fields=scope&sysparm_display_value=false' -f `
    $InstanceUrl, [uri]::EscapeDataString($SysId)
  $scopeResponse = Invoke-RestMethod -Uri $uri -Headers $Headers -Method GET
  if ($scopeResponse.result -and $scopeResponse.result.scope) {
    return [string]$scopeResponse.result.scope
  }

  throw "Could not resolve sys_scope '$SysId' to a scope name."
}

if (-not [string]::IsNullOrWhiteSpace($ScopeSysId)) {
  $Scope = Resolve-ServiceNowScopeName -InstanceUrl $Instance -Headers $headers -SysId $ScopeSysId
}
if ([string]::IsNullOrWhiteSpace($Scope)) {
  $Scope = 'global'
}

$payload = @{
  debug_mode = $false
  target = 'server'
  scope = $Scope
  code = $Script
  user_data = $UserData
  user_data_type = $UserDataType
  breadcrumb = ''
  no_quotes = $true
  show_props = [bool]$ShowProps
  max_depth = $MaxDepth
  show_strings = $true
  html_messages = $false
  fix_gslog = -not [bool]$NoFixGsLog
  support_hoisting = $false
  use_es_latest = [bool]$UseEsLatest
  id = 'codex'
  loaded_id = ''
}

$body = @{
  data = ($payload | ConvertTo-Json -Compress -Depth 8)
}

$response = Invoke-WebRequest `
  -Uri "$Instance/snd_xplore.do?action=run" `
  -Method POST `
  -Headers $headers `
  -Body $body `
  -ContentType 'application/x-www-form-urlencoded' `
  -MaximumRedirection 5 `
  -SkipHttpErrorCheck

if ([int]$response.StatusCode -ge 400) {
  throw "Xplore request failed with HTTP $([int]$response.StatusCode). Confirm Xplore is installed and the user has admin access."
}

try {
  $json = $response.Content | ConvertFrom-Json
} catch {
  $sample = $response.Content
  if ($sample.Length -gt 500) {
    $sample = $sample.Substring(0, 500)
  }
  throw "Xplore did not return JSON. Confirm /snd_xplore.do is installed and accessible. Response started with: $sample"
}

if ($Raw) {
  $json | ConvertTo-Json -Depth 20
  return
}

if (-not $json.'$success') {
  $errorText = $json.'$error'
  if ([string]::IsNullOrWhiteSpace($errorText) -and $json.error) {
    $errorText = $json.error
  }
  if ([string]::IsNullOrWhiteSpace($errorText)) {
    $errorText = 'Unknown Xplore processor error.'
  }
  throw $errorText
}

$result = $json.result
$resultText = ''
if ($result -and $null -ne $result.string) {
  $resultText = [string]$result.string
}

$textCandidates = [System.Collections.Generic.List[string]]::new()
if (-not [string]::IsNullOrWhiteSpace($resultText)) {
  $textCandidates.Add($resultText)
}
if ($result -and $result.messages) {
  foreach ($message in @($result.messages)) {
    if ($message.message) {
      $textCandidates.Add([string]$message.message)
    }
  }
}
if ($result -and $result.logs) {
  foreach ($log in @($result.logs)) {
    if ($log.message) {
      $textCandidates.Add([string]$log.message)
    } elseif ($log) {
      $textCandidates.Add([string]$log)
    }
  }
}

foreach ($text in $textCandidates) {
  $marked = [regex]::Match($text, '(?s)(?:SN_RESULT_START|CODEX_RESULT_START)\s*(.*?)\s*(?:SN_RESULT_END|CODEX_RESULT_END)')
  if ($marked.Success) {
    $marked.Groups[1].Value.Trim()
    return
  }
}

if (-not [string]::IsNullOrWhiteSpace($resultText) -and $resultText -ne 'undefined') {
  $resultText
  return
}

if ($result) {
  $result | ConvertTo-Json -Depth 20
}

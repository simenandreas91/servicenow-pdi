param(
  [string]$Script,
  [string]$ScriptPath,
  [string]$Instance,
  [string]$ScopeSysId,
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

function Get-ServiceNowTokenFromContent {
  param([string]$Content)

  if ([string]::IsNullOrWhiteSpace($Content)) {
    return $null
  }

  $input = [regex]::Match($Content, '(?is)<input\b(?=[^>]*\bname=["'']sysparm_ck["''])[^>]*>')
  if ($input.Success) {
    $value = [regex]::Match($input.Value, '\bvalue=["'']([^"'']*)["'']')
    if ($value.Success) {
      return [System.Net.WebUtility]::HtmlDecode($value.Groups[1].Value)
    }
  }

  $gck = [regex]::Match($Content, 'g_ck\s*=\s*["'']([^"'']+)["'']')
  if ($gck.Success) {
    return [System.Net.WebUtility]::HtmlDecode($gck.Groups[1].Value)
  }

  return $null
}

function Invoke-ServiceNowUiLogin {
  param(
    [string]$InstanceUrl,
    [string]$UserName,
    [string]$Password
  )

  $loginPage = Invoke-WebRequest `
    -Uri "$InstanceUrl/login.do" `
    -SessionVariable loginSession `
    -MaximumRedirection 5

  $loginToken = Get-ServiceNowTokenFromContent -Content $loginPage.Content
  $body = @{
    user_name = $UserName
    user_password = $Password
    'ni.nolog.user_password' = 'true'
    'ni.noecho.user_name' = 'true'
    'ni.noecho.user_password' = 'true'
    screensize = '1920x1080'
    sys_action = 'sysverb_login'
    sysparm_login_url = 'welcome.do'
    sysparm_referring_url = 'welcome.do'
  }
  if (-not [string]::IsNullOrWhiteSpace($loginToken)) {
    $body.sysparm_ck = $loginToken
  }

  $loginResponse = Invoke-WebRequest `
    -Uri "$InstanceUrl/login.do" `
    -WebSession $loginSession `
    -Method POST `
    -Body $body `
    -ContentType 'application/x-www-form-urlencoded' `
    -MaximumRedirection 5 `
    -SkipHttpErrorCheck

  if ($loginResponse.Headers['X-Is-Logged-In'] -contains 'false') {
    throw 'ServiceNow UI login failed. Check SN_USER/SN_PASS and that the user can access the platform UI.'
  }

  return $loginSession
}

$pair = '{0}:{1}' -f $userName, $password
$auth = [Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes($pair))

$headers = @{
  Authorization = "Basic $auth"
  Accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  'User-Agent' = 'Codex-ServiceNow-PDI/1.0'
}

$landing = Invoke-WebRequest `
  -Uri "$Instance/sys.scripts.do" `
  -SessionVariable snSession `
  -Headers $headers `
  -MaximumRedirection 5

$token = Get-ServiceNowTokenFromContent -Content $landing.Content

if ([string]::IsNullOrWhiteSpace($token) -or ($landing.Headers['X-Is-Logged-In'] -contains 'false')) {
  $snSession = Invoke-ServiceNowUiLogin -InstanceUrl $Instance -UserName $userName -Password $password

  $landing = Invoke-WebRequest `
    -Uri "$Instance/sys.scripts.do" `
    -WebSession $snSession `
    -Headers @{ Accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' } `
    -MaximumRedirection 5

  $token = Get-ServiceNowTokenFromContent -Content $landing.Content
}
if ([string]::IsNullOrWhiteSpace($token)) {
  throw 'Could not find sysparm_ck/g_ck token on sys.scripts.do. The account may need admin access or UI access to Scripts - Background.'
}

$params = @{
  script = $Script
  runscript = 'Run script'
  sysparm_ck = $token
}
if (-not [string]::IsNullOrWhiteSpace($ScopeSysId)) {
  $params.sys_scope = $ScopeSysId
}

$queryParts = foreach ($key in $params.Keys) {
  '{0}={1}' -f [uri]::EscapeDataString($key), [uri]::EscapeDataString($params[$key])
}
$runUri = "$Instance/sys.scripts.do?$($queryParts -join '&')"

$runHeaders = @{
  Accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  'Cache-Control' = 'no-cache'
  'X-UserToken' = $token
}

$response = Invoke-WebRequest `
  -Uri $runUri `
  -WebSession $snSession `
  -Headers $runHeaders `
  -MaximumRedirection 5

if ($Raw) {
  $response.Content
  return
}

$decoded = [System.Net.WebUtility]::HtmlDecode($response.Content)
$marked = [regex]::Match($decoded, '(?s)CODEX_RESULT_START\s*(.*?)\s*CODEX_RESULT_END')
if ($marked.Success) {
  $marked.Groups[1].Value.Trim()
  return
}

$text = $decoded `
  -replace '(?is)<script\b.*?</script>', '' `
  -replace '(?is)<style\b.*?</style>', '' `
  -replace '(?s)<[^>]+>', "`n"

($text -split "`r?`n" |
  ForEach-Object { $_.Trim() } |
  Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join "`n"

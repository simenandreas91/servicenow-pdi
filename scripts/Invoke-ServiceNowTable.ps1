param(
  [ValidateSet('GET', 'POST', 'PATCH', 'DELETE')]
  [string]$Method = 'GET',

  [Parameter(Mandatory = $true)]
  [string]$Table,

  [string]$SysId,
  [string]$Query,
  [string]$Fields,
  [int]$Limit = 10,
  [ValidateSet('false', 'true', 'all')]
  [string]$DisplayValue = 'false',
  [switch]$ExcludeReferenceLink,
  [switch]$WantSessionDebugMessages,
  [string]$BodyJson,
  [string]$Profile,
  [string]$EnvPath,
  [string]$Instance
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/Resolve-ServiceNowConnection.ps1"
$connection = Resolve-ServiceNowConnection -Profile $Profile -Instance $Instance -EnvPath $EnvPath
$instance = $connection.Instance

$pair = '{0}:{1}' -f $connection.UserName, $connection.Password
$auth = [Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{
  Authorization = "Basic $auth"
  Accept = 'application/json'
  'Content-Type' = 'application/json'
}
if ($WantSessionDebugMessages) {
  $headers['X-WantSessionDebugMessages'] = 'true'
}

$escapedTable = [uri]::EscapeDataString($Table)
$path = "$instance/api/now/table/$escapedTable"
if (-not [string]::IsNullOrWhiteSpace($SysId)) {
  $path = "$path/$([uri]::EscapeDataString($SysId))"
}

$params = @{}
if (-not [string]::IsNullOrWhiteSpace($Query)) {
  $params.sysparm_query = $Query
}
if (-not [string]::IsNullOrWhiteSpace($Fields)) {
  $params.sysparm_fields = $Fields
}
if ($Method -eq 'GET' -and [string]::IsNullOrWhiteSpace($SysId)) {
  $params.sysparm_limit = [string]$Limit
}
if ($DisplayValue -ne 'false') {
  $params.sysparm_display_value = $DisplayValue
}
if ($ExcludeReferenceLink) {
  $params.sysparm_exclude_reference_link = 'true'
}

if ($params.Count -gt 0) {
  $queryParts = foreach ($key in $params.Keys) {
    '{0}={1}' -f [uri]::EscapeDataString($key), [uri]::EscapeDataString($params[$key])
  }
  $path = "$path`?$($queryParts -join '&')"
}

$invokeParams = @{
  Uri = $path
  Headers = $headers
  Method = $Method
}

if ($Method -in @('POST', 'PATCH') -and -not [string]::IsNullOrWhiteSpace($BodyJson)) {
  $invokeParams.Body = $BodyJson
}

$response = Invoke-RestMethod @invokeParams
$response | ConvertTo-Json -Depth 12

param(
  [Parameter(Mandatory = $true)]
  [string]$UpdateSetSysId,

  [string]$OutputPath,
  [switch]$Complete,
  [string]$Profile,
  [string]$EnvPath,
  [string]$Instance
)

$ErrorActionPreference = 'Stop'

function Invoke-TableJson {
  param(
    [Parameter(Mandatory = $true)][string]$Table,
    [ValidateSet('GET', 'POST', 'PATCH', 'DELETE')][string]$Method = 'GET',
    [string]$SysId,
    [string]$Query,
    [string]$Fields,
    [int]$Limit = 10,
    [string]$BodyJson
  )

  $script = Join-Path $PSScriptRoot 'Invoke-ServiceNowTable.ps1'
  $params = @{
    Table = $Table
    Method = $Method
    DisplayValue = 'false'
    ExcludeReferenceLink = $true
  }
  if ($SysId) { $params.SysId = $SysId }
  if ($Query) { $params.Query = $Query }
  if ($Fields) { $params.Fields = $Fields }
  if ($Limit) { $params.Limit = $Limit }
  if ($BodyJson) { $params.BodyJson = $BodyJson }
  if ($Profile) { $params.Profile = $Profile }
  if ($EnvPath) { $params.EnvPath = $EnvPath }
  if ($Instance) { $params.Instance = $Instance }

  return (& $script @params | ConvertFrom-Json)
}

function Escape-JsString {
  param([string]$Text)
  return ($Text -replace '\\', '\\' -replace "'", "\'")
}

if ($Complete) {
  $body = @{ state = 'complete' } | ConvertTo-Json -Compress
  Invoke-TableJson -Table 'sys_update_set' -Method PATCH -SysId $UpdateSetSysId -BodyJson $body -Fields 'sys_id,name,state' | Out-Null
}

$updateSet = (Invoke-TableJson `
  -Table 'sys_update_set' `
  -SysId $UpdateSetSysId `
  -Fields 'sys_id,name,state,application,description,sys_updated_on').result

if (-not $updateSet) {
  throw "Update set not found: $UpdateSetSysId"
}
if ($updateSet.state -ne 'complete') {
  throw "Update set '$($updateSet.name)' is '$($updateSet.state)'. Use -Complete or complete it before export."
}

$xploreScript = @"
var current = new GlideRecord('sys_update_set');
if (!current.get('$(Escape-JsString $UpdateSetSysId)'))
  throw 'Update set not found: $(Escape-JsString $UpdateSetSysId)';
var updateSetExport = new UpdateSetExport();
var sysid = updateSetExport.exportUpdateSet(current);
gs.info('CODEX_RESULT_START' + sysid + 'CODEX_RESULT_END');
"@

$xplore = Join-Path $PSScriptRoot 'Invoke-ServiceNowXploreScript.ps1'
$xploreParams = @{
  Scope = 'global'
  Script = $xploreScript
}
if ($Profile) { $xploreParams.Profile = $Profile }
if ($EnvPath) { $xploreParams.EnvPath = $EnvPath }
if ($Instance) { $xploreParams.Instance = $Instance }
$remoteUpdateSetSysId = [string](& $xplore @xploreParams)
$remoteUpdateSetSysId = $remoteUpdateSetSysId.Trim()

if ([string]::IsNullOrWhiteSpace($remoteUpdateSetSysId)) {
  throw 'UpdateSetExport did not return a sys_remote_update_set sys_id.'
}

$remote = (Invoke-TableJson `
  -Table 'sys_remote_update_set' `
  -SysId $remoteUpdateSetSysId `
  -Fields 'sys_id,name,application,description,state,remote_base_update_set,base_update_set,parent,origin_sys_id,sys_created_by,sys_created_on,sys_updated_by,sys_updated_on,release_date,source,update_source').result

$updates = @((Invoke-TableJson `
  -Table 'sys_update_xml' `
  -Query "remote_update_set=$remoteUpdateSetSysId" `
  -Fields 'sys_id,name,type,target_name,application,category,action,payload,remote_update_set,sys_created_by,sys_created_on,sys_updated_by,sys_updated_on' `
  -Limit 10000).result)

if ($updates.Count -lt 1) {
  throw "Remote update set $remoteUpdateSetSysId contains no sys_update_xml rows."
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $safeName = ($updateSet.name -replace '[\\/:*?"<>|]', '_').Trim()
  if ([string]::IsNullOrWhiteSpace($safeName)) { $safeName = $UpdateSetSysId }
  $OutputPath = Join-Path (Join-Path (Get-Location).Path 'exports') "$safeName.xml"
}

$outputDir = Split-Path -Parent $OutputPath
if ($outputDir -and -not (Test-Path -LiteralPath $outputDir)) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$settings = [System.Xml.XmlWriterSettings]::new()
$settings.Indent = $true
$settings.Encoding = [System.Text.UTF8Encoding]::new($false)
$writer = [System.Xml.XmlWriter]::Create($OutputPath, $settings)
try {
  $writer.WriteStartDocument()
  $writer.WriteStartElement('unload')
  $writer.WriteAttributeString('unload_date', (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss'))

  $writer.WriteStartElement('sys_remote_update_set')
  $writer.WriteAttributeString('action', 'INSERT_OR_UPDATE')
  foreach ($field in @('application','base_update_set','description','name','origin_sys_id','parent','release_date','remote_base_update_set','state','sys_created_by','sys_created_on','sys_id','sys_updated_by','sys_updated_on','update_source')) {
    $writer.WriteElementString($field, [string]$remote.$field)
  }
  $writer.WriteEndElement()

  foreach ($update in $updates) {
    $writer.WriteStartElement('sys_update_xml')
    $writer.WriteAttributeString('action', 'INSERT_OR_UPDATE')
    foreach ($field in @('action','application','category','name','payload','remote_update_set','sys_created_by','sys_created_on','sys_id','sys_updated_by','sys_updated_on','target_name','type')) {
      $writer.WriteElementString($field, [string]$update.$field)
    }
    $writer.WriteEndElement()
  }

  $writer.WriteEndElement()
  $writer.WriteEndDocument()
} finally {
  $writer.Close()
}

[xml]$check = Get-Content -LiteralPath $OutputPath -Raw
$file = Get-Item -LiteralPath $OutputPath
[pscustomobject]@{
  update_set_sys_id = $UpdateSetSysId
  update_set_name = $updateSet.name
  remote_update_set_sys_id = $remoteUpdateSetSysId
  update_count = $updates.Count
  path = $file.FullName
  bytes = $file.Length
  root = $check.DocumentElement.Name
} | ConvertTo-Json -Depth 4

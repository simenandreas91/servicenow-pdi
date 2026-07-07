param(
  [Parameter(Mandatory = $true)]
  [string]$Table,

  [Parameter(Mandatory = $true)]
  [string]$SysId,

  [string]$UpdateSetSysId,
  [string]$Profile,
  [string]$EnvPath,
  [string]$Instance
)

$ErrorActionPreference = 'Stop'
$xploreScript = Join-Path $PSScriptRoot 'Invoke-ServiceNowXploreScript.ps1'
$tableScript = Join-Path $PSScriptRoot 'Invoke-ServiceNowTable.ps1'
$updateName = "${Table}_${SysId}"

$serverScript = @"
(function () {
  var result = { saved: false, updateXml: [] };
  var gr = new GlideRecord('$Table');
  if (!gr.get('$SysId')) {
    result.error = 'record_not_found';
    gs.print('SN_RESULT_START' + JSON.stringify(result) + 'SN_RESULT_END');
    return;
  }

  new GlideUpdateManager2().saveRecord(gr);
  result.saved = true;

  var grUpdate = new GlideRecord('sys_update_xml');
  grUpdate.addQuery('name', '$updateName');
  grUpdate.orderByDesc('sys_created_on');
  grUpdate.setLimit(3);
  grUpdate.query();
  while (grUpdate.next()) {
    result.updateXml.push({
      sys_id: grUpdate.getUniqueValue(),
      update_set: grUpdate.getValue('update_set'),
      application: grUpdate.getValue('application'),
      target_name: grUpdate.getValue('target_name'),
      created: grUpdate.getValue('sys_created_on')
    });
  }

  gs.print('SN_RESULT_START' + JSON.stringify(result) + 'SN_RESULT_END');
})();
"@

$xParams = @{ Script = $serverScript }
if ($Profile) { $xParams.Profile = $Profile }
if ($EnvPath) { $xParams.EnvPath = $EnvPath }
if ($Instance) { $xParams.Instance = $Instance }
$saveResult = (& $xploreScript @xParams) | ConvertFrom-Json

if ($UpdateSetSysId -and $saveResult.updateXml -and @($saveResult.updateXml).Count -gt 0) {
  $latest = @($saveResult.updateXml)[0]
  if ($latest.update_set -ne $UpdateSetSysId) {
    $body = @{ update_set = $UpdateSetSysId } | ConvertTo-Json
    $tParams = @{
      Method = 'PATCH'
      Table = 'sys_update_xml'
      SysId = $latest.sys_id
      Fields = 'sys_id,name,update_set,application,target_name,type'
      DisplayValue = 'all'
      BodyJson = $body
      ExcludeReferenceLink = $true
    }
    if ($Profile) { $tParams.Profile = $Profile }
    if ($EnvPath) { $tParams.EnvPath = $EnvPath }
    if ($Instance) { $tParams.Instance = $Instance }
    $moved = (& $tableScript @tParams) | ConvertFrom-Json
    $saveResult | Add-Member -NotePropertyName moved_to_update_set -NotePropertyValue $moved.result -Force
  }
}

$saveResult | ConvertTo-Json -Depth 12

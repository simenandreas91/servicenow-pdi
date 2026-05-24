param(
  [string]$UserSysId = '6816f79cc0a8016401c5a33be04be441',
  [int]$StaleUpdateSetDays = 14,
  [string]$Profile,
  [string]$EnvPath,
  [string]$Instance
)

$ErrorActionPreference = 'Stop'
$tableScript = Join-Path $PSScriptRoot 'Invoke-ServiceNowTable.ps1'
$xploreScript = Join-Path $PSScriptRoot 'Invoke-ServiceNowXploreScript.ps1'

function Escape-JsString {
  param([string]$Value)
  if ($null -eq $Value) { return '' }
  return ($Value -replace '\\', '\\' -replace "'", "\'")
}

function Invoke-HealthTableCheck {
  param(
    [Parameter(Mandatory = $true)][string]$Table,
    [string]$Query,
    [string]$Fields = 'sys_id',
    [int]$Limit = 1
  )

  $params = @{
    Table = $Table
    Fields = $Fields
    Limit = $Limit
    DisplayValue = 'false'
    ExcludeReferenceLink = $true
  }
  if ($Query) { $params.Query = $Query }
  if ($Profile) { $params.Profile = $Profile }
  if ($EnvPath) { $params.EnvPath = $EnvPath }
  if ($Instance) { $params.Instance = $Instance }

  try {
    $response = (& $tableScript @params) | ConvertFrom-Json
    return [ordered]@{
      table = $Table
      ok = $true
      status = 'ok'
      count = @($response.result).Count
      error = $null
    }
  } catch {
    $message = $_.Exception.Message
    if ($message.Length -gt 500) { $message = $message.Substring(0, 500) }
    return [ordered]@{
      table = $Table
      ok = $false
      status = 'blocked_or_failed'
      count = $null
      error = $message
    }
  }
}

$escapedUserSysId = Escape-JsString -Value $UserSysId
$escapedDays = [int]$StaleUpdateSetDays

$script = @"
(function () {
  function count(table, query) {
    var ga = new GlideAggregate(table);
    if (query) ga.addEncodedQuery(query);
    ga.addAggregate('COUNT');
    ga.query();
    return ga.next() ? parseInt(ga.getAggregate('COUNT'), 10) : 0;
  }

  function one(table, query, fields) {
    var gr = new GlideRecord(table);
    gr.addEncodedQuery(query);
    gr.setLimit(1);
    gr.query();
    if (!gr.next()) return null;
    var out = {};
    fields.forEach(function (field) {
      out[field] = gr.getValue(field);
      out[field + '_display'] = gr.getDisplayValue(field);
    });
    return out;
  }

  function list(table, query, fields, limit) {
    var rows = [];
    var gr = new GlideRecord(table);
    gr.addEncodedQuery(query);
    gr.orderByDesc('sys_updated_on');
    gr.setLimit(limit || 5);
    gr.query();
    while (gr.next()) {
      var out = {};
      fields.forEach(function (field) {
        out[field] = gr.getValue(field);
        out[field + '_display'] = gr.getDisplayValue(field);
      });
      rows.push(out);
    }
    return rows;
  }

  function pref(name) {
    return one('sys_user_preference', "user=$escapedUserSysId^name=" + name, ['sys_id', 'name', 'value']);
  }

  var appPref = pref('apps.current_app');
  var updateSetPref = pref('sys_update_set');
  var updateSet = null;
  var scopedUpdateSetPref = null;
  if (updateSetPref && updateSetPref.value) {
    updateSet = one('sys_update_set', 'sys_id=' + updateSetPref.value, ['sys_id', 'name', 'state', 'application', 'sys_updated_on']);
    if (updateSet && updateSet.application) {
      scopedUpdateSetPref = pref('updateSetForScope' + updateSet.application);
    }
  }

  var staleQuery = "state=in progress^sys_updated_onRELATIVELT@dayofweek@ago@$escapedDays";
  var result = {
    instance: gs.getProperty('instance_name'),
    war: gs.getProperty('glide.war'),
    product_version: gs.getProperty('glide.product.version'),
    user: gs.getUserName(),
    user_id: gs.getUserID(),
    current_scope: gs.getCurrentScopeName(),
    preferences: {
      apps_current_app: appPref,
      sys_update_set: updateSetPref,
      scoped_update_set: scopedUpdateSetPref
    },
    current_update_set: updateSet,
    counts: {
      in_progress_update_sets: count('sys_update_set', 'state=in progress'),
      stale_update_sets: count('sys_update_set', staleQuery),
      local_app_scopes: count('sys_scope', 'scopeSTARTSWITHx_'),
      active_business_rules: count('sys_script', 'active=true'),
      active_flows: count('sys_hub_flow', 'active=true'),
      active_acl_rules: count('sys_security_acl', 'active=true'),
      active_plugin_rows: count('sys_plugins', 'active=true')
    },
    stale_update_set_sample: list('sys_update_set', staleQuery, ['sys_id', 'name', 'state', 'application', 'sys_updated_on'], 5)
  };
  gs.print('CODEX_RESULT_START' + JSON.stringify(result) + 'CODEX_RESULT_END');
})();
"@

$xploreHealth = $null
$xploreStatus = [ordered]@{ ok = $false; status = 'not_run'; error = $null }
try {
  $xploreParams = @{ Script = $script }
  if ($Profile) { $xploreParams.Profile = $Profile }
  if ($EnvPath) { $xploreParams.EnvPath = $EnvPath }
  if ($Instance) { $xploreParams.Instance = $Instance }
  $xploreHealth = (& $xploreScript @xploreParams) | ConvertFrom-Json
  $xploreStatus.ok = $true
  $xploreStatus.status = 'ok'
} catch {
  $message = $_.Exception.Message
  if ($message.Length -gt 500) { $message = $message.Substring(0, 500) }
  $xploreStatus.status = 'blocked_or_failed'
  $xploreStatus.error = $message
}

$tableChecks = @(
  Invoke-HealthTableCheck -Table 'sys_user_preference' -Query "user=$UserSysId^name=sys_update_set" -Fields 'sys_id,name,value'
  Invoke-HealthTableCheck -Table 'sys_update_set' -Query 'state=in progress' -Fields 'sys_id,name,state,application,sys_updated_on'
  Invoke-HealthTableCheck -Table 'sys_plugins' -Query 'active=true' -Fields 'sys_id,name,active'
)

[ordered]@{
  generated_at = (Get-Date).ToString('o')
  xplore = $xploreStatus
  instance = if ($xploreHealth) { $xploreHealth.instance } else { $null }
  war = if ($xploreHealth) { $xploreHealth.war } else { $null }
  product_version = if ($xploreHealth) { $xploreHealth.product_version } else { $null }
  user = if ($xploreHealth) { $xploreHealth.user } else { $null }
  user_id = if ($xploreHealth) { $xploreHealth.user_id } else { $null }
  current_scope = if ($xploreHealth) { $xploreHealth.current_scope } else { $null }
  preferences = if ($xploreHealth) { $xploreHealth.preferences } else { $null }
  current_update_set = if ($xploreHealth) { $xploreHealth.current_update_set } else { $null }
  counts = if ($xploreHealth) { $xploreHealth.counts } else { $null }
  stale_update_set_sample = if ($xploreHealth) { @($xploreHealth.stale_update_set_sample) } else { @() }
  table_api_checks = $tableChecks
  api_acl_fallback_needed = [bool](@($tableChecks) | Where-Object { -not $_.ok })
  notes = @(
    'Read-only health check. Does not print credentials or tokens.',
    'If a Table API check is blocked but Xplore is ok, use constrained read-only Xplore for metadata inventory.'
  )
} | ConvertTo-Json -Depth 20

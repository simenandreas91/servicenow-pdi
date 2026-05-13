# ServiceNow Helper Examples

Find a user:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Invoke-ServiceNowTable.ps1" `
  -Table sys_user `
  -Query 'name=Simen Admin' `
  -Fields 'sys_id,name,user_name,email' `
  -Limit 1 `
  -ExcludeReferenceLink
```

Inspect mandatory fields before inserting:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Invoke-ServiceNowTable.ps1" `
  -Table sys_dictionary `
  -Query 'name=rm_story^mandatory=true' `
  -Fields 'element,column_label,internal_type,reference,default_value,mandatory' `
  -ExcludeReferenceLink
```

Create a story only when explicitly requested:

```powershell
$body = @{
  short_description = 'Example story'
  description = 'As a user, I want an example story so that I can verify API writes.'
  assigned_to = '6816f79cc0a8016401c5a33be04be441'
  eap_team = '<team_sys_id>'
} | ConvertTo-Json

& "$HOME/.codex/skills/servicenow-pdi/scripts/Invoke-ServiceNowTable.ps1" `
  -Method POST `
  -Table rm_story `
  -Fields 'sys_id,number,short_description,assigned_to,eap_team,state' `
  -DisplayValue all `
  -BodyJson $body `
  -ExcludeReferenceLink
```

Read-only Xplore verification:

```powershell
$script = @'
(function () {
  var result = { activeUsers: 0 };
  var grUser = new GlideAggregate('sys_user');
  grUser.addQuery('active', true);
  grUser.addAggregate('COUNT');
  grUser.query();
  if (grUser.next()) {
    result.activeUsers = parseInt(grUser.getAggregate('COUNT'), 10);
  }
  gs.print('CODEX_RESULT_START' + JSON.stringify(result) + 'CODEX_RESULT_END');
})();
'@

& "$HOME/.codex/skills/servicenow-pdi/scripts/Invoke-ServiceNowXploreScript.ps1" -Script $script
```

For scoped Xplore, pass `-Scope <sys_scope.scope>` or `-ScopeSysId <sys_scope.sys_id>`.

## Toolkit Helpers

Create a cached inventory for a scope:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Get-ServiceNowScopeInventory.ps1" `
  -Scope x_personellsikkerh `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Search common artifact tables:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Find-ServiceNowArtifact.ps1" `
  -Text reklarering `
  -Scope x_personellsikkerh `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Inspect table shape, choices, and ACL summary:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Get-ServiceNowTableShape.ps1" `
  -Table x_personellsikkerh_personellsikkerhet `
  -IncludeChoices `
  -IncludeAclSummary `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Summarize an update set and flag likely noise:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Get-ServiceNowUpdateSetSummary.ps1" `
  -UpdateSetSysId '<sys_update_set>' `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Export changed artifacts since a timestamp:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Export-ServiceNowDelta.ps1" `
  -Scope x_personellsikkerh `
  -Since '2026-05-13 00:00:00' `
  -OutputPath '.servicenow-cache/personellsikkerhet-delta.json' `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Test event notification configuration and optionally trigger an event:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Test-ServiceNowNotification.ps1" `
  -EventName x_personellsikkerh.klarering_utlop_1mnd `
  -RecordTable x_personellsikkerh_personellsikkerhet `
  -RecordSysId '<record_sys_id>' `
  -Parm1 'leader@example.com' `
  -Trigger `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

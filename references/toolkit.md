# ServiceNow Toolkit Helpers

Small PowerShell toolkit for faster, less noisy ServiceNow discovery. All scripts live in `scripts/` and wrap the existing Table API/Xplore helpers.

Most scripts support:
- `-Profile`
- `-EnvPath`
- `-Instance`
- `-CachePath`
- `-CacheTtlMinutes`
- `-Refresh`
- `-NoCache`

Default cache path is `.servicenow-cache` in the current working directory.

## Scripts

`Get-ServiceNowScopeInventory.ps1`

Creates a cached inventory of common artifact records in a scope. Use this before broad exploration.

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Get-ServiceNowScopeInventory.ps1" `
  -Scope x_personellsikkerh `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

`Find-ServiceNowArtifact.ps1`

Searches common artifact tables by name-like fields and optionally body/code fields.

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Find-ServiceNowArtifact.ps1" `
  -Text reklarering `
  -Scope x_personellsikkerh `
  -SearchBodies `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

`Get-ServiceNowTableShape.ps1`

Returns table metadata, dictionary fields, optional choices, and optional ACL summary.

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Get-ServiceNowTableShape.ps1" `
  -Table x_personellsikkerh_personellsikkerhet `
  -IncludeChoices `
  -IncludeAclSummary `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

`Get-ServiceNowUpdateSetSummary.ps1`

Summarizes update set contents, type counts, mixed-scope risk, and likely noise such as cross-scope privileges and form layouts.

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Get-ServiceNowUpdateSetSummary.ps1" `
  -UpdateSetSysId '<sys_update_set>' `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

`Test-ServiceNowNotification.ps1`

Checks event registration, event notifications, recent `sysevent` rows, and recent generated `sys_email` rows. With `-Trigger`, queues a test event against a real record.

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Test-ServiceNowNotification.ps1" `
  -EventName x_personellsikkerh.klarering_utlop_1mnd `
  -RecordTable x_personellsikkerh_personellsikkerhet `
  -RecordSysId '<record_sys_id>' `
  -Parm1 'recipient@example.com' `
  -Trigger `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

`Export-ServiceNowDelta.ps1`

Exports records changed in a scope since a timestamp across common artifact tables or a supplied table list.

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Export-ServiceNowDelta.ps1" `
  -Scope x_personellsikkerh `
  -Since '2026-05-13 00:00:00' `
  -OutputPath '.servicenow-cache/personellsikkerhet-delta.json' `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

## Practical Workflow

1. Run `Get-ServiceNowScopeInventory.ps1` for the relevant scope.
2. Use `Find-ServiceNowArtifact.ps1` for targeted discovery.
3. Use `Get-ServiceNowTableShape.ps1` before writes to unfamiliar tables.
4. Use `Get-ServiceNowUpdateSetSummary.ps1` after implementation to check capture and noise.
5. Use `Test-ServiceNowNotification.ps1` for event/email work.
6. Use `Export-ServiceNowDelta.ps1` when returning to an instance after time has passed.

Use `-Refresh` when you know the instance changed and the local cache may be stale. Use `-NoCache` for verification immediately after writes.

# ServiceNow Indexing And Knowledge Cache

Use this when the task asks for broad OOTB knowledge, repeated artifact lookup, unfamiliar-instance navigation, or blast-radius analysis across many ServiceNow records.

## Principle

Do not paste massive OOTB catalogs into `SKILL.md`. Keep the skill as the operating manual and generate compact indexes for large, changing platform facts.

Good skill content:

- stable workflows, safety rules, helper commands, table families, caveats, and proven patterns.
- small curated lists of high-value tables or known PDI records.

Good generated index content:

- all tables and labels from `sys_db_object`.
- dictionary fields, references, choices, and mandatory/default hints from `sys_dictionary` and `sys_choice`.
- Script Includes, Business Rules, Client Scripts, UI Actions, ACLs, notifications, events, flows, modules, portal widgets, UX routes, REST messages, import maps, and HRSD metadata.
- cross-record relationships such as table targets, event names, called Script Includes, roles, generated runtime tables, update-set capture, and UI routes.

## Why

Large static lists rot quickly, waste context, and can mislead. An index can be regenerated, queried narrowly, and verified live before edits.

The useful idea from `scheidydude/codeindex` is the architecture:

1. build a deterministic local index.
2. store symbol/artifact locations separately from instructions.
3. support O(1) lookup by name/key.
4. calculate blast radius from relationships.
5. expose small lookup tools to the agent instead of loading the whole corpus.

Do not use `codeindex` directly for this skill without adaptation: current repo analysis targets code files such as Python, JavaScript, Go, Java, PHP, Docker, CI, and schema files. It does not index ServiceNow records, Markdown references, or PowerShell helpers well out of the box.

The useful idea from `cocoindex-io/cocoindex-code` is optional semantic discovery:

1. use exact search (`rg`) and the ServiceNow metadata helpers first when names, table keys, or sys_ids are known.
2. use `ccc` only when the query is conceptual or fuzzy, such as "where do we handle update-set noise", "workspace modal save pattern", or "approval rejection logic".
3. keep semantic results as candidate pointers. Read the matched file/record context and verify live ServiceNow facts before edits.
4. prefer local embeddings for ServiceNow-derived content. Do not send exported instance metadata, scripts, or customer-sensitive content to cloud embedding providers unless Simen explicitly approves it for that task.

`ccc` is optional. Do not make it a required dependency for the skill or block ServiceNow work when it is unavailable.

## ServiceNow Index Shape

Prefer a generated JSON or SQLite index outside the base skill context. Suggested files:

- `.servicenow-index/tables.json`: table name, label, superclass, scope, package, extensible, number prefix, access flags.
- `.servicenow-index/fields.json`: table, element, type, reference, mandatory, default, choice, attributes.
- `.servicenow-index/artifacts.json`: artifact table, sys_id, name/key, target table, scope, package, active, updated timestamp.
- `.servicenow-index/symbols.json`: Script Include names/API names, function-like symbols, event names, REST API paths, Flow/action names, widget IDs.
- `.servicenow-index/edges.json`: `reads`, `writes`, `calls`, `triggers`, `notifies`, `secures`, `renders`, `extends`, `references`, `captured_in`.

Keep records compact. Store `sys_id`, display name/key, table, scope, and relationship fields. Fetch script bodies only for targeted search, suspicious impact, or implementation.

## Workflow

1. Build or refresh the index only when broad lookup is needed, the cache is stale, or the instance has changed materially.
2. Search the index first for table/artifact candidates.
3. Confirm the exact candidate live with Table API or Xplore before changing anything.
4. For impact analysis, traverse one or two hops:
   - upstream: who creates, calls, triggers, references, or secures this artifact?
   - downstream: what records, events, notifications, UI channels, flows, integrations, or ACLs depend on it?
5. Load full script/config bodies only for the narrowed candidates.
6. After edits, refresh only affected index slices or mark the index stale.

## Helper Commands

Build a compact metadata index:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Build-ServiceNowInstanceIndex.ps1" `
  -Artifacts `
  -OutputPath .\.servicenow-index `
  -Profile pdi `
  -EnvPath 'C:\Users\simen\Documents\Codex\ServiceNow\.env'
```

Useful switches:

- `-TablesOnly`: only `sys_db_object`; fastest way to answer table-name/navigation questions.
- `-Scope <scope>`: limit generated rows to one application scope.
- `-Artifacts`: include common app artifacts such as Script Includes, Business Rules, ACLs, notifications, REST messages, import maps, widgets, and modules.
- `-IncludeBodies`: include scripts/templates/conditions for artifact tables. Use only when needed for local search; it increases size and may capture sensitive implementation detail.
- `-OutputPath`: choose the generated index folder. Keep generated indexes out of git.

Search the local index:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Find-ServiceNowIndexedArtifact.ps1" `
  -Text "holiday approval" `
  -IndexPath .\.servicenow-index `
  -Limit 25
```

Check basic relationship impact:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Get-ServiceNowIndexedImpact.ps1" `
  -Key "sysapproval_approver" `
  -IndexPath .\.servicenow-index
```

The impact helper is intentionally conservative. It uses deterministic metadata edges such as `runs_on`, `references`, `notifies`, `triggers`, and `secures`; it does not infer every dynamic script call.

## Optional Semantic Search With ccc

Use `cocoindex-code` / `ccc` as an exploratory layer over local files when exact search is too brittle. Good targets are this skill repository's Markdown references, PowerShell helpers, examples, and generated safe text exports. It is most useful for finding patterns by intent rather than identifier.

Check availability:

```powershell
Get-Command ccc -ErrorAction SilentlyContinue
```

If installed, initialize or refresh the local index from the repository root:

```powershell
ccc init
ccc index
ccc search "workspace modal save pattern"
ccc search --lang markdown "update set noise"
ccc search --path "references/*" "approval rejection"
```

If `ccc` reports that the project is not initialized, run `ccc init`, then `ccc index`, then retry the search. If `ccc` is missing, fall back to `rg`, `Find-ServiceNowIndexedArtifact.ps1`, and focused file reads. Do not ask Simen to install it during a ServiceNow task unless semantic search is clearly the blocker.

For ServiceNow instance metadata, do not point `ccc` directly at raw broad exports with scripts or sensitive records. If semantic search over instance metadata becomes useful repeatedly, create a separate sanitized export step that converts `.servicenow-index/*.json` into compact text chunks containing safe fields such as artifact table, sys_id, name, target table, scope, active state, and relationship summaries. Keep credential/auth tables, secrets, tokens, and unnecessary script bodies out of that export.

## What Not To Do

- Do not add all OOTB Script Includes, all tables, or full script bodies to the skill prompt.
- Do not trust a generated index as final truth before writes; ServiceNow metadata and ACL behavior must be verified live.
- Do not index credential records, secrets, auth profile secrets, OAuth tokens, or session data.
- Do not broad-scan production-like instances without explicit approval.
- Do not make `ccc` or any embedding provider part of the default ServiceNow operating loop.
- Do not use cloud embeddings for ServiceNow-derived content without explicit task-level approval.

## Current Limits

- Generated indexes are local snapshots; use `-NoCache` Table API/Xplore reads before writing.
- The builder intentionally skips credential/auth-profile tables.
- The default artifact list is practical, not exhaustive. Add table configs only when repeated lookup justifies it.
- Full script-body indexing can be useful for call searches, but prefer targeted live reads when the candidate set is already small.
- `ccc` is semantic and approximate; it can miss exact records or return plausible but irrelevant matches.

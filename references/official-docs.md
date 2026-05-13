# Official ServiceNow Docs For Agent Work

Use the ServiceNowDocs GitHub repository when a task needs current product behavior, API signatures, platform constraints, or release-specific guidance.

## Source

- Repository: `https://github.com/ServiceNow/ServiceNowDocs`
- Preferred AI entry point: `https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/australia/llms.txt`
- Default development branch for this skill: `australia`
- Other release branches listed by `llms.txt`: `latest`, `zurich`, `yokohama`, `xanadu`

The docs repo is organized by release family. Each release is a branch. Each product publication lives under `markdown/<publication>/index.md`, and each topic file has YAML frontmatter such as `title`, `product_area`, `last_updated`, and `canonical_url`.

Do not fetch `servicenow.com/docs` directly for agent research. The ServiceNow docs site is a JavaScript app and is not the reliable LLM source. Use raw GitHub markdown files instead, then use the canonical URL only as a human-facing citation or UI reference.

## Local Research Pattern

For broad research, use a shallow sparse checkout outside the workspace and search the markdown locally:

```powershell
$dst = Join-Path $env:TEMP 'ServiceNowDocs-australia'
git clone --depth 1 --branch australia --filter=blob:none --sparse https://github.com/ServiceNow/ServiceNowDocs.git $dst
Set-Location $dst
git sparse-checkout set --no-cone `
  llms.txt README.md `
  markdown/application-development `
  markdown/api-reference `
  markdown/platform-user-interface `
  markdown/platform-administration `
  markdown/platform-security `
  markdown/servicenow-platform `
  markdown/release-notes
```

Search `index.md` files first. They are dense tables of contents with raw topic links. Then inspect only the specific topic files needed for the task.

## High-Value Development Paths

- `markdown/api-reference/api-reference.md`: API categories and when to use client, server, REST, UI Builder, or product APIs.
- `markdown/api-reference/rest-apis/c_TableAPI.md`: Table API endpoint behavior, parameters, status codes, and examples.
- `markdown/api-reference/rest-api-explorer/c_RESTAPI.md`: REST conventions, headers, versioning, shared parameters, security, ACLs, CORS, and REST API Explorer notes.
- `markdown/api-reference/scripts/p_GlideServerAPIs.md`: Glide server scripting notes, including `GlideRecordSecure`.
- `markdown/api-reference/server-api-reference/c_GlideRecordScopedAPI.md`: scoped `GlideRecord`.
- `markdown/api-reference/server-api-reference/c_GlideAggregateScopedAPI.md`: scoped aggregate queries.
- `markdown/api-reference/server-api-reference/GlideQueryGlobalAPI.md`: `GlideQuery`.
- `markdown/api-reference/server-api-reference/c_GlideSystemScopedAPI.md`: scoped `gs` APIs.
- `markdown/api-reference/c_GlideAjaxAPI.md` and `markdown/api-reference/c_GlideFormAPI.md`: classic client script APIs.
- `markdown/platform-user-interface/service-portal/widget-dev-guide.md`: custom Service Portal widget structure and server/client data flow.
- `markdown/platform-user-interface/service-portal/service-portal-widgets.md`: widget instances, cloning, context menu, diagnostics, and editor entry points.
- `markdown/platform-user-interface/service-portal/c_WidgetInstanceOptions.md`: option schema behavior and when to use `sp_instance` extension tables.
- `markdown/application-development/servicenow-sdk/fluent-service-portal-api.md`: ServiceNow Fluent definitions for `sp_widget`, Angular providers, dependencies, CSS includes, and JS includes.
- `markdown/application-development/c_ApplicationScope.md`: scope behavior and namespace rules.
- `markdown/application-development/c_ApplicationAccessSettings.md`: cross-scope application access settings.
- `markdown/application-development/c_ApplicationFiles.md`: application files, `sys_metadata`, and update set capture in `sys_update_xml`.
- `markdown/application-development/best-practices-use-source-control.md`: when source control/Application Repository is preferred and when System Update Sets still make sense.

## Practical Guidance To Carry Into PDI Work

- Match the docs branch to the instance family when known. If the instance family is unknown, use `australia` for this skill unless the task asks for a different release, then state the release assumption when it matters.
- Prefer Table API for record reads and writes, but remember it still honors roles, table ACLs, field ACLs, REST API ACLs, and table web-service access settings.
- Keep Table API reads narrow. Use `sysparm_fields`, `sysparm_limit`, `sysparm_offset`, and `sysparm_exclude_reference_link=true` for machine reads unless links are needed.
- Be careful with `sysparm_display_value=true` or `all`: display values can require extra work and can differ by user locale, timezone, reference display fields, choices, and encryption context.
- Use `sysparm_input_display_value=true` only deliberately. It stores submitted display values after platform conversion. The default writes actual database values, which is usually what API automation should do.
- For Table API `POST`, `PUT`, and `PATCH`, send one record per request. The REST docs say multi-record write bodies are not supported as a batch operation.
- Do not write database views through Table API. They are read-only.
- Invalid field names in an encoded query can be ignored by default, causing the valid part of the query to run. If a query result is surprising, inspect fields with `sys_dictionary` and verify the encoded query.
- `sysparm_limit` is applied before ACL filtering. A user-scoped read can return fewer visible rows than expected if inaccessible rows are included before ACL evaluation.
- For REST writes, include `Accept: application/json` and `Content-Type: application/json`. GET requests only need `Accept`.
- For ACL-sensitive server checks, use `GlideRecordSecure` rather than plain `GlideRecord`. `GlideRecordSecure` enforces standard read/write ACLs automatically, but query ACL enforcement requires explicit opt-in when using encoded queries.
- For application-file changes, remember that tables extending `sys_metadata` are tracked as application files and update set records are written to `sys_update_xml`. Verify update capture after changes to scripts, widgets, UI policies, business rules, and similar configuration records.
- Treat application access settings separately from user ACLs. Application access controls cross-scope runtime/design-time behavior; ACLs control user access to records and fields.
- For Service Portal, prefer cloning baseline widgets before modification. Baseline widgets are read-only so they can receive future product updates.
- A Service Portal widget server script initializes `data`, receives `input` from client calls, and can read `options`. The client accesses server output through `c.data`; after `server.update()`, client data is overwritten by the returned server `data`.
- Use widget option schema for simple reusable instance configuration. Store options in an `sp_instance` extension table only when complex, searchable, or unsupported field types are needed.
- Use Angular Providers for reusable state or behavior across multiple widgets instead of overloading widget client controllers with persistent shared logic.

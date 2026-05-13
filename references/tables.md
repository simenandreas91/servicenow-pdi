# ServiceNow PDI Table Notes

Load this file only when table-specific reminders are useful.

## Portal Widgets

- Widget table: `sp_widget`
- Useful fields: `sys_id,name,id,template,css,client_script,script,link,option_schema,public,roles`
- The server script field is `script`, not `server_script`.
- Widget HTML, Client Script, and Server Script are expected core components; Link Function is optional.
- Widget `option_schema` defines configurable instance options. Instance option values are stored on `sp_instance` as JSON.
- Widget instances live in `sp_instance` and reference widgets through `sp_widget`.
- Layout traversal usually goes `sp_instance.sp_column` -> `sp_column.sp_row` -> `sp_row.sp_container` -> `sp_container.sp_page`.

## Service Portal Themes

- Portal table: `sp_portal`; useful fields: `sys_id,title,url_suffix,theme,dark_theme,homepage,login_page,css_variables`.
- Theme table: `sp_theme`; useful fields: `sys_id,name,css_variables,header,footer,navbar_fixed,footer_fixed,logo,icon,turn_off_scss_compilation`.
- CSS table: `sp_css`; useful fields: `sys_id,name,css,turn_off_scss_compilation`.
- CSS include table: `sp_css_include`; useful fields: `sys_id,name,source,sp_css,url,lazy_load`.
- Theme/CSS M2M table: `m2m_sp_theme_css_include`; useful fields: `sys_id,sp_theme,sp_css_include,order`.
- Header/footer table: `sp_header_footer`; useful fields: `sys_id,name,template,css,script`.
- For portal-specific theming, clone the current `sp_theme`, point only the target `sp_portal.theme` to the clone, and leave shared stock themes unchanged.
- `css_variables` accepts SCSS variables and plain selector blocks. Theme variables reliably compile into `styles/scss/sp-bootstrap-basic.scss?portal_id=...&theme_id=...`.
- Theme CSS includes may be present in related lists but not always emit into the compiled portal assets on this PDI; verify before relying on them.
- Page-specific CSS lives on `sp_page.css` and is returned by `/api/now/sp/page?...`; use it for a single page when a theme override is too broad.
- Baseline widgets may be read-only even for admin. If `sp_widget.css` does not update, use `sp_page.css` or theme-level overrides instead of assuming the write worked.
- Baseline widget clone example: `Knowledge Attachments` is `sp_widget` sys_id `405cf5910ba832004ce28ffe15673aff`, widget id `kb-attachments`, in scope/package `Knowledge Management - Service Portal` (`bab6dea3db20320099f93691f0b8f590`, scope string `sn_km_portal`).
- Custom clone created for preview-only behavior: `Knowledge Attachments - Preview`, widget id `kb-attachments-preview`, sys_id `d13b6729c36c87906b68770d05013179`.

### Known `sp_config` Records

- Portal `sp_config`: `db57a91047001200ba13a5554ee49050`.
- Stock theme originally used by `sp_config`: `La Jolla` (`a7a6e78277002300a6e592718a10617a`).
- Custom cloned dark theme: `SP Config Dark` (`b0922761c32c87906b68770d05013140`).
- Stock header: `Stock Header` (`bf5ec2f2cb10120000f8d856634c9c0c`).
- Homepage `sp_config_homepage`: `b5b04bd3d721120023c84f80de610319`.
- Homepage overview widget: `Service Portal Config Overview` (`18923736673112008dd992a557415a82`).
- Widget editor page: `widget_editor` (`73dbbc9247301200ba13a5554ee490f5`).
- Widget editor generated wrapper seen in CSS: `.v6e7bf89247301200ba13a5554ee490e3`.
- Useful legacy widget editor selectors: `.empty-state-wrapper .empty-state`, `.select2-container`, `.select2-drop`, `.select2-chosen`, `.CodeMirror`, `.ace_editor`, `.minibar`.

## Stories

- Story table: `rm_story`
- This instance requires `eap_team`.
- `eap_team` references `sn_apw_advanced_eap_team`.
- Useful state values on this PDI: `Draft=-6`, `Ready=1`, `Work in progress=2`, `Ready for testing=-7`, `Testing=-8`, `Complete=3`, `Cancelled=4`.
- Resolve teams before creating a story:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Invoke-ServiceNowTable.ps1" `
  -Table sn_apw_advanced_eap_team `
  -Fields 'sys_id,name,short_description' `
  -DisplayValue true
```

## Application Scope

- Current app scope is stored per user as `sys_user_preference.name=apps.current_app`.
- Scoped current update set is stored per user as `sys_user_preference.name=updateSetForScope<sys_scope.sys_id>`.
- For `Simen Admin`, resolve the preference with:

```text
user=6816f79cc0a8016401c5a33be04be441^name=apps.current_app
```

- Employee Center scope value is `sn_ex_sp`.

## Update Sets

- Update set table: `sys_update_set`; useful fields: `sys_id,name,application,state`.
- Captured customer update table: `sys_update_xml`; useful fields: `sys_id,name,target_name,type,action,update_set,payload`.
- For scoped work, set `sys_update_set.application` to the target `sys_scope.sys_id`, then set both current app and scoped update-set user preferences for the developer.
- Service Portal widget customer updates use names like `sp_widget_<sp_widget.sys_id>`.

## Business Logic Tables

- Business rules: `sys_script`
- Script Includes: `sys_script_include`
- Client scripts: `sys_script_client`
- UI policies: `sys_ui_policy`
- UI policy actions: `sys_ui_policy_action`

Always inspect `sys_dictionary` for mandatory fields before creating records in these tables.

## Outbound Integrations

- REST Message parent: `sys_rest_message`
- HTTP Method: `sys_rest_message_fn`
- Parent headers: `sys_rest_message_headers`
- Method headers: `sys_rest_message_fn_headers`
- Method variables/query parameters: `sys_rest_message_fn_param_defs`
- Connection & Credential Alias: `sys_alias`
- Connection base table: `sys_connection`
- HTTP(s) Connection extension table: `http_connection`
- Basic auth profile: `sys_auth_profile_basic`
- OAuth profile: `oauth_entity_profile`
- Outbound HTTP log: `sys_outbound_http_log`

Important fields:

- `sys_rest_message`: `sys_id,name,rest_endpoint,authentication_type,basic_auth_profile,oauth2_profile,sys_scope`
- `sys_rest_message_fn`: `sys_id,function_name,http_method,rest_message,rest_endpoint,content,authentication_type,basic_auth_profile,oauth2_profile,use_mid_server,sys_scope`
- `sys_outbound_http_log`: `sys_id,sys_created_on,url,method,response_status,response_time,request_body,response_body`

PDI verified:

- Direct `sn_ws.RESTMessageV2()` outbound calls to JSONPlaceholder work.
- `sys_outbound_http_log` captured the test call with `response_status=200`.
- Admin can create/write REST Message, HTTP Method, connection alias, connection, basic auth profile, and ATF records.
- Global practice records:
  - Story `STRY0010006`.
  - Update set `CODX - Public API practice integration`.
  - REST Message `Codex Public API Practice` (`ce9afdefc3608bd06b68770d05013157`).
  - Script Include `global.CodexPublicApiPractice` (`429afdefc3608bd06b68770d050131a5`).

Load `references/integrations.md` before changing these records.

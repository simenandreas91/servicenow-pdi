# Service Operations Workspace Lessons

- Before changing Service Operations Workspace menus or forms, confirm whether Simen means stock SOW or a custom workspace such as FFI ITSM. Stock SOW in this PDI uses `sys_ux_list_menu_config=48c6565ec3013010965e070e9140dd39` (`Default - SOW`) and app config `4d69d0ed73c4301045216238edf6a7ea`; do not create or edit custom workspace menu records unless explicitly requested.
- Stock SOW already has an `Interactions` list category (`sys_ux_list_category=aa9371eb53313010b569ddeeff7b1224`) and interaction lists. Prefer updating/reusing those entries for filters such as `Åpne`, `Tilordnet til meg`, and `Alle` instead of creating parallel categories.
- For interaction SOW form layout, check both Service Operations Workspace views: existing record section `ef26b8f7739230102eb52d2b04f6a709` and new-record section `27d659f353010110b569ddeeff7b12ee`. Keep generic `Workspace` view changes out of stock SOW stories unless the user asks for broader workspace coverage.
- Prefer UI16 form/list configuration for SOW record fields and list columns. In practice, open an affected record in UI16, switch **View** to the workspace-specific view such as `Service Operations Workspace`, and configure the form/list there; avoid UI Builder unless the actual page composition or component wiring must change.
- Stock SOW incident record/list layouts use `sys_ui_view=f5c0a49877413010dc2c885d9f5a999e` (`sow`, title `Service Operations Workspace`). Record form fields are classic `sys_ui_section` plus `sys_ui_element`; list columns are `sys_ui_list` plus `sys_ui_list_element`. Inspect both before editing because the SOW form may already include fields that the list does not.
- Verified SOW incident list example, 2026-05-24: `sys_ui_list=202c83d453f13010ae50ddeeff7b1251` (`incident`, parent `incident`, view `sow`) was extended with `sys_ui_list_element=715b63a1c3c5439065eefdec05013172` for `subcategory` at position `10`. The live ordered columns resolved as `number,short_description,caller_id,category,business_service,priority,state,assignment_group,assigned_to,opened_at,subcategory`.
- `sys_ui_list_element` can write successfully through Table API without naturally creating a customer update. Force-capture the row with `Save-ServiceNowCustomerUpdate.ps1`, then inspect `sys_update_xml.application`; for the SOW incident list-column test the captured application was `global`, so the clean delivery update set was Global (`SOW Incident - add subcategory list column`, `278b6ba1c3c5439065eefdec0501312f`) and the empty SOW-scoped update set was removed.
- If a story pass accidentally creates out-of-scope workspace records or update sets, clean up both the records and their `sys_update_xml` rows before moving the story to testing. Final delivery should have only the intended scoped update set populated.
- Stock SOW interaction work often captures both SOW-scoped UX list records and Global records such as `sys_choice` or `sys_ui_element`. Split those into same-named update sets by `sys_update_xml.application` before delivery; do not leave Global artifacts inside the SOW-scoped update set.

## App Engine Studio Generated Workspaces

Durable notes from the PDI `FFI Workspace` update set (`0c81844cc301075065eefdec0501311e`, app `FFI Workspace`, scope `x_1122545_ffi_wo_0`, created 2026-05-19). App Engine Studio generated 174 customer updates for a starter workspace; this is a useful baseline for future custom workspace edits.

- An App Engine-generated workspace is not just one UX page. The core chain is `sys_app` / `sys_scope` -> `sys_ux_page_registry` -> `sys_ux_app_config` -> `sys_ux_app_route` -> `sys_ux_screen_type` -> `sys_ux_screen` -> `sys_ux_macroponent`. For FFI Workspace the page registry is path `ffi-workspace`, parent app `Unified Navigation app shell`, root macroponent `Workspace App Shell`; app config is `FFI Workspace App Config`.
- The generated route set included `home`, `list`, `record`, `simplelist`, `search`, `notificationtray`, `dashboards`, `analytics-center`, `ac_kpi_details`, `visualization-designer`, and `kb_view`. Each route points to a screen collection (`sys_ux_screen_type`) and active default screen (`sys_ux_screen`); table-specific record pages were additive screens with order `100` for `Incident Record Page` and `Requested Item Record Page`, while the generic `Record Default` screen stayed at order `0`.
- Workspace shell behavior is driven by `sys_ux_page_property` on the page registry. Important generated properties were `view=workspace-ffi-workspace-0`, `listConfigId`, `wbApplicabilityConfigId`, `ribbonConfigId`, `ribbonLocation=sidebar`, `actionConfigId`, `globalSearchDataConfigId`, `global_search_configurations`, and JSON chrome properties such as `chrome_toolbar`, `chrome_tab`, `chrome_header`, `chrome_main`, `chrome_footer`, and `chrome_preferences`. Inspect these before editing navigation, tabs, headers, search, preferences, or default form/list view behavior.
- Navigation lists are a separate graph: `sys_ux_list_menu_config` -> `sys_ux_list_category` -> `sys_ux_list`, then `sys_ux_applicability_m2m_list` binds each list to the workspace audience. FFI generated categories `Incident` and `Requested Item`, each with `Open`, `Unassigned`, `Closed`, and `All` lists. Filters were simple encoded queries such as `active=true^EQ`, `active=true^assigned_toISEMPTY^EQ`, and `active=false^EQ`.
- To add a new FFI workspace table to the Lists route, create a category on `sys_ux_list_category` with `configuration=57d1048cc301075065eefdec050131ad`, then create one or more `sys_ux_list` rows with the same `configuration`, the new `category`, table name, encoded query, columns, and order. Finally create a `sys_ux_applicability_m2m_list` row from each list to `Audience for app ffi-workspace` (`sys_ux_applicability=1fd1048cc301075065eefdec0501319c`); otherwise admins may see the list while workspace users do not.
- Verified FFI Interaction example, 2026-05-24: update set `FFI Workspace - Interaction list` (`f9a96fadc385439065eefdec05013199`) created category `Interaction` (`09c9efadc385439065eefdec0501313c`, order `300`), list `Open` (`1bc963edc385439065eefdec0501312c`, table `interaction`, condition `active=true^EQ`, columns `number,opened_at,type,state,short_description,opened_for,assignment_group,assigned_to,sys_updated_on`), and list applicability `81d9a3edc385439065eefdec05013117`. Xplore verification proved the encoded query is valid and the audience includes non-admin role `x_1122545_ffi_wo_0.user`.
- The workspace audience and access model were generated as `sys_ux_applicability` plus app roles `x_1122545_ffi_wo_0.admin` and `x_1122545_ffi_wo_0.user`; both contain `canvas_user`. The UX route ACL was a `read` ACL on `x.1122545.ffi-workspace.*` with those two roles. When a workspace loads but routes or lists are hidden, inspect audience, role containment, and UX route ACL together.
- App Engine generated a dedicated UI view `workspace-ffi-workspace-0` (`Workspace FFI Workspace 0`) and captured classic layout records for workspace forms/lists. The incident workspace form had generated sections for main fields, `Notes`, `Related Records`, and `Resolution Information`; list layouts were generated for `incident` and `sc_req_item`. Related lists were captured as update XML records such as `sys_ui_related_incident_workspace-ffi-workspace-0` and `sys_ui_related_sc_req_item_workspace-ffi-workspace-0`.
- Search has two layers. The workspace shell references `sys_search_context_config` through `globalSearchDataConfigId`, and generated search sources/facets lived in `sys_search_source`, `sys_search_filter`, and `m2m_search_context_config_search_source`. AI Search used `ais_search_profile`, dictionaries, and search-source mappings. In the FFI update set the `ais_datasource` records for `Incident` and `Requested Item` were `global` application records, while the search profile and mappings were in the workspace app scope; this mixed-scope pattern can be expected from App Engine and should be reviewed before calling it noise.
- App Engine also generated a starter Platform Analytics dashboard (`par_dashboard`) named after the workspace, dashboard permission records for admin/user roles and the creating admin, a tab/canvases, and widgets. The surviving FFI widgets were a `Happening Now` heading, three `Single score` cards for `My Tasks`, `Unassigned Tasks`, and `Critical Tasks`, and a `My Work` list against `incident`. Some widget customer updates referenced records that no longer existed by the time of inspection, so check live records as well as `sys_update_xml`.
- The generated workspace used Base Agent Workspace theme through `m2m_app_config_theme`, a `sys_ux_ribbon_config`, three duplicate `viewport_gph/initiallyCollapsed` client scripts that collapse Agent Assist based on `workspace.showAgentAssist`, and relay UX events for home/simple-list navigation. These are scaffold artifacts to inspect before changing chrome, ribbon, or navigation behavior.
- For future App Engine workspace edits, start with `Get-ServiceNowUpdateSetSummary.ps1`, then inspect page registry/app config/page properties, route-screen-macroponent records, list menu/category/list/applicability records, search context/search source/AI Search records, dashboard records, and the generated workspace UI view/form/list layouts. Avoid editing copied shell JSON blindly; change the narrow table family that owns the behavior.
- For App Engine workspace display renames, keep stable technical identifiers such as `sys_scope.scope` and `sys_ux_page_registry.path` unchanged. Rename the visible app/page records by sys_id instead: `sys_app`/`sys_scope.name`, `sys_ux_page_registry.title`, and any generated UX config/menu/ribbon/dashboard names that still contain the old label.
- Workspace default-login routing is separate from workspace access. Use `sys_homepage_destination_rule` plus `user_criteria` for login redirection, and separately ensure the target users match the workspace `sys_ux_applicability` audience through roles or audience user-criteria inclusions; do not rely on a group record alone to grant workspace access. For App Engine workspaces, the destination is usually `/now/<sys_ux_page_registry.path>/<sys_ux_app_config.landing_path>`, for example `/now/ffi-workspace/home`. Create the rule in Global with a lower order than stock SOW rules (`50` beat OOTB `100` in the PDI) and use a constrained background script if Table API/UI create is blocked by the table's restrictive ACLs.

## Declarative Actions And SOW Form Modals

- For a step-by-step Workspace modal build checklist, especially when using `g_modal.showFields(...)`, also load `references/lessons-workspace-modals.md`.
- In SOW and other Configurable Workspaces, prefer form Declarative Actions over legacy UI Actions when the button must appear in the Workspace action bar, list header, related list header, field decorator, or attachment area. Legacy UI Actions can appear in the Workspace form action bar, but Declarative Actions are the upgrade-safe pattern for Next Experience pages and do not require taking ownership of the base UI Builder page.
- For a form button that opens a modal, use a `sys_declarative_action_assignment` with model `Form`, table-specific conditions, and `Implemented as = UXF Client Action`. A plain `Server Script` action is appropriate for immediate server-side updates, but it cannot collect modal input by itself.
- For SOW-style form modals, reuse the OOTB form-modal route when available instead of building a custom modal page. The common SOW payload shape is:

```json
{
  "route": "sowformmodalv2",
  "fields": {
    "table": "{{table}}",
    "sysId": "{{sysId}}",
    "title": "",
    "view": "<custom_modal_view>"
  },
  "params": {
    "saveLabel": "<button_label>",
    "isGFormSave": true,
    "setFieldOnLoad": {},
    "setFieldOnSave": {},
    "modalTitle": "<modal_title>"
  }
}
```

- The `<custom_modal_view>` is the key extension point. Create a dedicated form view for the target table and put only the modal fields on it, then apply view-specific UI Policies and Client Scripts. For a RITM `Resolve` action, start with a view such as `sow_sc_req_item_resolve_modal` containing `comments` and any state/stage fields that must be displayed or controlled. Make `comments` mandatory so the submit creates a customer-visible additional comment.
- To restrict a RITM action to the assignee, configure both visibility and enforcement: record/dynamic condition should require `current.assigned_to == gs.getUserID()` plus active/write checks, and any server-side save logic or UI policy must not rely only on the button being hidden. Confirm the RITM state model before setting state; `comments` is journal input on `task` and is visible to requesters in portal/record activity when ACLs and portal widgets allow additional comments.
- Add the form action to the workspace action configuration/layout, otherwise the Declarative Action record may exist but not render. For form actions the important records are `sys_ux_action_config`, `sys_ux_form_action`, `sys_ux_form_action_layout`, and `sys_ux_form_action_layout_item`; reuse the stock SOW action config/layout when the requirement is for stock SOW, and create additive layout records for custom workspaces.
- For simple SOW form buttons that immediately run server-side logic, a `sys_ux_form_action` can wrap a classic `sys_ui_action` with `action_type=ui_action`, then a `sys_ux_form_action_layout_item` with `item_type=action` and the target table can expose it in the SOW action bar. This is the same pattern as OOTB incident `Assign to me` and is lower risk than a separate client/modal Declarative Action when no modal input is needed. Keep the UI Action condition and server script guarded because Workspace visibility is not an authorization boundary.
- Do not use the same UI Action as both a classic backend modal and a SOW modal when the client APIs differ. Classic forms support patterns such as `GlideDialogWindow` plus a `sys_ui_page`; SOW/Next Experience supports `g_modal`/Declarative Action patterns. If both channels need the same business result, share only the server-side Script Include/Ajax processor and keep separate channel-specific launchers.
- A UXF Client Action only prepares the payload; it will not open the modal until a `sys_ux_addon_event_mapping` bridges the action to the page. For stock SOW, use source element ID `ui_action_bar`, source declarative action = the new action, parent macroponent = the SOW record page macroponent, target event = the SOW open-form-modal event such as `[SOW] Open record form modal v2`, and a payload mapping that passes `route`, `fields`, `params`, and optionally `size` from the action payload:

```json
{
  "type": "MAP_CONTAINER",
  "container": {
    "route": {
      "type": "EVENT_PAYLOAD_BINDING",
      "binding": { "address": ["route"] }
    },
    "size": {
      "type": "EVENT_PAYLOAD_BINDING",
      "binding": { "address": ["size"] }
    },
    "fields": {
      "type": "EVENT_PAYLOAD_BINDING",
      "binding": { "address": ["fields"] }
    },
    "params": {
      "type": "EVENT_PAYLOAD_BINDING",
      "binding": { "address": ["params"] }
    }
  }
}
```

- For non-SOW Configurable Workspaces, first inspect whether the record page already has the SOW modal page collection/event handler. If not, either configure a UI Interaction where supported, or add the equivalent modal page collection, handled event, and add-on event mapping. Do not copy or modify OOTB SOW pages unless the user explicitly accepts owning the UI Builder variant.
- Before implementing a SOW Declarative Action, inspect existing incident actions such as `Resolve` and their payload definitions/event mappings, because OOTB incident actions are the closest working examples. If moving SOW actions into another workspace, copy the event mapping pattern and ensure the target workspace record page has the required modal collection and handled event; merely adding the action to a layout can show the button while clicks do nothing or open a modal that does not save.

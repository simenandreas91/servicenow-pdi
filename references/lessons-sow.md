# Service Operations Workspace Lessons

- Before changing Service Operations Workspace menus or forms, confirm whether Simen means stock SOW or a custom workspace such as FFI ITSM. Stock SOW in this PDI uses `sys_ux_list_menu_config=48c6565ec3013010965e070e9140dd39` (`Default - SOW`) and app config `4d69d0ed73c4301045216238edf6a7ea`; do not create or edit custom workspace menu records unless explicitly requested.
- Stock SOW already has an `Interactions` list category (`sys_ux_list_category=aa9371eb53313010b569ddeeff7b1224`) and interaction lists. Prefer updating/reusing those entries for filters such as `Åpne`, `Tilordnet til meg`, and `Alle` instead of creating parallel categories.
- For interaction SOW form layout, check both Service Operations Workspace views: existing record section `ef26b8f7739230102eb52d2b04f6a709` and new-record section `27d659f353010110b569ddeeff7b12ee`. Keep generic `Workspace` view changes out of stock SOW stories unless the user asks for broader workspace coverage.
- If a story pass accidentally creates out-of-scope workspace records or update sets, clean up both the records and their `sys_update_xml` rows before moving the story to testing. Final delivery should have only the intended scoped update set populated.
- Stock SOW interaction work often captures both SOW-scoped UX list records and Global records such as `sys_choice` or `sys_ui_element`. Split those into same-named update sets by `sys_update_xml.application` before delivery; do not leave Global artifacts inside the SOW-scoped update set.

## Declarative Actions And SOW Form Modals

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

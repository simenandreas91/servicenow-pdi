# Creating Workspace Modals With Now Experience

Use this follow-along checklist when creating a modal from a Service Operations Workspace or Configurable Workspace form action.

## Pattern Choice

1. Confirm the target surface.
   - UI16 classic form: use `references/lessons-ui16.md`.
   - SOW or Configurable Workspace: use this guide.
   - Do not reuse the same client launcher across UI16 and Workspace. Share only server-side logic.

2. Inspect local working examples first.
   - Query `sys_declarative_action_assignment` for the target table and similar labels such as `Resolve`, `Reopen`, `Copy`, or `Assign`.
   - In Simen's PDI, a useful RITM example is `sow_ritm_resolve`, which uses a Declarative Action client script with `g_modal.showFields(...)` and GlideAjax.
   - Incident examples often show the stock SOW action style, roles, conditions, and modal scripts.

3. Prefer `g_modal.showFields(...)` when the modal only needs a few fields and custom server save logic.
   - This avoids owning or cloning UI Builder pages.
   - It is faster than building a custom modal route.
   - It works well with a shared client-callable Script Include.

4. Consider the SOW `sowformmodalv2` route when the modal should render a real form view and save with g_form behavior.
   - This requires payloads, event mappings, and a purpose-built modal view.
   - Inspect an existing action/event mapping before creating records.

## Records To Create For A Form Action Button

For a button in the Workspace form action bar, create:

1. `sys_declarative_action_assignment`
   - `table=<target_table>`
   - `model=Form`
   - `declarative_action_type=client_script`
   - `form_position=action_bar`
   - `button_position=right`
   - `enable_for_all_experiences=true` unless intentionally workspace-restricted
   - Add visibility conditions directly on this record.

2. `sys_ux_form_action`
   - `table=<target_table>`
   - `action_type=declarative_action`
   - `declarative_action=<sys_declarative_action_assignment>`
   - Match the existing table-specific action specificity where possible.

3. `sys_ux_form_action_layout_item`
   - `action_layout=<existing layout for the table/workspace>`
   - `action=<sys_ux_form_action>`
   - `item_type=action`
   - `table=<target_table>`
   - Set an order relative to neighboring actions.

If the field written by the modal should be visible in Workspace, also update the relevant workspace form layout:

4. `sys_ui_element` / `sys_ui_section`
   - Find the correct workspace-specific `sys_ui_section` for the target table and view.
   - Add the field at a deterministic position.
   - Avoid duplicate positions by shifting later elements.
   - Form layout updates may need `Save-ServiceNowCustomerUpdate.ps1` on `sys_ui_section`.

## `g_modal.showFields(...)` Client Script Template

Use this shape for a small Workspace modal that saves through GlideAjax:

```javascript
function onClick() {
    getMessages([
        'Action title',
        'Choice label',
        'Comment',
        'Cancel',
        'Save',
        'Success message',
        'Failure message'
    ], openModal);

    function openModal(messages) {
        var fields = [{
            type: 'choice',
            name: 'reason',
            label: messages['Choice label'],
            value: g_form.getValue('u_reason') || '',
            choices: [{
                displayValue: 'Internal',
                value: 'internal'
            }, {
                displayValue: 'External',
                value: 'external'
            }],
            mandatory: true
        }, {
            type: 'textarea',
            name: 'comment',
            label: messages['Comment'],
            mandatory: true
        }];

        g_modal.showFields({
            title: messages['Action title'],
            size: 'md',
            resizableConfig: {
                enableResizable: true,
                resizableMinWidth: 420,
                resizableMinHeight: 240
            },
            fields: fields,
            cancelTitle: messages['Cancel'],
            confirmTitle: messages['Save'],
            confirmType: 'confirm'
        }).then(function(fieldValues) {
            var reason = getModalFieldValue(fieldValues, 'reason');
            var comment = getModalFieldValue(fieldValues, 'comment');

            var ga = new GlideAjax('ExampleAjax');
            ga.addParam('sysparm_name', 'save');
            ga.addParam('sysparm_sys_id', g_form.getUniqueValue());
            ga.addParam('sysparm_reason', reason || '');
            ga.addParam('sysparm_comment', comment || '');
            ga.getXMLAnswer(function(answer) {
                if (answer == 'success') {
                    g_form.addInfoMessage(messages['Success message']);
                    g_form.reload();
                } else {
                    g_form.addErrorMessage(messages['Failure message'] + ' ' + answer);
                }
            });
        });
    }

    function getModalFieldValue(response, fieldName) {
        if (!response)
            return '';

        if (response[fieldName])
            return normalizeFieldValue(response[fieldName]);

        var updatedFields = response.updatedFields || response.fields || [];
        if (updatedFields[fieldName])
            return normalizeFieldValue(updatedFields[fieldName]);

        if (Array.isArray(updatedFields)) {
            for (var i = 0; i < updatedFields.length; i++) {
                var field = updatedFields[i];
                if (field && (field.name === fieldName || field.fieldName === fieldName || field.id === fieldName))
                    return normalizeFieldValue(field.value !== undefined ? field.value : field);
            }
        }

        return '';
    }

    function normalizeFieldValue(value) {
        if (value === null || value === undefined)
            return '';
        if (typeof value === 'string')
            return value;
        if (value.stagedValue !== undefined)
            return normalizeFieldValue(value.stagedValue);
        if (value.value !== undefined)
            return normalizeFieldValue(value.value);
        if (value.displayValue !== undefined)
            return normalizeFieldValue(value.displayValue);
        if (value.display_value !== undefined)
            return normalizeFieldValue(value.display_value);
        return String(value);
    }
}
```

## Field Value Pitfalls

- `g_modal.showFields(...)` can return values in different shapes depending on field type and platform version.
- Always use a helper like `getModalFieldValue(...)` instead of assuming `fieldValues.updatedFields[0].value`.
- Normalize `stagedValue`, `value`, `displayValue`, and `display_value`.
- For small fixed choice lists, inline `choices` with `{displayValue, value}` pairs is quick and stable.
- For table-maintained choices, inspect whether the local instance already has a helper pattern before trying to dynamically fetch choices in the client script.

## Server Save Pattern

- Keep business logic in a client-callable Script Include.
- Reuse the same Script Include from UI16 and Workspace when the behavior is identical.
- Validate again server-side; modal mandatory flags are not security.
- Coerce GlideAjax text parameters before JavaScript string methods:
  ```javascript
  var comment = this.getParameter('sysparm_comment');
  var commentText = comment ? String(comment) : '';
  ```
- Check record and field write permissions before update:
  ```javascript
  if (!gr.canWrite() || !gr.comments.canWrite())
      return 'error: You do not have permission.';
  ```

## Visibility Rules

- Hide the button with `record_conditions`, `script_condition`, required roles, or write access flags on `sys_declarative_action_assignment`.
- Do not rely on button visibility as authorization. The Script Include must still enforce permissions.
- Use `script_condition` for logic that needs GlideRecord field permission checks.
- Use `record_conditions` for obvious record-state checks, such as active records or excluding closed states.

Example:

```text
record_conditions = active=true^stateNOT IN3,4,7,8
script_condition = current.canWrite() && current.state.canWrite() && current.u_on_hold_reason.canWrite() && current.comments.canWrite()
```

## Scope And Update Set Hygiene

- Workspace action records for custom global table behavior may be Global, even when they render in SOW.
- SOW form layouts often belong to app scopes such as Request Management for Service Operations Workspace.
- Incident SOW action-bar records normally belong to Incident Management for Service Operations Workspace (`sn_sow_inc`, scope sys_id `49aff4bb733320103e366238edf6a70f`), not Global.
- Split work by `sys_update_xml.application`:
  - Global update set for `sys_declarative_action_assignment`, `sys_ux_form_action`, and global action layout items.
  - SOW-scoped update set for SOW-owned `sys_ui_section` form layout updates.
- Prefer the Table API helper for creating `sys_declarative_action_assignment`, `sys_ux_form_action`, and `sys_ux_form_action_layout_item` records after switching to the intended app/update set. Server-side GlideRecord inserts in some workspace tables can return null sys_ids or create unintended duplicate customer updates; if that happens, inspect live records and delete both the bad records and their `sys_update_xml` rows.
- Form layout changes may not auto-capture. If the live layout changed but the update set is empty, force capture:
  ```powershell
  Save-ServiceNowCustomerUpdate.ps1 -Table sys_ui_section -SysId <section_sys_id> -UpdateSetSysId <update_set_sys_id>
  ```
- Confirm every update set with `Confirm-ServiceNowUpdateCapture.ps1` or `Get-ServiceNowUpdateSetSummary.ps1`.

## RITM On Hold SOW Example

For the RITM On Hold modal in Simen's PDI:

- Reused server logic: `RITMOnHoldAjax.setOnHold`.
- Created Workspace action records:
  - `sys_declarative_action_assignment`: `sow_ritm_on_hold`
  - `sys_ux_form_action`: `On Hold`
  - `sys_ux_form_action_layout_item`: action bar item at order `95`
- Used `g_modal.showFields(...)` with:
  - `choice` field `on_hold_reason`
  - `textarea` field `comment`
- Added visibility:
  - show for active RITMs not in closed states and not already On Hold
  - require write access to state, reason, and comments
- Added `u_on_hold_reason` to the SOW RITM form layout after `state`.
- Captured action records in Global and form layout in Request Management for Service Operations Workspace.

## Incident On Hold SOW Example

For Incident On Hold in Simen's PDI:

- Existing state and reason fields were reused:
  - `incident.state=3` means On Hold.
  - `incident.hold_reason` stores the On hold reason.
- Added hold reason choices on `incident.hold_reason`:
  - `6 = Internal`
  - `7 = External`
- Reused server logic from both UI16 and Workspace through `IncidentOnHoldAjax.setOnHold`.
- Created Workspace action records in `sn_sow_inc`:
  - `sys_declarative_action_assignment`: `sow_incident_on_hold`
  - `sys_ux_form_action`: `On Hold`
  - `sys_ux_form_action_layout_item`: action bar item at order `95`
- Used `g_modal.showFields(...)` with:
  - `choice` field `hold_reason`
  - `textarea` field `comment`
- Include all intended Incident hold choices in the Workspace modal. Unlike UI16 `g:ui_choicelist`, Workspace inline choices do not automatically reflect `sys_choice`.
- Visibility used:
  ```text
  record_conditions = active=true^stateNOT IN3,6,7,8
  script_condition = current.canWrite() && current.state.canWrite() && current.hold_reason.canWrite() && current.comments.canWrite()
  ```
- Captured the shared choices/UI16/server records in Global and the SOW action records in `sn_sow_inc`, with the scoped set parented to the Global delivery set.

## Test Checklist

1. Verify records exist and are active.
2. Confirm the action is in the correct `sys_ux_form_action_layout`.
3. Confirm visibility logic against representative state values with `GlideFilter.checkRecord(...)` where useful.
4. Confirm the server Script Include save path with temporary records.
5. Visually reload Workspace and check:
   - button appears only when expected
   - modal opens
   - required fields validate
   - save updates fields and reloads the form
6. Confirm update-set capture by application scope.
7. Clean up test records and restore developer preferences.

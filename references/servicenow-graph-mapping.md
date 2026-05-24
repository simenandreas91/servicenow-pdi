# ServiceNow Graph Mapping

Use this for unfamiliar apps, tangled processes, cross-channel behavior, or changes with uncertain blast radius. The pattern is adapted from graph-first repository analysis: deterministic inventory first, relationship map second, guided tour third, impact analysis before edits.

## When To Use

- You do not know which artifacts implement the behavior.
- The change crosses table, Flow, script, ACL, notification, Portal, Workspace, or HRSD boundaries.
- A defect could be caused by data, permissions, UI filtering, event/Flow execution, or integration state.
- You need a fast onboarding map for a custom scoped app or legacy implementation.

Skip it for a single known record edit, a small notification tweak, or any task where the target artifact and verification path are already obvious.

## Node Types

Represent only facts you have inspected. Keep the map small enough to fit in the current task.

- `table`: `sys_db_object`, target business tables, generated child/runtime tables.
- `field`: important dictionary fields, choices, references, mandatory/default behavior.
- `script`: Business Rules, Script Includes, Client Scripts, UI Policies, Fix Scripts.
- `flow`: flows, subflows, actions, triggers, connection aliases.
- `security`: ACLs, roles, groups, user criteria, application access, before-query rules.
- `ui`: modules, menus, forms, views, Portal pages/widgets, Workspace routes/actions.
- `event`: event registrations, notifications, mail scripts, email outcomes.
- `integration`: REST messages, data sources, transform maps, outbound/import logs.
- `hrsd`: HR Service, COE, template, producer, Journey/activity/task metadata.
- `runtime`: sample records, flow contexts, sys_email, logs, generated cases/tasks.

## Edge Types

Use relationship labels that explain behavior:

- `extends`, `references`, `writes`, `reads`, `triggers`, `calls`, `approves`, `notifies`, `renders`, `secures`, `filters`, `runs_as`, `generates`, `transforms`, `integrates_with`, `captured_in`.

Example compact map:

```text
HR Service -> references -> HR Template
Record Producer -> generates -> HR Case
HR Case -> triggers -> Approval Flow
Approval Flow -> generates -> sysapproval_approver
sysapproval_approver -> triggers -> approval.inserted
approval.inserted -> notifies -> Service-specific manager approval notification
Notification -> sends_to -> approver
Notification -> captured_in -> scoped/global update set
```

## Mapping Workflow

1. Start with the user's symptom or target behavior. Write the expected input, output, role, channel, and table.
2. Inventory exact artifacts by stable keys. Use `Find-ServiceNowArtifact.ps1`, `Get-ServiceNowScopeInventory.ps1`, table queries, and focused Xplore probes.
3. Build a compact node/edge list in notes or a temp file. Do not chase every possible related record; stop at one hop past the likely behavior path.
4. Add runtime evidence nodes: one real or safe sample record, event row, flow context, email, log row, ACL result, or rendered UI endpoint.
5. Mark confidence per branch:
   - `confirmed`: inspected record plus runtime proof.
   - `likely`: inspected configuration but no runtime proof yet.
   - `unknown`: plausible branch that needs a targeted probe.
6. Choose the implementation point using the Decision Ladder. Prefer the highest-level confirmed node that controls the behavior.
7. Before editing, do impact analysis:
   - upstream: what creates, calls, or filters this artifact?
   - downstream: what records, events, flows, emails, UI channels, users, or integrations depend on it?
   - security: which roles/users can read, write, or execute it?
   - update set: which application scope captures it?
8. After editing, verify the same path end-to-end and update the map with actual runtime evidence.

## Fast Artifact Queries

Use narrow table reads and only request fields needed for the map:

- Business logic: `sys_script`, `sys_script_include`, `sys_script_client`, `sys_ui_policy`, `sys_ui_policy_action`.
- Flow: `sys_hub_flow`, `sys_hub_flow_base`, `sys_hub_trigger_instance_v2`, `sys_hub_action_instance_v2`, `sys_flow_context`.
- Security: `sys_security_acl`, ACL roles, `sys_user_has_role`, `sys_user_grmember`, user criteria tables.
- Notifications: `sysevent_register`, `sysevent_email_action`, `sys_email`, `sysevent`.
- UI: `sys_app_module`, `sys_ui_section`, `sys_ui_element`, `sp_page`, `sp_widget`, `sp_instance`, `sys_ux_app_route`, `sys_declarative_action_assignment`.
- Update capture: `sys_update_xml`, `sys_update_set`, `sys_scope`.

## Guided Tour Output

For a complex area, report a short tour instead of a raw table dump:

1. Entry point: user action, API call, event, schedule, import, or generated record.
2. Data model: main table, key fields, reference targets, state model.
3. Business logic: rules/flows/scripts in execution order.
4. Security: roles, ACLs, user criteria, application access.
5. UI channel: classic, Portal/EC, Workspace, API, or integration.
6. Runtime proof: sample record/log/email/flow context.
7. Edit point: safest artifact to change and why.
8. Blast radius: what could be affected and how to test it.

## Caveats

- ServiceNow relationships are often implicit: encoded queries, conditions, script strings, event names, table inheritance, and generated runtime records may not appear as direct references.
- Do not over-map. A useful ServiceNow graph is a working set for the current task, not a complete CMDB of the instance.
- Treat form display as weak evidence. Verify saved fields and runtime behavior through records, APIs, Xplore, or the target UI channel.
- For security issues, graph mapping must include role-aware verification; admin visibility is not proof.

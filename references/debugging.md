# ServiceNow Debugging

Load this reference for live diagnosis, including security, Flow, UI, integration, import, and timing failures. Diagnose before changing anything.

## Evidence-First Loop

1. Capture the target profile/instance, release/build, persona and roles, channel, record, exact action, expected result, actual result, timestamp/time zone, frequency, and last known working state.
2. Reconstruct from existing evidence or reproduce through the failing entry point. If reproduction can create/update data, submit a producer, trigger Flow/events/integrations/email, or change a preference/debug setting, obtain explicit authorization first. Find the closest working OOTB or same-table comparison and note the first point where their paths diverge.
3. Verify the underlying record and key fields with a narrow admin read. Confirm active/published state, application scope, domain, installed plugin/capability, and applicability conditions.
4. Trace one request end to end: entry point, query/security, synchronous server logic, client/rendering, event/Flow/async work, integration, and final output.
5. Inspect time-correlated evidence only. Form one hypothesis that explains all observed evidence and run the smallest read-only test that could disprove it.
6. Fix the controlling artifact rather than a symptom. Repeat the original case, a negative/nonmatching case, and one nearby regression case.
7. Remove temporary logging, restore debug settings and impersonation, and document evidence plus any unresolved uncertainty.

Do not debug by making speculative configuration edits, changing several layers at once, disabling security, or flushing the global cache. Do not leave Debug Security Rules, session debugging, verbose integration logging, or temporary Business Rules enabled.

## Layer Triage

| Suspected layer | Inspect | Useful evidence |
| --- | --- | --- |
| Connection/instance | Selected MCP profile, URL, authenticated user, write/delete gates, instance availability | Profile list, health response, HTTP status: OAuth/connector, unknown profile, 401, 403, timeout/sleep |
| Data/query | Target record, reference values, active/domain state, encoded query, dictionary and overrides, parent table | Narrow record read, table shape, aggregate count, working record comparison |
| Security | Table/field ACLs, inherited/wildcard ACLs, roles/groups, user criteria, before-query rules, application access, domain separation | Impersonation + Debug Security Rules, `GlideRecordSecure`, session debug messages |
| Server logic | Business Rules by table/order/timing, Script Includes, Data Policies, events, recursion, transaction cost | System/transaction logs, targeted neutral logging, matching and nonmatching probes |
| Flow/async | Published version, trigger and conditions, run-as, inputs, waits, subflows/actions, retries and errors | Flow execution details, context and step outputs, generated records, events |
| UI/client | Exact Classic/Workspace/Portal/Employee Center route, view, UI Policy, Client Script, action applicability, widget/component options | Browser console and network, rendered DOM, server payload, affected persona |
| Notification | Event registration/producer, notification conditions and weight, recipients, templates, suppression | `sysevent`, `sys_email`, ignored/skipped reason, recipient and body markers |
| Integration | Connection alias/auth profile, REST Message/spoke, endpoint family, timeout/retry, mapping, idempotency | `sys_outbound_http_log`, sanitized response, correlation ID, persisted result |
| Import/transform | Data source, staging row, transform map/order, coalesce, reference/choice handling, scripts | Import/transform run counts, row state/comments/errors, target sys_id |
| Cache/version | Whether the artifact is compiled/cached and whether behavior changed by release/plugin version | Targeted cache evidence, published version, official docs for the detected release |

Use timestamps and stable record identifiers to correlate layers. A record created successfully does not prove the trigger path; a direct subflow/action test does not prove the published wrapper; a Classic UI result does not prove Workspace or Portal.

## Safe Server-Side Probes

Use MCP record reads first. Use Xplore or Scripts - Background only when a server-side API must be exercised and the task permits it. Prefer read-only `GlideRecord`, `GlideRecordSecure`, or `GlideAggregate`; constrain every query and use `setLimit()` for row probes.

Return one compact JSON object between neutral markers so the helper can parse it:

```javascript
(function () {
  var result = {found: false};
  var secureRecord = new GlideRecordSecure('incident');
  if (secureRecord.get('<record_sys_id>')) {
    result.found = true;
    result.canRead = secureRecord.canRead();
    result.display = secureRecord.getDisplayValue();
  }
  gs.print('SN_RESULT_START' + JSON.stringify(result) + 'SN_RESULT_END');
})();
```

Do not run mutation, bulk repair, delete, `setWorkflow(false)`, or `autoSysFields(false)` through a diagnostic probe without explicit authorization and the high-risk checklist in `safety-checklists.md`.

## Visibility And ACLs

When a user cannot see a record, field, action, related item, portal result, or other secured content, separate data existence from security and presentation:

1. Identify the exact user, table, record, field if relevant, operation, and entry point.
2. Confirm the record and target fields exist with a narrow admin read.
3. Reproduce as the affected user. Use impersonation and Debug Security Rules when available.
4. Inspect relevant ACLs in `sys_security_acl`: table, field, parent-table, and wildcard patterns such as `*.none` and `*.field`.
5. Inspect roles/groups, user criteria, before-query Business Rules, domain separation, application access, reference qualifiers, and channel-specific applicability.
6. Use `GlideRecordSecure` for user-visible access behavior. Plain server-side `GlideRecord` can bypass ACL behavior.

Interpret the result:

- Record missing through `GlideRecordSecure`: inspect table/record ACLs, before-query rules, domain separation, and query constraints.
- Record visible but field unreadable: inspect field and wildcard ACLs.
- ACLs pass but UI hides content: inspect view/layout, UI Policy, Client Script, UI/Declarative Action applicability, widget/component logic, related-list conditions, and reference qualifiers.
- Admin works but intended persona fails: do not broaden the persona to admin; fix the least-privilege authorization or application access rule.

Test both a persona that should have access and one that should not. UI hiding alone is never an authorization fix.

## Restricted Caller Access

For errors such as `must declare a Restricted Caller Access privilege`:

1. Parse the operation, denied table/API, caller artifact/source scope, and declaring target scope.
2. Resolve caller and target applications in `sys_scope`; resolve table targets in `sys_db_object`.
3. Inspect `sys_restricted_caller_access` and `sys_scope_privilege` before creating anything. Prefer the narrowest source-specific and target-specific grant.
4. Set the source application and update-set context before creating deployable privilege records.
5. Verify from the caller scope and confirm clean capture in the intended update set.

A table-targeted restricted-caller record commonly has this shape; verify choice values and fields on the target release before writing:

```json
{
  "source_scope": "<caller_sys_scope_sys_id>",
  "source_type": "5",
  "source": "",
  "source_table": "",
  "target_scope": "<declaring_app_sys_scope_sys_id>",
  "target_type": "1",
  "target_table": "sys_db_object",
  "target": "<target_sys_db_object_sys_id>",
  "operation": "read",
  "status": "2",
  "rca_type": "real_rca",
  "description": "Allow <caller app> to <operation> <target> for <runtime need>."
}
```

Do not create a broad scope-to-scope grant merely because it removes an error. Confirm whether the runtime needs a Restricted Caller Access row, a concrete `sys_scope_privilege`, table Application Access, an ACL change, or a supported API instead.

## Performance Diagnosis

When latency, timeouts, or transaction growth are involved, inspect expected row volume, query selectivity/indexes, queries inside loops, synchronous integration calls, repeated reference lookups, recursion, Flow fan-out, and logging volume. Prefer `GlideAggregate` for counts, bounded probes, async work outside the transaction when semantics allow, finite timeouts/retries, idempotency, and one correlation identifier. Prove improvement with comparable before/after timings and unchanged behavior.

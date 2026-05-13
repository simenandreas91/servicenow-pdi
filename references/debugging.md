# Debugging Visibility and ACLs

When a user cannot see a record, field, related item, portal result, or other secured content, separate "data exists" from "security hides it" before changing anything.

1. Identify the exact user, table, record `sys_id`, field if relevant, operation, and entry point such as form, list, portal widget, related list, reference picker, report, or API.
2. Confirm the record and target fields exist with a narrow admin Table API read.
3. Reproduce as the affected user when possible. In UI, impersonate the user and enable Debug Security Rules.
4. Inspect relevant ACLs in `sys_security_acl`: table ACLs, field ACLs, parent table ACLs, and wildcard patterns such as `*.none` or `*.field`.
5. Use read-only Xplore/background snippets only when ACL behavior must be evaluated through ServiceNow APIs. Prefer `GlideRecordSecure`; plain `GlideRecord` can bypass ACL behavior in server code.

Read-only ACL check:

```powershell
$script = @'
(function () {
  var result = {};
  var table = 'incident';
  var recordSysId = '<record_sys_id>';
  var fieldName = 'short_description';

  var gr = new GlideRecordSecure(table);
  if (!gr.get(recordSysId)) {
    result.recordVisible = false;
    result.reason = 'Record not returned by GlideRecordSecure';
  } else {
    result.recordVisible = true;
    result.recordCanRead = gr.canRead();
    result.fieldCanRead = gr.getElement(fieldName).canRead();
    result.display = gr.getDisplayValue();
  }

  gs.print('CODEX_RESULT_START' + JSON.stringify(result) + 'CODEX_RESULT_END');
})();
'@

& "$HOME/.codex/skills/servicenow-pdi/scripts/Invoke-ServiceNowXploreScript.ps1" -Script $script
```

Interpretation:
- Record missing through `GlideRecordSecure`: investigate table/record ACLs, before-query business rules, domain separation, or query constraints.
- Record visible but field unreadable: investigate field ACLs.
- ACLs pass but UI hides content: inspect UI policies, client scripts, form sections/views, portal widget logic, related list conditions, reference qualifiers, reports, or encoded queries.

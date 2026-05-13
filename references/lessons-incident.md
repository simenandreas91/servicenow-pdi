# Incident Process Lessons

- Creating `sys_dictionary` fields on `incident` through the Table API can auto-place those fields on the default Incident form and capture `sys_ui_section` updates. If fields are automation-only, remove the generated `sys_ui_element` rows and delete unintended form-layout customer updates before delivery.
- `sysauto_script` inserts or patches through the Table API may not create `sys_update_xml` rows. After creating a scheduled script execution, verify update capture by `name=sysauto_script_<sys_id>`; if missing, run `Save-ServiceNowCustomerUpdate.ps1` or `new GlideUpdateManager2().saveRecord(grJob)` in the intended update set and confirm the customer update landed there.

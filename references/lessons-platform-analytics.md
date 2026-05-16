# Platform Analytics Dashboard Lessons

Use this when creating or modifying Platform Analytics dashboards (`par_dashboard`) in Simen's PDI. Prefer the UI when visual placement must be hand-tuned, but Table API plus Xplore is fast and reliable for repeatable dashboard creation after one good dashboard pattern is known.

## Fast Workflow

1. Resolve the intended update set by `sys_id`, not only by name. `Set-ServiceNowUpdateSetContext.ps1 -Name` creates a new update set; use `-UpdateSetSysId` when continuing an existing one.
2. Inspect a known-good dashboard's captured `sys_update_xml` rows first. For Platform Analytics, the payload reveals the exact `component_props` JSON that the builder saves.
3. Create or reuse these records in Global unless the inspected dashboard proves otherwise:
   - `par_dashboard`
   - `par_dashboard_tab`
   - `par_dashboard_canvas` twice: one base canvas with no tab and one tab canvas
   - `par_dashboard_user_metadata`
   - `par_dashboard_permission`
   - `par_dashboard_visibility`
   - `par_dashboard_widget` per visualization
4. Put widgets on the tab canvas, not the base canvas.
5. Verify with Xplore by parsing every widget's `component_props`, counting widgets via `canvas.dashboard`, and running matching `GlideAggregate` checks for KPI filters.
6. Confirm update capture with `Confirm-ServiceNowUpdateCapture.ps1`, then restore preferences.

## Dashboard Skeleton

Required starting values:

- `par_dashboard.grid`: `48`
- `par_dashboard.active`: `true`
- `par_dashboard.ready_to_migrate`: `Not Applicable`
- `par_dashboard_visibility.experience`: Platform Analytics page registry `08c73d60537101100834ddeeff7b1287`
- owner permission: `can_read=true`, `can_share=true`, `can_write=true`, `owner=true`, `user=6816f79cc0a8016401c5a33be04be441`
- metadata user fields: `created_by_user` and `updated_by_user` should use Simen Admin `6816f79cc0a8016401c5a33be04be441`
- metadata `widgets_margin`: `$now-global-space--sm`
- metadata `po_project_id_list`: `[]`

The starter dashboard `Platform analytics dashboard test` showed this minimum captured pattern:

- dashboard
- metadata
- two canvases
- permission
- tab
- visibility
- one or more widgets
- optional `sys_translated` rows for translated dashboard name/description

## Common Macroponents

Use `sys_ux_macroponent` to resolve IDs when uncertain. Known IDs in the PDI:

- Single score: `d24d53f60350de7a652caf3188a46ed2`
- Vertical bar: `23051643b7e03010097cb81cde11a910`
- Horizontal bar: `85855283b7e03010097cb81cde11a91d`
- Pie Chart: `035b99ff532101102958ddeeff7b126a`
- Donut: `a2b0596cec6b9d49dd1ff9bf76b5084b`
- Line: `18ac962264404bcc0039359d184b15f3`

## Widget `component_props` Pattern

For table-backed widgets, `component_props` is JSON with:

- `configVersion`: `23.0.0-ci-SNAPSHOT`
- `dataSources[0].sourceType`: `table`
- `dataSources[0].tableOrViewName`: target table such as `sys_user`
- `dataSources[0].filterQuery`: encoded query
- `dataSources[0].preferredVisualizations`: array containing the widget macroponent sys_id
- `dataSources[0].dataCategories`: `["trend","group","simple"]`
- `metrics[0].aggregateFunction`: usually `COUNT`
- `groupBy`: `null` for single score, or a `groupByField` config for grouped charts
- `filterConfigurations`: `@state.parFilters`
- `enableDrilldown`: `true`

Generate unique but stable-looking IDs for `dataSources[0].id`, `metrics[0].id`, and `componentId`; base64 strings are accepted. Coerce Java strings before JavaScript regex replacement in Rhino:

```javascript
String(GlideStringUtil.base64Encode('table:sys_user:Active users')).replace(/=/g, '')
```

Avoid Java `String.replace(regex, value)` ambiguity by using `String(...)` around GlideStringUtil returns.

## User Analytics Query Examples

Useful `sys_user` encoded queries:

- Active users: `active=true`
- New users this month: `sys_created_onONThis month@javascript:gs.beginningOfThisMonth()@javascript:gs.endOfThisMonth()^EQ`
- Users without manager: `managerISEMPTY`
- Users without department: `departmentISEMPTY`
- Active users by department: filter `active=true^departmentISNOTEMPTY`, group by `department`
- Active users by company: filter `active=true^companyISNOTEMPTY`, group by `company`
- Users by location: filter `locationISNOTEMPTY`, group by `location`
- Users by country: filter `countryISNOTEMPTY`, group by `country`
- Active vs inactive users: group by `active`
- Users created per month: filter `sys_created_onONLast 12 months@javascript:gs.monthsAgoStart(12)@javascript:gs.endOfThisMonth()^EQ`, group by `sys_created_on`

## Pitfalls

- Do not pass only `-Name` to `Set-ServiceNowUpdateSetContext.ps1` when the user named an existing update set; it will create a duplicate. Resolve and pass `-UpdateSetSysId`.
- Do not create duplicate dashboards if a script partially succeeds. Re-run idempotently: find the dashboard by exact name, find existing tab/canvases/metadata/permission/visibility, and only add missing widgets when `par_dashboard_widget` count is zero.
- Table shape helpers may report `create_access=false` on some `par_` tables, but admin/Xplore can still insert the builder-owned records. Keep writes narrow and verify capture immediately.
- `required_translations` can be minimal JSON messages for the title and empty state; `sys_translated` rows are not always necessary for created widgets.

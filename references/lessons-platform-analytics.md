# Platform Analytics Dashboard Lessons

Use this when creating or modifying Platform Analytics dashboards (`par_dashboard`) in Simen's PDI. Prefer the UI when visual placement must be hand-tuned, but Table API plus Xplore is fast and reliable for repeatable dashboard creation after one good dashboard pattern is known.

## Fast Workflow

1. Resolve the intended update set by `sys_id`, not only by name. `Set-ServiceNowUpdateSetContext.ps1 -Name` creates a new update set; use `-UpdateSetSysId` when continuing an existing one.
2. Inspect a known-good dashboard's captured `sys_update_xml` rows first. For Platform Analytics, the payload reveals the exact `component_props` JSON that the builder saves.
3. When modifying a workspace-generated dashboard, reuse the existing `par_dashboard`, `par_dashboard_tab`, and tab canvas. The workspace scaffold may already have a small default widget set; update those widgets by `sys_id` and add only the missing widgets by stable `name`.
4. Create or reuse these records in Global unless the inspected dashboard or existing workspace scope proves otherwise:
   - `par_dashboard`
   - `par_dashboard_tab`
   - `par_dashboard_canvas` twice: one base canvas with no tab and one tab canvas
   - `par_dashboard_user_metadata`
   - `par_dashboard_permission`
   - `par_dashboard_visibility`
   - `par_dashboard_widget` per visualization
5. Put widgets on the tab canvas, not the base canvas.
6. Verify with Xplore by parsing every widget's `component_props`, counting widgets via `canvas.dashboard`, and running matching `GlideAggregate` checks for KPI filters.
7. For a generated workspace update set, a broad `Confirm-ServiceNowUpdateCapture.ps1` may report pre-existing mixed-scope rows. Narrow-check dashboard rows in `sys_update_xml` by `nameSTARTSWITHpar_dashboard` and by widget `target_nameLIKE<stable prefix>`.
8. Restore preferences.

## Success Dashboard Apps

- HR/ITSM Success Dashboard indicators are not ordinary `par_dashboard` dashboards. Verify them through Store app/scopes such as `sn_sd`, `sn_sd_common`, `sn_sd_hrsm`, `sn_sd_itsm`, navigation module `now/success-dashboard/home`, Success Dashboard tables (`sn_sd_*`), Self-Service Analytics tables (`ssa_*`), and PA jobs/indicators.
- In Vår Energi DEV on 2026-05-27, HR Success Dashboard indicators (`sn_sd_hrsm`), Success Dashboard Core (`sn_sd`), Success Dashboard Common (`sn_sd_common`), Self-Service Analytics Core (`sn_ssa_core`), PA Premium, PA, and HR PA content pack (`com.sn_hr_pa`) were installed. The `[SD HRSM] Daily Data Collection` and `[SD HRSM] Historic Data Collection` jobs existed but were inactive.
- For Vår Energi STRY0010074, the OOTB HR Analytics Center dashboards existed in DEV as `par_dashboard` records: `HR Agent`, `HR Case Dashboard`, `HR Manager`, `Human Resources Overview`, `Manager Dashboard`, and `SLA Dashboard`. The relevant HR PA data jobs were `[PA HR Case] Daily Data Collection` and `[PA HR Case] Historic Data Collection` in `sn_hr_pa`; both were inactive before activation on 2026-05-27.

## Indicator Backend Model

Platform Analytics still uses the Performance Analytics backend for indicators, sources, breakdowns, scores, and collection jobs. In the PDI, the key tables are:

- `pa_indicators`: automated, formula, manual, and external indicators. Important fields include `name`, `type`, `frequency`, `direction`, `unit`, `aggregate`, `cube`, `conditions`, `collect_records`, `show_realtime_score`, `formula`, and `scripted`.
- `pa_cubes`: indicator sources. Important fields include `name`, `facts_table`, `conditions`, `frequency`, and `calendar`.
- `sysauto_pa`: scheduled data collection jobs.
- `pa_job_indicators`: collection job to indicator relationships.
- `pa_scores_l1`: primary collected score rows used by current PA widgets. The `indicator` field stores the numeric `pa_indicators.id`, not the indicator `sys_id`.
- `pa_scores`: legacy/base score table; do not rely on manually inserting here for Platform Analytics widgets.

Indicator `type` values observed in the PDI:

- `1`: Automated
- `2`: Formula
- `3`: Manual

Useful reference values:

- Daily frequency: `10`
- Count aggregate: `1`
- Count unit `#`: `17b365e2d7320100ba986f14ce6103ad`
- Minimize direction: `2`
- Maximize direction: `3`

Official docs route new/migrated instances under **Platform Analytics Administration** for backend PA configuration. The old backend tables and jobs remain the implementation surface even when the dashboard UI is the newer Platform Analytics experience.

## Indicator Creation Pattern

Prefer reusing existing `pa_cubes` sources when they already encode the correct date-aware population. Sources are shared across many indicators and collection jobs query each source once, so duplicate sources add cost and make definitions drift.

Good reusable ITSM sources in Simen's PDI:

- `Incidents.Open`: table `incident`, daily source for records open during the collection day.
- `RequestedItems.Open`: table `sc_req_item`, daily source for records open during the collection day.
- `Incidents.New`, `Incidents.Closed`, `Incidents.Resolved`
- `RequestedItems.New`, `RequestedItems.Closed`

Create a narrow automated indicator on an existing source by setting:

```javascript
var indicator = new GlideRecord('pa_indicators');
indicator.initialize();
indicator.setValue('name', 'FFI - High priority open incidents');
indicator.setValue('label', 'High priority open incidents');
indicator.setValue('type', '1'); // Automated
indicator.setValue('frequency', '10'); // Daily
indicator.setValue('direction', '2'); // Minimize
indicator.setValue('unit', '17b365e2d7320100ba986f14ce6103ad'); // #
indicator.setValue('aggregate', '1'); // Count
indicator.setValue('cube', '<pa_cubes sys_id>');
indicator.setValue('conditions', 'priorityIN1,2^EQ');
indicator.setValue('collect_records', true);
indicator.setValue('show_realtime_score', true);
indicator.setValue('scripted', false);
indicator.setValue('precision', '0');
var indicatorId = indicator.insert();
```

`conditions` on the indicator are applied in addition to the source filter. Keep broad, reusable date logic on the source and metric-specific filters on the indicator.

Use formula indicators when the value is derived from other indicators, for example `([[Indicator A]] / [[Indicator B]]) * 100`. Avoid scripts, GlideRecords, or GlideAggregates in indicator formulas; official guidance calls out the performance cost. Use manual indicators only when humans will enter scores in the scoresheet; manual indicators have no indicator source and are not populated by collection jobs.

## Indicator Widgets

For indicator-backed Platform Analytics widgets, `par_dashboard_widget.component_props` uses `sourceType: "indicator"` rather than `sourceType: "table"`:

```json
{
  "dataSources": [{
    "allowRealTime": false,
    "allowTotalValue": true,
    "indicatorType": "1",
    "isScriptedIndicator": false,
    "label": "PA high priority incident backlog",
    "sourceType": "indicator",
    "uuid": {"indicator": "<pa_indicators sys_id>", "breakdowns": []},
    "preferredVisualizations": ["d24d53f60350de7a652caf3188a46ed2"],
    "id": "<base64 id>",
    "dataCategories": ["trend", "group", "simple"]
  }],
  "metrics": [{
    "dataSource": "<same datasource id>",
    "id": "<base64 metric id>",
    "aggregateIndicator": "",
    "frequency": 10,
    "axisId": "primary",
    "numberFormat": {"customFormat": true, "decimalPrecision": 0}
  }],
  "scoreType": null,
  "period": "M",
  "enableRealTimeUpdate": false,
  "enableDrilldown": true,
  "filterConfigurations": [],
  "followFilters": false,
  "showFilterIcon": false
}
```

For single score indicator widgets, use macroponent `d24d53f60350de7a652caf3188a46ed2`. Existing single-score indicator widgets in the PDI commonly use blank `aggregateIndicator`, `frequency=10`, `scoreType=null`, and `period=M`.

Do not enable real-time mode on indicator widgets that specify `metrics[0].aggregateIndicator`. Platform Analytics rejects that combination with "Invalid configuration. Indicators with aggregate are not supported for realtime." Keep `dataSources[0].allowRealTime=false`, `enableRealTimeUpdate=false`, and the indicator's `show_realtime_score=false` unless the widget is configured without an aggregate indicator.

Do not leave score-only indicator widgets wired to `@state.parFilters` unless a known-good indicator widget does so successfully. Workspace dashboard filters that target task tables can cause indicator score widgets to show "There is no data for the selected criteria." Use `filterConfigurations=[]`, `followFilters=false`, and `showFilterIcon=false` for shared PA score widgets that should show collected score history independent of the agent's table filters.

Do not replace personalized work widgets with PA indicators unless that is the intent. Dynamic filters such as "Me" and "One of My Groups" work well for real-time table-backed widgets, but scheduled PA score collection runs in a job/user context and can turn a personalized indicator into a global/admin-centered score. For agent dashboards, a good pattern is:

- table-backed widgets for "my work" and group queues
- PA indicator widgets for shared backlog/trend insights

## Indicator Verification

After creating indicators and widgets, verify all three layers:

1. Indicator metadata:
   - `pa_indicators.name`
   - `type=Automated`
   - expected `cube`
   - expected `conditions`
   - `show_realtime_score=false` when the dashboard widget uses an aggregate indicator
   - `collect_records=true`
   - `sys_scope`/`sys_package` are the intended app
2. Dashboard wiring:
   - `par_dashboard_widget.canvas` is the tab canvas, not the base canvas
   - `component` is the intended macroponent
   - `component_props.dataSources[0].sourceType == "indicator"`
   - `component_props.dataSources[0].uuid.indicator` matches the indicator sys_id
3. Runtime sanity:
   - run a matching `GlideAggregate` against the facts table using the source semantics plus indicator conditions
   - run the relevant `sysauto_pa` data collection job or create a narrow on-demand job for the new indicators
   - verify rows in `pa_scores_l1` using `pa_indicators.id`, and verify `pa_snapshots` if `collect_records=true`
   - narrow-check `sys_update_xml` rows for `pa_indicators_<sys_id>` and `par_dashboard_widget_<sys_id>`

Example verification query for the FFI high-priority incident indicator:

```javascript
var ga = new GlideAggregate('incident');
ga.addEncodedQuery('opened_atONToday@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()^ORopened_at<javascript:gs.beginningOfToday()^resolved_atISEMPTY^ORresolved_at>javascript:gs.endOfToday()^state!=8^priorityIN1,2');
ga.addAggregate('COUNT');
ga.query();
if (ga.next()) gs.info(ga.getAggregate('COUNT'));
```

If the dashboard needs historical trends, create one on-demand historical `sysauto_pa` job for a bounded date range and relate the new indicators through `pa_job_indicators`. Do not run historical collection repeatedly for the same indicator/date range because it can delete and rebuild scores in the covered periods.

The UI's **Execute Now** action for `sysauto_pa` runs:

```javascript
current.update();
SncTriggerSynchronizer.executeNow(current);
```

For a demo dashboard, an idempotent on-demand collection job can be created as:

```javascript
var job = new GlideRecord('sysauto_pa');
job.initialize();
job.setValue('name', 'FFI Agent Dashboard Demo PA Collection');
job.setValue('active', true);
job.setValue('run_type', 'on_demand');
job.setValue('run_as', '6816f79cc0a8016401c5a33be04be441');
job.setValue('collect', 'scores_text');
job.setValue('score_operator', 'relative');
job.setValue('score_relative_start', '7');
job.setValue('score_relative_start_interval', 'days');
job.setValue('score_relative_end', '0');
job.setValue('score_relative_end_interval', 'days');
var jobId = job.insert();
```

Then create one `pa_job_indicators` row per indicator with `job=<jobId>`, `indicator=<pa_indicators sys_id>`, `active=true`, `collect=1`, `collect_indicator=true`, and execute the job. Confirm collection by checking `pa_scores_l1.indicator=<pa_indicators.id>`.

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

- Heading: `1f6e0643eca7a637e36bd7833549ec9e`
- Single score: `d24d53f60350de7a652caf3188a46ed2`
- List: `7ff373544303121093711347efb8f23c`
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

For PA List widgets, use the List macroponent and keep the same table-backed data source pattern, plus list-specific fields:

- `table`: target table such as `incident`
- `columns`: comma-separated field list
- `limit`: practical row count such as `10`
- `showLinks`: `true`
- `showViewAll`: `true`
- `allowListPagination`: `true`
- `showColumnSorting`: `true`

Generate unique but stable-looking IDs for `dataSources[0].id`, `metrics[0].id`, and `componentId`; base64 strings are accepted. Coerce Java strings before JavaScript regex replacement in Rhino:

```javascript
String(GlideStringUtil.base64Encode('table:sys_user:Active users')).replace(/=/g, '')
```

Avoid Java `String.replace(regex, value)` ambiguity by using `String(...)` around GlideStringUtil returns.

## ITIL Agent Dashboard Pattern

For fulfiller/ITIL agent dashboards, frame the dashboard around "What needs my attention now?" rather than a flat collection of lists. Keep personal action, group pickup work, SLA risk, urgent priority, and cleanup/waiting work visually distinct.

An attention-first 48-column layout works well:

- `y=0`: Heading across `w=48`, `h=3`
- `y=3`: six KPI counters, each `w=8`, `h=7`
- `y=10`: two primary action lists, each `w=24`, `h=16`
- `y=26`: two SLA/priority focus lists, each `w=24`, `h=16`
- `y=42`: two cleanup/waiting lists, each `w=24`, `h=16`
- `y=58`: two control lists, each `w=24`, `h=16`

Recommended KPI counters:

- score: my open incidents, table `incident`, filter `assigned_toDYNAMIC90d1921e5f510100a9ad2572f2b477fe^stateNOT IN6,7,8`
- score: my request work, table `task`, filter `sys_class_nameINsc_req_item,sc_task^assigned_toDYNAMIC90d1921e5f510100a9ad2572f2b477fe^active=true`
- score: my interactions, table `interaction`, filter `assigned_toDYNAMIC90d1921e5f510100a9ad2572f2b477fe^active=true`
- score: unassigned in my groups, table `task`, filter `assignment_groupDYNAMICd6435e965f510100a9ad2572f2b47744^assigned_toISEMPTY^active=true^sys_class_nameINincident,sc_req_item,sc_task,interaction`
- score: breaching soon, table `task_sla`, filter `stageINin_progress,paused^planned_end_timeRELATIVELE@hour@ahead@4`
- score: P1/P2 active, table `task`, filter `priorityIN1,2^active=true^sys_class_nameINincident,sc_req_item,sc_task,interaction`

Recommended attention lists:

- list: my assigned work, table `task`, filter `assigned_toDYNAMIC90d1921e5f510100a9ad2572f2b477fe^active=true^sys_class_nameINincident,sc_req_item,sc_task,interaction^ORDERBYDESCpriority^ORDERBYsys_updated_on`
- list: my group's unassigned work, table `task`, filter `assignment_groupDYNAMICd6435e965f510100a9ad2572f2b47744^assigned_toISEMPTY^active=true^sys_class_nameINincident,sc_req_item,sc_task,interaction^ORDERBYDESCpriority^ORDERBYopened_at`
- list: SLA breaching soon, table `task_sla`, filter `stageINin_progress,paused^planned_end_timeRELATIVELE@hour@ahead@4^ORDERBYplanned_end_time`
- list: high priority active records, table `task`, filter `priorityIN1,2^active=true^sys_class_nameINincident,sc_req_item,sc_task,interaction^ORDERBYpriority^ORDERBYsys_updated_on`
- list: stale work, table `task`, filter `assigned_toDYNAMIC90d1921e5f510100a9ad2572f2b477fe^active=true^sys_class_nameINincident,sc_req_item,sc_task,interaction^sys_updated_onRELATIVELE@dayofweek@ago@2^ORDERBYsys_updated_on`
- list: waiting/on hold, table `task`, filter `assigned_toDYNAMIC90d1921e5f510100a9ad2572f2b477fe^active=true^stateIN3,4,-5^sys_class_nameINincident,sc_req_item,sc_task,interaction^ORDERBYsys_updated_on`
- list: recently updated by me, table `task`, filter `sys_updated_by=admin^sys_updated_onRELATIVEGE@dayofweek@ago@7^sys_class_nameINincident,sc_req_item,sc_task,interaction^ORDERBYDESCsys_updated_on`
- list: reopened incidents, table `incident`, filter `reopen_count>0^active=true^ORDERBYDESCreopen_count^ORDERBYsys_updated_on`

Useful generic task columns: `number,sys_class_name,priority,state,short_description,assigned_to,assignment_group,sys_updated_on`.

Known dynamic filter IDs:

- Me: `90d1921e5f510100a9ad2572f2b477fe`
- One of My Groups: `d6435e965f510100a9ad2572f2b47744`

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
- For existing workspace dashboards, do not require widget count to be zero before proceeding. Repurpose known starter widgets by `sys_id`, then upsert new named widgets so reruns converge.
- Table shape helpers may report `create_access=false` on some `par_` tables, but admin/Xplore can still insert the builder-owned records. Keep writes narrow and verify capture immediately.
- `required_translations` can be minimal JSON messages for the title and empty state; `sys_translated` rows are not always necessary for created widgets.
- Workspace page registry path, UX app route path, and PA dashboard deep-link URLs can be non-obvious or unavailable from guessed URLs. Do not treat a browser 404 on a guessed `/now/<path>` route as dashboard failure; verify the PA records and widget data source queries first, then use known navigation if a visual check is required.
- Generated workspace update sets can already contain global AI Search rows and lots of UX scaffold rows. Report this as pre-existing mixed-scope workspace generation noise when dashboard-specific rows are captured in the intended app.

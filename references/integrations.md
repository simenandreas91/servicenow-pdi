# ServiceNow Integration Playbook

Load this file when creating, reviewing, or testing integrations from ServiceNow to external systems such as SAP SuccessFactors, HR platforms, public REST APIs, or other ServiceNow instances.

## PDI Baseline

- Profile: `pdi`.
- Xplore is installed on the PDI and should be used for small server-side verification snippets.
- Direct outbound REST from the PDI works. Verified with `sn_ws.RESTMessageV2()` against `https://jsonplaceholder.typicode.com/users/1`; the instance returned HTTP `200` and parsed user `Leanne Graham`.
- Outbound HTTP logging works. Verified log table: `sys_outbound_http_log`, with a JSONPlaceholder row showing `method=GET`, `response_status=200`, and `response_time`.
- The admin user can create and write `sys_rest_message`, `sys_rest_message_fn`, `sys_rest_message_headers`, `sys_rest_message_fn_headers`, `sys_rest_message_fn_param_defs`, `sys_alias`, `sys_connection`, `sys_auth_profile_basic`, and `sys_atf_test`.
- REST API Explorer is available in the PDI at `/$restapi.do`. Verified 2026-05-22 through the `System Web Services` module and a read-only Table API `GET` against `incident`; the Explorer returned `200 OK` and exposes namespaces, APIs, versions, methods, parameters, code samples, response detail, and OpenAPI export for inbound ServiceNow REST discovery.
- Postman MCP access is available for the personal `ServiceNow integration` workspace. Verified 2026-05-22; its `ServiceNow` collection is the preferred shared client-side home for repeatable integration requests when requests, examples, environments, or exported OpenAPI definitions should outlive an ad hoc probe.
- Scripted REST API practice endpoint created in Global scope on 2026-06-17:
  - Update set: `PDI - Scripted REST API practice`, sys_id `5c7cb795c3254f5465eefdec050131dd`.
  - API: `PDI Practice Scripted REST`, sys_id `578cf795c3254f5465eefdec050131fc`, base path `/api/1122545/pdi_practice`.
  - Version: `v1`, sys_id `f69cfb95c3254f5465eefdec050131a9`.
  - Resource: authenticated `GET /ping`, sys_id `aeacbf95c3254f5465eefdec05013179`, operation URI `/api/1122545/v1/pdi_practice/ping`.
  - External REST client evidence: Basic-auth PowerShell `Invoke-WebRequest` returned `200` with JSON; no auth returned `401`; `Accept: text/plain` returned `406`.
- Scripted REST API POST practice resource added on 2026-06-17:
  - Update set: `PDI - Scripted REST API POST practice`, sys_id `3bff375dc3254f5465eefdec05013173`.
  - Resource: authenticated `POST /echo`, sys_id `ba10046dc3254f5465eefdec050131ea`, operation URI `/api/1122545/v1/pdi_practice/echo`.
  - External REST client evidence: JSON POST with `message` returned `201`; missing `message` returned `400`; no auth returned `401`; `Accept: text/plain` returned `406`.
- OAuth bearer POST practice validated on 2026-06-17:
  - A temporary confidential OAuth client requested a token from `/oauth_token.do` with form-encoded `grant_type=password`, `client_id`, `client_secret`, `username`, and `password`.
  - The token response returned `200`, token type `Bearer`, and a 599 second access-token lifetime.
  - `POST /api/1122545/v1/pdi_practice/echo` with `Authorization: Bearer <token>` returned `201` and echoed the JSON payload.
  - Cleanup: temporary public/confidential OAuth clients were deleted, generated token rows were removed, and update set `PDI - OAuth POST practice` (`867b4865c3654f5465eefdec050131b2`) was left empty.
- Practice integration created in Global scope:
  - Story: `STRY0010006`, `Practice outbound REST integration with public APIs`.
  - Update set: `CODX - Public API practice integration`.
  - REST Message: `Codex Public API Practice`, sys_id `ce9afdefc3608bd06b68770d05013157`.
  - Script Include: `global.CodexPublicApiPractice`, sys_id `429afdefc3608bd06b68770d050131a5`.
  - Methods: `get jsonplaceholder user`, `post httpbin anything`, `get reqres user requires key`.
  - Test evidence: JSONPlaceholder GET returned `200`, httpbin POST returned `200`, and ReqRes without `x-api-key` returned `401` with `missing_api_key`.
- On the remote Vår Energi DEV profile `varenergi_dev`, use MCP for narrow reads/writes and a separately verified local helper profile only for genuine gaps such as compact server-side verification. Never reuse a DEV profile with a host override for another environment.

## Choosing the Pattern

Prefer this order:

1. For SAP SuccessFactors, use the official ServiceNow SuccessFactors Spoke if licensing and installability allow it. It already provides connection aliases, sample flows/subflows/actions, staging tables, transform maps, webhooks, and reusable record/entity operations.
2. Use a REST Message record plus a Script Include wrapper for custom outbound REST integrations, especially when the spoke is unavailable or the use case is narrower than a full spoke implementation.
3. Use recordless `new sn_ws.RESTMessageV2()` only for quick discovery, one-off verification, or when deliberately avoiding persistent config.
4. Use IntegrationHub REST steps and connection aliases when the team needs Flow Designer ownership, richer no-code operations, configured retry policy, custom auth algorithms, AWS Signature v4, multipart attachment handling, or other REST step capabilities that `RESTMessageV2` does not support.
5. Use a MID Server only when the target API is private, allowlisted by network path, or reachable only from a customer network. Direct instance calls are simpler for public SaaS APIs.
6. For inbound calls into ServiceNow, prefer a Scripted REST API over exposing broad Table API access when the payload spans multiple tables, needs validation, or should return a controlled contract.

For SAP SuccessFactors specifically, start from its OData API contract and authentication mode. Current SAP docs state that SuccessFactors supports OAuth 2.0 for API users and recommend moving away from less secure authentication methods. Model the ServiceNow side around OAuth credentials/profiles or an IntegrationHub connection where possible, not hardcoded basic credentials in script.

## Integration Test Method

Use the tool that proves the layer under test. Do not treat one successful request as proof that every integration layer works.

| Tool | Best use | Not enough by itself |
| --- | --- | --- |
| ServiceNow Table API helpers | Inspect ServiceNow records, metadata, credentials/config references, target state, logs, imports, update capture, and narrow disposable setup data. | Proving an external caller can use an inbound contract or that ServiceNow can reach a vendor endpoint. |
| REST API Explorer | Discover ServiceNow inbound APIs actually exposed in the current instance, select API/version/method/parameters, send first bounded requests, inspect request/response details, and export OpenAPI. | Repeatable external-client coverage, vendor API coverage, or outbound transport from the ServiceNow runtime. |
| Postman | Keep canonical client requests, environments, examples, negative cases, imported OpenAPI, external-caller tests for inbound ServiceNow APIs, and vendor sandbox tests before ServiceNow outbound configuration exists. | Proving ServiceNow TLS, MID/proxy, credential alias, REST Message, Flow, logging, retries, mapping, or persistence works. |

### Recommended Test Order

1. Start with the contract.
   - Capture endpoint family, auth mode, request and response schema, identifiers, pagination/delta semantics, rate limits, error semantics, and data classification.
   - Keep sanitized payload examples and a correlation strategy. Never move HR secrets, bearer tokens, certificate material, or sensitive employee payloads into skill docs, scripts, update sets, or Postman variables that are not secret-scoped.

2. For inbound calls into ServiceNow:
   - Prefer a Scripted REST API when validation, orchestration, multiple tables, stable error semantics, or a controlled contract matter. Use Table API only when broad record CRUD is truly the intended contract and ACL/web-service exposure is acceptable.
   - Use REST API Explorer first to prove the ServiceNow API surface, version, method, parameters, bounded read behavior, and OpenAPI export. Default the first request to `GET` and use a disposable target for writes.
   - Move the request into Postman for repeatable service-consumer tests: auth mode, headers, valid payload, invalid payload, duplicate/idempotent call, missing field, unauthorized caller, and expected error body.
   - Use Table API helpers after each inbound test to verify ServiceNow side effects, ACL-visible target state, staging/import rows, events/logs, and update-set artifacts. REST API Explorer and Postman prove the request contract; Table API proves what the platform changed.
   - Add ATF inbound REST steps or other repeatable platform tests when the API contract can be tested without unstable external dependencies.

3. For outbound calls from ServiceNow:
   - Use Postman against the vendor sandbox or a controlled mock first when the vendor contract is still being learned. This isolates vendor URL, auth, query/body shape, response examples, and error handling from ServiceNow configuration.
   - Then test from the ServiceNow runtime. Start with a recordless read-only `RESTMessageV2` Xplore probe when safe, then test the chosen REST Message, IntegrationHub action/spoke, Flow, or Script Include wrapper.
   - Use Table API helpers to inspect REST Message records, aliases/auth profile references without exposing secrets, target tables, staging/import state, update capture, and `sys_outbound_http_log`.
   - Compare Postman and ServiceNow requests field by field when one succeeds and the other fails. Focus on hostname, OAuth audience/scope, certificates, headers, URL encoding, redirect behavior, MID/proxy path, IP allowlisting, timeout, and response parsing.

4. For handoff:
   - Keep long-lived external-client requests in the Postman `ServiceNow integration` workspace when access is available.
   - Keep ServiceNow implementation and runtime proof in the instance: scoped artifacts, update sets, ATF where useful, HTTP logs, import/transform evidence, and concise story notes.
   - Report the layer proven by each test. Example: "Postman vendor sandbox GET 200", "ServiceNow recordless REST GET 200", "REST Message wrapper mapped one sanitized response", and "Table API verified target row/update capture".

### Inbound Scripted REST API Workflow

Use this path when a consumer needs a controlled ServiceNow endpoint instead of broad Table API access. Good reasons include multi-table orchestration, custom validation, stable error bodies, idempotency logic, import-set staging, or a contract that should stay stable while internal tables change.

1. Research and decide the contract first.
   - Define method, path, version, auth mode, request body, query parameters, response body, status codes, idempotency key, pagination, and error shape.
   - Follow REST method conventions: `GET` reads only, `POST` creates, `PUT` or `PATCH` updates, and `DELETE` removes.
   - Version published APIs. Avoid breaking existing clients in an active version; introduce a new version for significant behavior changes.

2. Prepare update-set context.
   - Run PDI health, choose the owning application, snapshot preferences, and create one update set in that scope.
   - For Global practice APIs, use `Set-ServiceNowUpdateSetContext.ps1 -Scope global`.

3. Create records in this order.
   - `sys_ws_definition`: parent API. Required fields include `name` and `service_id`; set `consumes` and `produces` deliberately, usually `application/json`.
   - `sys_ws_version`: version row. This PDI requires a version before inserting operations; use `version=1`, `version_id=v1`, and `is_default=true` for a first version.
   - `sys_ws_operation`: resource. Required fields include `web_service_definition`, `web_service_version`, `name`, `http_method`, and `operation_script`; set `relative_path`, authentication, ACL behavior, supported content types, and short documentation.
   - Optional documentation/config: `sys_ws_query_parameter`, `sys_ws_header`, REST endpoint ACLs, inbound rate limits, CORS rules, and ATF REST tests.

4. Script the resource defensively.
   - Use `response.setStatus()` and `response.setBody()` for normal JSON responses; use `response.setError(new sn_ws_err.BadRequestError(...))` for common client errors.
   - Use `GlideRecordSecure` when returning or mutating user-visible table data. Plain `GlideRecord` is only acceptable when the endpoint has its own explicit authorization model.
   - Validate required fields, reject malformed payloads early, return compact errors, and never log secrets or sensitive payloads.
   - For non-JSON/XML request bodies, read only `request.body.dataStream`; other request body accessors can produce a 500 response.

5. Test with an external REST client.
   - First use REST API Explorer for bounded discovery when helpful, then keep durable tests in Postman when available.
   - A PowerShell or curl client is sufficient for an ad hoc proof. Test success plus negative cases: no auth, wrong role or ACL if possible, unsupported `Accept`, invalid body, duplicate/idempotent request, and missing required field.
   - Basic external smoke test pattern:

```powershell
$basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$user`:$pass"))
Invoke-WebRequest `
  -Uri 'https://dev396302.service-now.com/api/<namespace>/v1/<api_id>/<resource>?name=Test' `
  -Headers @{ Authorization = "Basic $basic"; Accept = 'application/json' } `
  -Method GET
```

   - Basic POST smoke test pattern:

```powershell
$payload = @{ message = 'Hello from external POST test'; external_id = 'post-test-001' } | ConvertTo-Json -Compress
Invoke-WebRequest `
  -Uri 'https://dev396302.service-now.com/api/<namespace>/v1/<api_id>/<resource>' `
  -Headers @{
    Authorization = "Basic $basic"
    Accept = 'application/json'
    'Content-Type' = 'application/json'
  } `
  -Method POST `
  -Body $payload
```

6. Verify the ServiceNow side.
   - Query the Scripted REST rows by `sys_id`, then verify side effects through Table API: target records, staging rows, import-set run rows, events, logs, and update-set capture.
   - Run `Get-ServiceNowUpdateSetSummary.ps1` and confirm only expected `sys_ws_definition`, `sys_ws_version`, `sys_ws_operation`, ACL/header/query-parameter, and support records are captured.
   - Restore preferences before handoff.

### OAuth For Inbound REST Tests

Use OAuth for repeatable external-client tests when Basic Auth should not be sent on every API call. ServiceNow OAuth token requests must use `application/x-www-form-urlencoded`; `application/json` can fail with an unclear error.

- Best production pattern: use OAuth Inbound with REST API Auth Scopes and the client credentials or JWT bearer pattern for machine-to-machine clients, with an OAuth Application User that has the minimum roles needed. Use authorization code with PKCE for interactive/user-delegated clients.
- PDI-only smoke pattern: a short-lived confidential OAuth client using Resource Owner Password Credentials can prove bearer-token transport, but it still submits a username and password during token acquisition and should not be treated as the preferred production model.
- Do not store or print `client_secret`, access tokens, refresh tokens, or generated bearer tokens. Keep them in process memory, a secret store, or a secure client environment.
- Keep token lifetimes short for tests. Expire or revoke `oauth_credential` rows after the test, and delete or deactivate temporary OAuth clients.
- Do not ship OAuth client secrets in update sets. If a temporary OAuth client is created only to test transport, remove its `sys_update_xml` rows after cleanup.

Bearer POST smoke test pattern:

```powershell
$tokenForm = @{
  grant_type = 'password'
  client_id = $clientId
  client_secret = $clientSecret
  username = $user
  password = $pass
}
$token = Invoke-RestMethod `
  -Uri 'https://dev396302.service-now.com/oauth_token.do' `
  -Method POST `
  -ContentType 'application/x-www-form-urlencoded' `
  -Body $tokenForm

$payload = @{ message = 'Hello from OAuth bearer POST test' } | ConvertTo-Json -Compress
Invoke-WebRequest `
  -Uri 'https://dev396302.service-now.com/api/<namespace>/v1/<api_id>/<resource>' `
  -Headers @{
    Authorization = "Bearer $($token.access_token)"
    Accept = 'application/json'
    'Content-Type' = 'application/json'
  } `
  -Method POST `
  -Body $payload
```

Report only token metadata such as HTTP status, token type, and expiry seconds. Never report the token value.

### Import Sets And Transform Maps

Use import sets when inbound data should be staged, validated, transformed, and reconciled before it reaches production tables. The staging table is a temporary holding table, and transform maps copy data from staging to target tables according to field maps and scripts.

- Key records: `sys_data_source`, generated staging table (`sys_import_set_row` extension), `sys_import_set`, `sys_import_set_run`, `sys_import_set_row_error`, `sys_transform_map`, `sys_transform_entry`, and optional `sys_transform_script`.
- Do not manually add columns to an import set table as a normal workflow. Let load/test-load generate columns from the source data; manual columns can interfere with cleanup.
- Every normal production-table import needs at least one transform map. Coalesce on a stable unique external key when updates must be idempotent.
- For Import Set API ingestion, `POST /now/import/{stagingTableName}` inserts into the staging table and runs matching transform maps synchronously; `insertMultiple` is asynchronous by default unless configured otherwise.
- For CMDB imports, evaluate IRE/Service Graph Connector or robust import set transformers instead of relying only on simple transform-map coalesce.
- Verify imports through run counts, row states, row errors, target sys_ids, ignored rows, created vs updated counts, and a repeat import that proves duplicate prevention.

### SuccessFactors And Compendia Starting Point

- For SuccessFactors, decide file-based ingestion versus API-based ingestion before creating ServiceNow REST artifacts. If the API path is selected, use Postman for OData/OAuth contract discovery with the SAP sandbox, then test the ServiceNow Spoke/IntegrationHub or REST Message path from the instance, and use Table API/import evidence to verify staging, transform, HR Profile mapping, idempotency, and logs.
- For Compendia HR knowledge inbound to ServiceNow, obtain the standard API contract and content ownership rules first. Use Postman to preserve vendor request/response examples, use the ServiceNow runtime to prove the scheduled/inbound implementation path, and use Table API helpers to verify knowledge staging/target records, source identifiers, update behavior, and sanitized operational logs.

## SAP SuccessFactors Readiness

Review these before building:

- ServiceNow SuccessFactors Spoke docs. The spoke is built by Bristlecone and current docs list v4.10.0 as the latest Australia release. It requires an IntegrationHub subscription and several dependent plugins, including IntegrationHub Runtime, REST/SOAP action steps, Data Stream action template, XML Parser, Dynamic Inputs/Outputs, Complex Object, and Remote Tables.
- ServiceNow setup flow for SuccessFactors spoke v4.x.x:
  1. Register an OAuth client application in SuccessFactors.
  2. Generate a private key, public certificate, PKCS12 file, and JKS keystore.
  3. Upload the JKS certificate to ServiceNow.
  4. Register SuccessFactors as a ServiceNow OAuth provider using the generated API key.
  5. Create a SAML2 assertion producer and associate it with the OAuth entity profile.
  6. Create OAuth 2.0 credential records for OData and, if needed, SOAP.
  7. Create HTTP(s) connection records on the SuccessFactors connection aliases.
- SAP SuccessFactors OData V2 Authentication docs. SAP lists OIDC, OAuth 2.0, and Basic Authentication, but warns that Basic Auth is deprecated and should be replaced with OAuth/OIDC.
- SAP SuccessFactors API server list. Build URLs with hostnames, not IPs. Common patterns:
  - OData V2: `https://<api-server>/odata/v2/`
  - OData V4: `https://<api-server>/odatav4/`
  - REST: `https://<api-server>/rest/`
  - SFAPI SOAP: `https://<api-server>/sfapi/v1/soap`
  - OAuth token: `https://<SuccessFactors_Instance_Name>/oauth/token?company_id=<Company_ID>`
- SAP Business Accelerator Hub. Use it to inspect SuccessFactors API packages, entity examples, and sample payloads. SAP's "Explore SAP APIs in the Business Accelerator Hub" tutorial is a short beginner path for learning the hub and testing APIs with `curl`/`jq`.
- SAP SuccessFactors Integration Center docs. Useful for understanding what SuccessFactors admins can expose/export, Integration Catalog templates, Data Model Navigator, scheduled file outputs, and simple REST/SOAP outbound integrations. Note that SAP documents limitations around OData V4 support in Integration Center; use SAP Cloud Integration or Business Accelerator Hub packages when needed.

Ask the SAP/SuccessFactors team for these inputs up front:

- API server hostname and data center, for example `api17.sapsf.com`, and whether the tenant has migrated to a newer Next Generation Cloud Delivery host.
- Company ID.
- API family and version: OData V2, OData V4, REST, SFAPI SOAP, or a mix.
- Entity names and fields: for example `User`, `PerPerson`, `EmpEmployment`, `EmpJob`, `Department`, `Location`, `JobProfile`, `Todo`.
- Required `$select`, `$filter`, `$expand`, pagination, and delta/last-modified query approach.
- Authentication approach: OIDC, OAuth 2.0 SAML bearer, or temporary Basic Auth exception.
- OAuth client/API key, certificate/JKS requirements, assertion subject user, token URL, and token lifetime.
- IP restrictions or allowlisting requirements for both `/oauth/token` and OData calls.
- Rate limits, retry guidance, and expected error payload examples.
- Whether ServiceNow SuccessFactors Spoke is licensed, installed, or allowed for the project.
- Target ServiceNow tables, staging tables, transform maps, reconciliation keys, and which system is authoritative for each field.

## Build Workflow

1. Confirm the external API contract before touching ServiceNow.
   - Base URL and tenant or company identifier.
   - Auth type, token URL, scopes, certificate/SAML/OAuth requirements, and token lifetime.
   - Endpoint path, method, required headers, query parameters, pagination, filtering, rate limits, and sample success/error payloads.
   - Stable external IDs and how they map to ServiceNow records.

2. Create or identify the story and update set using `references/development.md`.
   - Integration artifacts are application files and must be captured in the intended scope/update set.
   - Resolve whether the integration belongs in Global, Employee Center, HR Integrations, or a custom app scope before creating records.
   - Set `apps.current_app` to the intended scope before creating REST Messages or Script Includes, then start a new transaction before inserting. In this PDI, records created while the user's current app was Employee Center landed in Employee Center even when the Xplore script itself ran globally.

3. Prototype the contract before persistent ServiceNow config.
   - For inbound ServiceNow APIs, use REST API Explorer for the first bounded request and Postman for the repeatable external-client request set.
   - For outbound vendor APIs, use Postman against a vendor sandbox or controlled mock to learn request/response semantics, then use Xplore on the PDI for a small recordless `GET` request to prove ServiceNow network, TLS, auth, and response shape.
   - Keep the first test non-mutating.
   - Use public APIs such as JSONPlaceholder for fake JSON resources and httpbin for echo/status/header behavior when no vendor sandbox is ready.

4. Create persistent outbound config.
   - Parent REST Message: `sys_rest_message`.
   - HTTP Method: `sys_rest_message_fn`.
   - Headers: `sys_rest_message_headers` or `sys_rest_message_fn_headers`.
   - Query variables: `sys_rest_message_fn_param_defs`.
   - Credentials: prefer OAuth/basic auth profile records or connection/credential aliases. Never put secrets in Script Includes, Business Rules, widget server scripts, or skill docs.
   - Use method-level auth overrides only when the method intentionally differs from the parent REST Message.

5. Wrap calls in a Script Include.
   - Keep transport, parsing, mapping, and persistence separated enough to test.
   - Use `new sn_ws.RESTMessageV2('<message name>', '<method name>')` for persistent config.
   - Set request variables with `setStringParameter()` or `setStringParameterNoEscape()` only for known variables.
   - Set `Accept: application/json`; set `Content-Type: application/json` for `POST`, `PUT`, and `PATCH`.
   - Set a finite `setHttpTimeout()` so business logic does not hang indefinitely.
   - Parse JSON inside `try/catch`, treat non-2xx status as an integration error, and return compact structured results.
   - Do not log secrets, bearer tokens, full credentials, or sensitive HR payloads.

6. Persist target data deliberately.
   - Resolve existing ServiceNow records by stable external keys before creating new records.
   - Make writes idempotent: repeated imports should update the same record, not create duplicates.
   - Store raw payloads only if there is a clear diagnostic need, and avoid storing sensitive HR data unnecessarily.
   - For scheduled imports, keep checkpoints such as `lastSuccessfulRun`, external cursor, or last modified timestamp in a property or integration state table.

7. Test at three levels.
   - Contract/transport test: Postman proves the external request contract where useful, and direct `RESTMessageV2` or the selected IntegrationHub/Spoke path proves ServiceNow runtime transport with expected status, headers, and minimal body shape.
   - Mapping test: Script Include converts a representative external payload into the intended ServiceNow fields without writing, or writes to a known disposable test record.
   - Persistence test: create/update behavior is idempotent and handles missing required fields, duplicates, empty pages, 401/403, 404, 429, and 5xx responses.

8. Verify update capture and operational visibility.
   - Query `sys_update_xml` for the REST Message, HTTP Methods, headers, Script Include, scheduled job, and any support tables.
   - Query `sys_outbound_http_log` for the target URL or REST Message test. Useful fields: `sys_created_on,url,method,response_status,response_time,request_body,response_body`.
   - Add story work notes with endpoint, test status, mapping result, and update set capture evidence. Do not include tokens or payloads containing personal data.
   - `GlideUpdateManager2().saveRecord(gr)` is blocked in scoped execution in this PDI. If update capture must be forced for scoped records, run the capture snippet globally and move the resulting `sys_update_xml` row into the intended update set.

## Xplore Probe Pattern

Use this for the first outbound check in the PDI:

```powershell
$script = @'
(function () {
  var result = { ok: false };
  try {
    var rm = new sn_ws.RESTMessageV2();
    rm.setHttpMethod('get');
    rm.setEndpoint('https://jsonplaceholder.typicode.com/users/1');
    rm.setRequestHeader('Accept', 'application/json');
    rm.setHttpTimeout(10000);

    var response = rm.execute();
    var body = response.getBody();
    var parsed = JSON.parse(body);

    result = {
      ok: response.getStatusCode() === 200,
      status: response.getStatusCode(),
      name: parsed.name,
      externalId: parsed.id
    };
  } catch (ex) {
    result = { ok: false, error: String(ex) };
  }
  gs.print('SN_RESULT_START' + JSON.stringify(result) + 'SN_RESULT_END');
})();
'@

& "$HOME/.codex/skills/servicenow-pdi/scripts/Invoke-ServiceNowXploreScript.ps1" `
  -Profile pdi `
  -Script $script
```

Then check the outbound log:

```powershell
& "$HOME/.codex/skills/servicenow-pdi/scripts/Invoke-ServiceNowTable.ps1" `
  -Profile pdi `
  -Table sys_outbound_http_log `
  -Query 'urlLIKEjsonplaceholder^ORDERBYDESCsys_created_on' `
  -Fields 'sys_id,sys_created_on,url,method,response_status,response_time' `
  -Limit 5 `
  -DisplayValue true `
  -ExcludeReferenceLink
```

## RESTMessageV2 Wrapper Shape

Use this shape inside a Script Include method after the REST Message and HTTP Method records exist:

```javascript
getUser: function (externalUserId) {
  var result = {
    ok: false,
    status: null,
    data: null,
    error: null
  };

  try {
    var rm = new sn_ws.RESTMessageV2('Example User API', 'get user');
    rm.setStringParameter('user_id', String(externalUserId));
    rm.setRequestHeader('Accept', 'application/json');
    rm.setHttpTimeout(10000);

    var response = rm.execute();
    result.status = response.getStatusCode();

    if (response.haveError()) {
      result.error = response.getErrorMessage();
      return result;
    }

    var body = response.getBody();
    if (result.status < 200 || result.status > 299) {
      result.error = 'Unexpected HTTP status ' + result.status;
      return result;
    }

    result.data = JSON.parse(body);
    result.ok = true;
    return result;
  } catch (ex) {
    result.error = String(ex);
    return result;
  }
}
```

## Table Notes

- `sys_rest_message`: REST Message parent. Mandatory `name`; important fields include `rest_endpoint`, `authentication_type`, `basic_auth_profile`, `oauth2_profile`, `sys_scope`.
- `sys_rest_message_fn`: HTTP Method. Mandatory `function_name` and `http_method`; important fields include `rest_message`, `rest_endpoint`, `content`, `authentication_type`, `basic_auth_profile`, `oauth2_profile`, `use_mid_server`.
- `sys_rest_message_headers`: parent REST Message headers.
- `sys_rest_message_fn_headers`: method-specific headers.
- `sys_rest_message_fn_param_defs`: method variables/query parameters.
- `sys_alias`: Connection & Credential Alias. Use when building IntegrationHub/Flow Designer ownership or environment-specific connection selection.
- `sys_connection` / `http_connection`: connection records for aliases. `sys_connection` requires `connection_alias` and `name`; `http_connection` is the HTTP(s) extension.
- `sys_auth_profile_basic`: basic auth profile. Mandatory `username` and `password`; do not print or export passwords.
- `sys_outbound_http_log`: outbound call diagnostics. Query by URL, created date, and response status after tests.
- `sys_ws_definition`: Scripted REST API parent. Mandatory `name` and `service_id`; important fields include `base_uri`, `namespace`, `consumes`, `produces`, `enforce_acl`, and `sys_scope`.
- `sys_ws_version`: Scripted REST API version. Important fields include `web_service_definition`, `version`, `version_id`, `is_default`, and `active`.
- `sys_ws_operation`: Scripted REST resource. Important fields include `web_service_definition`, `web_service_version`, `name`, `http_method`, `relative_path`, `operation_script`, `requires_authentication`, `requires_acl_authorization`, `requires_snc_internal_role`, `consumes`, and `produces`.
- `sys_ws_query_parameter` and `sys_ws_header`: optional Scripted REST documentation and request-contract records.
- `sys_data_source`: import source definition for file, JDBC, LDAP, IntegrationHub data stream, custom load, and other import paths.
- `sys_import_set`, `sys_import_set_run`, and `sys_import_set_row_error`: import batch, run, and row-level error evidence.
- `sys_transform_map`, `sys_transform_entry`, and `sys_transform_script`: transform map, field map, and transform script configuration.
- `sys_atf_test` and `sys_atf_step`: use for repeatable platform tests when the integration can be tested without external flakiness or when mocks are available.

## Free API Practice Targets

- JSONPlaceholder: `https://jsonplaceholder.typicode.com`. Good for fake JSON resources, GET/list/detail, and fake POST/PATCH/DELETE responses. No real persistence.
- httpbin: `https://httpbin.org`. Good for echoing headers/body, testing status codes, redirects, timeouts, and basic/bearer auth request shape.
- ReqRes: `https://reqres.in`. Current ReqRes docs require an `x-api-key` header for every request. Without a key, the expected practice result is `401 missing_api_key`, which is useful for testing auth-failure handling. Store any real key in a credential/auth profile or secure property, not in Script Includes.
- Use public APIs only for practice and transport checks. For business logic, use a vendor sandbox, mock server, or a deliberately controlled endpoint so tests are repeatable.

## Troubleshooting

- If ServiceNow succeeds but Postman fails, compare headers, auth profile, base URL, URL encoding, and request body exactly.
- If Postman succeeds but ServiceNow fails, check TLS/cert requirements, redirects, proxy/MID needs, IP allowlisting, auth profile scope, method-level auth overrides, and `sys_outbound_http_log`.
- For `401` or `403`, verify token audience/scopes, SuccessFactors API server host, company ID, user permissions, and whether the API user can access the OData entity.
- For `404`, verify tenant-specific base URL, path casing, OData entity name, and URL encoding.
- For `429`, add backoff and checkpointing; do not retry tight loops from business rules.
- For `5xx`, make the integration retryable and idempotent before enabling schedules.
- If response parsing fails, log only status, endpoint path, correlation ID, and a short sanitized sample. Do not log full HR payloads.

## Sources

- ServiceNow Docs, RESTMessageV2 API: https://www.servicenow.com/docs/r/api-reference/server-api-reference/c_RESTMessageV2API.html
- ServiceNow Docs, Outbound REST web service: https://www.servicenow.com/docs/r/api-reference/web-services/c_OutboundRESTWebService.html
- ServiceNowDocs, REST API Explorer overview: https://github.com/ServiceNow/ServiceNowDocs/blob/australia/markdown/api-reference/rest-api-explorer/c_RESTAPI.md
- ServiceNowDocs, Access the REST API Explorer: https://github.com/ServiceNow/ServiceNowDocs/blob/australia/markdown/api-reference/rest-api-explorer/t_GetStartedAccessExplorer.md
- ServiceNowDocs, Export REST API OpenAPI specification: https://github.com/ServiceNow/ServiceNowDocs/blob/australia/markdown/api-reference/rest-api-explorer/export-openapi-specification.md
- ServiceNow Docs, Create a scripted REST API: https://www.servicenow.com/docs/r/xanadu/api-reference/rest-api-explorer/t_CreateAScriptedRESTService.html
- ServiceNow Docs, Create a scripted REST API resource: https://www.servicenow.com/docs/r/xanadu/api-reference/rest-api-explorer/t_CreateAScriptedRESTAPIResource.html
- ServiceNow Docs, Scripted REST APIs good practices: https://www.servicenow.com/docs/r/xanadu/api-reference/rest-api-explorer/scripted-rest-good-practices.html
- ServiceNow Docs, Control request and response content type: https://www.servicenow.com/docs/r/xanadu/api-reference/rest-api-explorer/c_SpecifyContentType.html
- ServiceNow Docs, RESTAPIResponse API: https://www.servicenow.com/docs/r/xanadu/api-reference/server-api-reference/c_ScriptableServiceResponseBuilder.html
- ServiceNow Docs, OAuth inbound: https://www.servicenow.com/docs/r/platform-security/authentication/oauth-inbound.html
- ServiceNow Docs, Enable OAuth with inbound REST: https://www.servicenow.com/docs/r/yokohama/api-reference/rest-api-explorer/t_EnableOAuthWithREST.html
- ServiceNow Docs, OAuth API request parameters: https://www.servicenow.com/docs/r/platform-security/authentication/r_OAuthAPIRequestParameters.html
- ServiceNow Docs, REST OAuth example: https://www.servicenow.com/docs/r/xanadu/api-reference/rest-api-explorer/r_RESTOAuthExample.html
- ServiceNow Docs, Client Credentials: https://www.servicenow.com/docs/r/washingtondc/platform-security/authentication/client-credentials.html
- ServiceNow Docs, Create an OAuth JWT API endpoint for external clients: https://www.servicenow.com/docs/r/xanadu/platform-security/authentication/create-jwt-endpoint.html
- ServiceNow Docs, Import sets key concepts: https://www.servicenow.com/docs/r/xanadu/integrate-applications/system-import-sets/c_ImportSetsKeyConcepts.html
- ServiceNow Docs, Import Set API: https://www.servicenow.com/docs/r/xanadu/api-reference/rest-apis/c_ImportSetAPI.html
- ServiceNow Docs, Web service import set mode: https://www.servicenow.com/docs/r/xanadu/integrate-applications/system-import-sets/r_ImportSetMode.html
- ServiceNow Docs, Import sets properties: https://www.servicenow.com/docs/r/xanadu/integrate-applications/system-import-sets/r_ImportSetsProperties.html
- ServiceNow Docs, Create a REST message: https://www.servicenow.com/docs/r/api-reference/web-services/t_ConfiguringARESTMessage.html
- ServiceNow Docs, Define a REST message HTTP method: https://www.servicenow.com/docs/r/api-reference/web-services/t_DefineAnHTTPMethod.html
- ServiceNow Docs, Outbound REST authentication: https://www.servicenow.com/docs/r/api-reference/web-services/c_OutboundRESTAuth.html
- ServiceNow Docs, Testing REST message HTTP methods: https://www.servicenow.com/docs/r/api-reference/web-services/c_TestingMethods.html
- ServiceNow Docs, SuccessFactors Spoke: https://www.servicenow.com/docs/r/integrate-applications/integration-hub/successfactors-spoke.html
- ServiceNow Docs, Set up the SuccessFactors spoke v4.x.x: https://www.servicenow.com/docs/r/integrate-applications/integration-hub/setup-successfactors.html
- SAP Help Portal, SuccessFactors OData V2 Authentication: https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/authentication
- SAP Help Portal, List of SAP SuccessFactors API Servers: https://help.sap.com/docs/SAP_SUCCESSFACTORS_PLATFORM/d599f15995d348a1b45ba5603e2aba9b/af2b8d5437494b12be88fe374eba75b6.html
- SAP Help Portal, SuccessFactors OData V2 OAuth 2.0 authentication: https://help.sap.com/docs/successfactors-platform/sap-successfactors-api-reference-guide-odata-v2/authentication-using-oauth-2-0
- SAP Help Portal, Requesting an Access Token: https://help.sap.com/docs/SAP_SUCCESSFACTORS_PLATFORM/d599f15995d348a1b45ba5603e2f60c49d3992.html
- SAP Tutorials, Explore SAP APIs in the Business Accelerator Hub: https://developers.sap.com/group.api-hub-1.html
- SAP Help Portal, Using the Integration Center: https://help.sap.com/doc/0c0be9005af14c4f89b986a677bf270f/latest/en-US/SF_Integration_Center.pdf
- JSONPlaceholder: https://jsonplaceholder.typicode.com/
- httpbin: https://httpbin.org/

# ServiceNow Integration Playbook

Load this file when creating, reviewing, or testing integrations from ServiceNow to external systems such as SAP SuccessFactors, HR platforms, public REST APIs, or other ServiceNow instances.

## PDI Baseline

- Profile: `pdi`.
- Xplore is installed on the PDI and should be used for small server-side verification snippets.
- Direct outbound REST from the PDI works. Verified with `sn_ws.RESTMessageV2()` against `https://jsonplaceholder.typicode.com/users/1`; the instance returned HTTP `200` and parsed user `Leanne Graham`.
- Outbound HTTP logging works. Verified log table: `sys_outbound_http_log`, with a JSONPlaceholder row showing `method=GET`, `response_status=200`, and `response_time`.
- The admin user can create and write `sys_rest_message`, `sys_rest_message_fn`, `sys_rest_message_headers`, `sys_rest_message_fn_headers`, `sys_rest_message_fn_param_defs`, `sys_alias`, `sys_connection`, `sys_auth_profile_basic`, and `sys_atf_test`.
- Practice integration created in Global scope:
  - Story: `STRY0010006`, `Practice outbound REST integration with public APIs`.
  - Update set: `CODX - Public API practice integration`.
  - REST Message: `Codex Public API Practice`, sys_id `ce9afdefc3608bd06b68770d05013157`.
  - Script Include: `global.CodexPublicApiPractice`, sys_id `429afdefc3608bd06b68770d050131a5`.
  - Methods: `get jsonplaceholder user`, `post httpbin anything`, `get reqres user requires key`.
  - Test evidence: JSONPlaceholder GET returned `200`, httpbin POST returned `200`, and ReqRes without `x-api-key` returned `401` with `missing_api_key`.
- On the Vår Energi `other` profile, Table API works but Xplore is not installed or not accessible, so use Table API reads and avoid server-side snippets unless Scripts - Background is available.

## Choosing the Pattern

Prefer this order:

1. For SAP SuccessFactors, use the official ServiceNow SuccessFactors Spoke if licensing and installability allow it. It already provides connection aliases, sample flows/subflows/actions, staging tables, transform maps, webhooks, and reusable record/entity operations.
2. Use a REST Message record plus a Script Include wrapper for custom outbound REST integrations, especially when the spoke is unavailable or the use case is narrower than a full spoke implementation.
3. Use recordless `new sn_ws.RESTMessageV2()` only for quick discovery, one-off verification, or when deliberately avoiding persistent config.
4. Use IntegrationHub REST steps and connection aliases when the team needs Flow Designer ownership, richer no-code operations, configured retry policy, custom auth algorithms, AWS Signature v4, multipart attachment handling, or other REST step capabilities that `RESTMessageV2` does not support.
5. Use a MID Server only when the target API is private, allowlisted by network path, or reachable only from a customer network. Direct instance calls are simpler for public SaaS APIs.
6. For inbound calls into ServiceNow, prefer a Scripted REST API over exposing broad Table API access when the payload spans multiple tables, needs validation, or should return a controlled contract.

For SAP SuccessFactors specifically, start from its OData API contract and authentication mode. Current SAP docs state that SuccessFactors supports OAuth 2.0 for API users and recommend moving away from less secure authentication methods. Model the ServiceNow side around OAuth credentials/profiles or an IntegrationHub connection where possible, not hardcoded basic credentials in script.

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

3. Prototype with a recordless read-only call.
   - Use Xplore on the PDI for a small `GET` request to prove network, TLS, auth, and response shape.
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
   - Transport test: direct `RESTMessageV2` call returns expected status, headers, and minimal body shape.
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
  gs.print('CODEX_RESULT_START' + JSON.stringify(result) + 'CODEX_RESULT_END');
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

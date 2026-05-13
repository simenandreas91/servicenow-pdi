# Integration and Import Lessons

- For SAP SuccessFactors, check whether the ServiceNow SuccessFactors Spoke is licensed and available before designing a custom REST integration. It provides connection aliases, sample flows/subflows/actions, staging tables, transform maps, and webhook processing.
- SAP SuccessFactors Basic Auth is deprecated. Prefer OAuth/OIDC designs, usually OAuth 2.0 with SAML bearer and certificate/JKS setup when using the spoke pattern.
- Confirm SuccessFactors API server, Company ID, API family/version, entity model, permissions, IP restrictions, delta strategy, and pagination strategy before building ServiceNow records.
- Integration Center and Data Model Navigator on the SAP side are useful discovery tools for fields, relationships, and simple exports. Some OData V4 scenarios need SAP Cloud Integration or Business Accelerator Hub packages instead.
- For Norwegian postcode/place validation, use Posten/Bring's official free postcode register before third-party APIs: `https://www.bring.no/postnummerregister-ansi.txt`. Layout is tab-separated ANSI with `postnummer`, `poststed`, `kommunekode`, `kommunenavn`, and `kategori`.
- Convert the Bring register from Windows-1252/ANSI to UTF-8 before upload. A direct `RESTMessageV2` fetch from the PDI can return replacement characters for `Æ`, `Ø`, and `Å`; uploading a UTF-8 attachment and parsing with `GlideTextReader` preserved values.
- Avoid one Table API write per postcode row for full-register imports. Uploading the TSV as a story attachment and running a bounded Xplore import completed quickly for the 5,122-row Bring file.
- For Unit4-style validation, store at least `u_postal_code`, `u_city`, and `u_normalized_city`. Keeping `u_municipality_code`, `u_municipality_name`, `u_category`, `u_source`, `u_active`, and `u_last_imported` improves diagnostics without storing sensitive user data.

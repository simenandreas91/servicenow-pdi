param(
  [Parameter(Mandatory = $true)]
  [string]$Table,

  [switch]$IncludeChoices,
  [switch]$IncludeAclSummary,
  [string]$CachePath,
  [int]$CacheTtlMinutes = 60,
  [switch]$Refresh,
  [switch]$NoCache,
  [string]$Profile,
  [string]$EnvPath,
  [string]$Instance
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_ServiceNowToolkitCommon.ps1')

$tableResponse = Invoke-ServiceNowToolkitTable `
  -Table 'sys_db_object' `
  -Query "name=$Table" `
  -Fields 'sys_id,name,label,super_class,sys_scope,is_extendable,access,create_access,read_access,write_access,delete_access' `
  -Limit 1 `
  -DisplayValue all `
  -ExcludeReferenceLink `
  -Profile $Profile `
  -EnvPath $EnvPath `
  -Instance $Instance `
  -CachePath $CachePath `
  -CacheTtlMinutes $CacheTtlMinutes `
  -Refresh:$Refresh `
  -NoCache:$NoCache

$dictionaryResponse = Invoke-ServiceNowToolkitTable `
  -Table 'sys_dictionary' `
  -Query "name=$Table^elementISNOTEMPTY^ORDERBYelement" `
  -Fields 'sys_id,element,column_label,internal_type,mandatory,reference,choice,default_value,max_length,attributes,read_only,active,sys_scope' `
  -Limit 500 `
  -DisplayValue all `
  -ExcludeReferenceLink `
  -Profile $Profile `
  -EnvPath $EnvPath `
  -Instance $Instance `
  -CachePath $CachePath `
  -CacheTtlMinutes $CacheTtlMinutes `
  -Refresh:$Refresh `
  -NoCache:$NoCache

$fields = @($dictionaryResponse.result | ForEach-Object { Convert-ServiceNowToolkitRow -Row $_ })

$choices = @()
if ($IncludeChoices) {
  $choiceResponse = Invoke-ServiceNowToolkitTable `
    -Table 'sys_choice' `
    -Query "name=$Table^inactive=false^ORDERBYelement^ORDERBYsequence" `
    -Fields 'sys_id,element,label,value,sequence,language' `
    -Limit 1000 `
    -DisplayValue false `
    -ExcludeReferenceLink `
    -Profile $Profile `
    -EnvPath $EnvPath `
    -Instance $Instance `
    -CachePath $CachePath `
    -CacheTtlMinutes $CacheTtlMinutes `
    -Refresh:$Refresh `
    -NoCache:$NoCache
  $choices = @($choiceResponse.result | ForEach-Object { Convert-ServiceNowToolkitRow -Row $_ })
}

$aclSummary = @()
if ($IncludeAclSummary) {
  $aclResponse = Invoke-ServiceNowToolkitTable `
    -Table 'sys_security_acl' `
    -Query "nameSTARTSWITH$Table^ORDERBYoperation" `
    -Fields 'sys_id,name,operation,type,active,admin_overrides,condition,script' `
    -Limit 500 `
    -DisplayValue all `
    -ExcludeReferenceLink `
    -Profile $Profile `
    -EnvPath $EnvPath `
    -Instance $Instance `
    -CachePath $CachePath `
    -CacheTtlMinutes $CacheTtlMinutes `
    -Refresh:$Refresh `
    -NoCache:$NoCache
  $aclSummary = @($aclResponse.result | ForEach-Object {
      $row = Convert-ServiceNowToolkitRow -Row $_
      [pscustomobject]@{
        sys_id = $row.sys_id
        name = $row.name
        operation = $row.operation
        type = $row.type
        active = $row.active
        admin_overrides = $row.admin_overrides
        has_condition = -not [string]::IsNullOrWhiteSpace($row.condition)
        has_script = -not [string]::IsNullOrWhiteSpace($row.script)
      }
    })
}

[ordered]@{
  generated_at = (Get-Date).ToString('o')
  table = if (@($tableResponse.result).Count -gt 0) { Convert-ServiceNowToolkitRow -Row $tableResponse.result[0] } else { $null }
  field_count = $fields.Count
  fields = $fields
  choices = $choices
  acl_summary = $aclSummary
} | ConvertTo-Json -Depth 20

<#
.SYNOPSIS
  Bulk update TestRail custom fields per case (update_case only, never updateCases).
.EXAMPLE
  .\tr-update-fields.ps1 -ProjectId 3 -SuiteId 282 -SectionIds 32209 -FieldsJson '{"custom_case_squadname":9,"custom_case_feature_component":5}' -DryRun
  .\tr-update-fields.ps1 -CaseIds 386217,386218 -FieldsJson '{"custom_case_squadname":9}'
#>
[CmdletBinding()]
param(
    [int]$ProjectId = 0,
    [int]$SuiteId = 0,
    [int[]]$SectionIds = @(),
    [int[]]$CaseIds = @(),
    [Parameter(Mandatory)][string]$FieldsJson,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\TestRailApi.ps1"

$parsed = $FieldsJson | ConvertFrom-Json
$fields = @{}
foreach ($prop in $parsed.PSObject.Properties) {
    $fields[$prop.Name] = $prop.Value
}
if ($fields.Count -eq 0) {
    throw 'FieldsJson must contain at least one field.'
}

$targets = @()

if ($CaseIds.Count -gt 0) {
    $targets = @($CaseIds)
}
elseif ($ProjectId -gt 0 -and $SuiteId -gt 0) {
    $sections = Get-TestRailAllSections -ProjectId $ProjectId -SuiteId $SuiteId
    if ($SectionIds.Count -gt 0) {
        $tree = Get-TestRailSectionTreeIds -Sections $sections -RootSectionIds $SectionIds
        $treeIds = $tree.Ids
        $all = Get-TestRailAllCases -ProjectId $ProjectId -SuiteId $SuiteId
        $targets = @($all | Where-Object { $treeIds.Contains([int]$_.section_id) } | ForEach-Object { [int]$_.id })
    }
    else {
        throw 'Provide -CaseIds or -SectionIds with -ProjectId/-SuiteId.'
    }
}
else {
    throw 'Provide -CaseIds or -ProjectId/-SuiteId/-SectionIds.'
}

Write-Host "Target cases: $($targets.Count)"
Write-Host "Fields: $($fields.Keys -join ', ')"
if ($DryRun) {
    Write-Host 'Dry run. No changes written.'
    exit 0
}

$ok = 0
$fail = 0
$i = 0

foreach ($caseId in $targets) {
    $i++
    try {
        Update-TestRailCaseFields -CaseId $caseId -Fields $fields | Out-Null
        $ok++
    }
    catch {
        $fail++
        Write-Warning "C$caseId : $($_.Exception.Message)"
    }
    if ($i % 10 -eq 0 -or $i -eq $targets.Count) {
        Write-Host "  progress $i / $($targets.Count)"
    }
}

Write-Host "Done. ok=$ok fail=$fail"
if ($fail -gt 0) { exit 1 }

<#
.SYNOPSIS
  Add or replace cases on a TestRail plan entry (REST update_plan_entry).
.EXAMPLE
  .\tr-update-plan-entry.ps1 -PlanId 849 -EntryId 6960a51f-39d9-42b9-8c01-d93c09d3032e -SuiteId 282 -CaseIds 386293
  .\tr-update-plan-entry.ps1 -PlanId 849 -EntryId 6960a51f-39d9-42b9-8c01-d93c09d3032e -SuiteId 282 -CaseIds 386293 -NoMerge
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][int]$PlanId,
    [Parameter(Mandatory)][string]$EntryId,
    [Parameter(Mandatory)][int]$SuiteId,
    [Parameter(Mandatory)][int[]]$CaseIds,
    [switch]$NoMerge,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\TestRailApi.ps1"

$mergeArgs = @{}
if ($NoMerge) { $mergeArgs.NoMerge = $true }

if ($DryRun) {
    Write-Host "Would update plan $PlanId entry $EntryId suite $SuiteId cases: $($CaseIds -join ', ')"
    exit 0
}

$result = Update-TestRailPlanEntryCases -PlanId $PlanId -EntryId $EntryId -SuiteId $SuiteId -CaseIds $CaseIds @mergeArgs
$runId = if ($result.runs -and $result.runs.Count -gt 0) { $result.runs[0].id } else { '(unknown)' }
Write-Host "Plan entry updated. Run id: $runId"
Write-Host "New case ids submitted: $($CaseIds.Count) (merge=$([bool](-not $NoMerge)))"
if ($runId -ne '(unknown)') {
    $tests = @()
    $offset = 0
    do {
        $page = Invoke-TestRailApi -Path "get_tests/$runId&limit=250&offset=$offset"
        if ($page.tests) { $tests += @($page.tests) }
        $offset += 250
    } while ($page._links.next)
    Write-Host "Run tests after update: $($tests.Count) (verify via get_tests)"
}

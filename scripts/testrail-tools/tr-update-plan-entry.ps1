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
Write-Host "Case count: $($CaseIds.Count) (merge=$([bool](-not $NoMerge)))"

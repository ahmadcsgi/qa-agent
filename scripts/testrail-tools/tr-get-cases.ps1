<#
.SYNOPSIS
  Paginated TestRail case export (JSON or CSV).
.EXAMPLE
  .\tr-get-cases.ps1 -ProjectId 3 -SuiteId 282 -OutFile cases.json -Json
  .\tr-get-cases.ps1 -ProjectId 3 -SuiteId 282 -SectionIds 47436 -OutFile cases.csv
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][int]$ProjectId,
    [Parameter(Mandatory)][int]$SuiteId,
    [int[]]$SectionIds = @(),
    [string]$OutFile = '',
    [switch]$Json
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\TestRailApi.ps1"

if ($SectionIds.Count -gt 0) {
    $cases = @()
    foreach ($sid in $SectionIds) {
        $cases += Get-TestRailAllCases -ProjectId $ProjectId -SuiteId $SuiteId -SectionId $sid
    }
    $cases = $cases | Sort-Object { [int]$_.id } -Unique
}
else {
    $cases = Get-TestRailAllCases -ProjectId $ProjectId -SuiteId $SuiteId
}

Write-Host "Cases: $($cases.Count) (project=$ProjectId suite=$SuiteId)"

if ($OutFile) {
    if ($Json -or $OutFile -match '\.json$') {
        $cases | ConvertTo-Json -Depth 8 | Out-File -FilePath $OutFile -Encoding utf8
    }
    else {
        $cases | Export-Csv -Path $OutFile -NoTypeInformation -Encoding UTF8
    }
    Write-Host "Wrote $OutFile"
}
else {
    $cases | Select-Object id, title, section_id, type_id, custom_case_squadname, custom_case_feature_component | Format-Table -AutoSize
}

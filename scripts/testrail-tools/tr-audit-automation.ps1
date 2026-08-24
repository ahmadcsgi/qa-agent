<#
.SYNOPSIS
  Audit TestRail cases vs UI/API automation refs on GitHub master.
.EXAMPLE
  .\tr-audit-automation.ps1 -ProjectId 3 -SuiteId 282 -UiRepo "C:\...\telflow-ui-automation-test" -ApiRepo "C:\...\telflow-rest-api-test" -OutDir .\out
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][int]$ProjectId,
    [Parameter(Mandatory)][int]$SuiteId,
    [Parameter(Mandatory)][string]$UiRepo,
    [Parameter(Mandatory)][string]$ApiRepo,
    [string]$UiGitRemote = 'https://github.com/dgitsystems/telflow-ui-automation-test',
    [string]$ApiGitRemote = 'https://github.com/dgitsystems/telflow-rest-api-test',
    [string]$GitRef = 'origin/master',
    [string]$OutDir = '',
    [switch]$SkipXlsx
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\TestRailApi.ps1"

function Get-AutomationMapFromGitMaster {
    param(
        [string]$RepoPath,
        [string]$RepoLabel,
        [string]$GitRemote,
        [string]$Ref
    )

    if (-not (Test-Path -LiteralPath $RepoPath)) {
        throw "Repo not found: $RepoPath"
    }

    Push-Location $RepoPath
    try {
        $prevEap = $ErrorActionPreference
        $ErrorActionPreference = 'SilentlyContinue'
        $null = git fetch origin master 2>&1
        $ErrorActionPreference = $prevEap

        $files = @(git ls-tree -r --name-only $Ref 2>$null) | Where-Object { $_ -like '*.feature' }
        if (-not $files) { return @{} }

        $map = @{}
        foreach ($rel in $files) {
            if ($rel -match 'node_modules|/target/') { continue }
            $content = git show "${Ref}:${rel}" 2>$null
            if (-not $content) { continue }
            $gitLink = "$GitRemote/blob/master/$($rel.Replace('\','/'))"

            foreach ($m in [regex]::Matches($content, 'cases/view/(\d+)')) {
                $id = [int]$m.Groups[1].Value
                if (-not $map.ContainsKey($id)) { $map[$id] = @() }
                $map[$id] += [PSCustomObject]@{
                    Repo      = $RepoLabel
                    File      = $rel
                    GitLink   = $gitLink
                    MatchType = 'Test Case Link'
                    SourceRef = $Ref
                }
            }
            foreach ($m in [regex]::Matches($content, '@test_id=C(\d+)')) {
                $id = [int]$m.Groups[1].Value
                if (-not $map.ContainsKey($id)) { $map[$id] = @() }
                $map[$id] += [PSCustomObject]@{
                    Repo      = $RepoLabel
                    File      = $rel
                    GitLink   = $gitLink
                    MatchType = '@test_id'
                    SourceRef = $Ref
                }
            }
        }
        return $map
    }
    finally {
        Pop-Location
    }
}

function Merge-AutomationMaps($a, $b) {
    $merged = @{}
    foreach ($m in @($a, $b)) {
        foreach ($entry in $m.GetEnumerator()) {
            if (-not $merged.ContainsKey($entry.Key)) { $merged[$entry.Key] = @() }
            $merged[$entry.Key] += $entry.Value
        }
    }
    return $merged
}

Write-Host "Scan UI $GitRef..."
$uiMap = Get-AutomationMapFromGitMaster -RepoPath $UiRepo -RepoLabel 'UI (Cypress)' -GitRemote $UiGitRemote -Ref $GitRef
Write-Host "UI refs: $($uiMap.Keys.Count)"

Write-Host "Scan API $GitRef..."
$apiMap = Get-AutomationMapFromGitMaster -RepoPath $ApiRepo -RepoLabel 'API (Karate)' -GitRemote $ApiGitRemote -Ref $GitRef
Write-Host "API refs: $($apiMap.Keys.Count)"

$autoByCase = Merge-AutomationMaps $uiMap $apiMap

$api = Connect-TestRailApi
$caseBase = "$($api.Base)/index.php?/cases/view/"
$typeMap = @{ 13 = 'Manual'; 3 = 'Automated' }
$manualId = 13
$automatedId = 3

$sections = Get-TestRailAllSections -ProjectId $ProjectId -SuiteId $SuiteId
$sectionById = @{}
foreach ($s in $sections) { $sectionById[[int]$s.id] = $s }

$rows = @()
foreach ($c in (Get-TestRailAllCases -ProjectId $ProjectId -SuiteId $SuiteId)) {
    $id = [int]$c.id
    $refs = if ($autoByCase.ContainsKey($id)) { $autoByCase[$id] } else { @() }
    $hasAuto = ($refs.Count -gt 0)
    $curTypeId = [int]$c.type_id
    $curType = if ($typeMap.ContainsKey($curTypeId)) { $typeMap[$curTypeId] } else { "Other ($curTypeId)" }

    $status = if ($hasAuto -and $curTypeId -ne $automatedId) {
        'Update to Automated'
    }
    elseif (-not $hasAuto -and $curTypeId -eq $automatedId) {
        'Review (Automated but no repo link on master)'
    }
    elseif ($hasAuto) {
        'OK (Automated)'
    }
    else {
        'OK (Manual)'
    }

    $rows += [PSCustomObject]@{
        CaseId            = $id
        CaseKey           = "C$id"
        TestRailLink      = "$caseBase$id"
        Title             = ([string]$c.title).Trim()
        SectionPath       = Get-TestRailSectionPath -SectionId ([int]$c.section_id) -SectionById $sectionById
        CurrentType       = $curType
        SuggestedType     = if ($hasAuto) { $typeMap[$automatedId] } else { $typeMap[$manualId] }
        AutomationFound   = if ($hasAuto) { 'Yes' } else { 'No' }
        AutomationRepo    = (($refs | ForEach-Object { $_.Repo } | Select-Object -Unique) -join '; ')
        AutomationFile    = (($refs | ForEach-Object { $_.File } | Select-Object -Unique) -join '; ')
        AutomationGitLink = if ($refs.Count -gt 0) { $refs[0].GitLink } else { '' }
        MatchType         = (($refs | ForEach-Object { $_.MatchType } | Select-Object -Unique) -join ', ')
        SourceRef         = if ($refs.Count -gt 0) { (($refs | ForEach-Object { $_.SourceRef } | Select-Object -Unique) -join '; ') } else { '' }
        Status            = $status
    }
}

if (-not $OutDir) {
    $OutDir = $PSScriptRoot
}
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$csvAll = Join-Path $OutDir 'automation-audit-all.csv'
$csvIssues = Join-Path $OutDir 'automation-audit-issues.csv'
$xlsxOut = Join-Path $OutDir 'automation-audit.xlsx'

$rows | Sort-Object SectionPath, CaseId | Export-Csv -Path $csvAll -NoTypeInformation -Encoding UTF8
$rows | Where-Object { $_.Status -in @('Update to Automated', 'Review (Automated but no repo link on master)') } |
    Sort-Object SectionPath, CaseId | Export-Csv -Path $csvIssues -NoTypeInformation -Encoding UTF8

$autoCount = ($rows | Where-Object AutomationFound -eq 'Yes').Count
$needUpdate = ($rows | Where-Object Status -eq 'Update to Automated').Count
$review = ($rows | Where-Object Status -like 'Review*').Count

Write-Host "Suite $SuiteId: $($rows.Count) cases | automation on master: $autoCount | update: $needUpdate | review: $review"
Write-Host "CSV: $csvAll"
Write-Host "Issues: $csvIssues"

if (-not $SkipXlsx) {
    & "$PSScriptRoot\tr-export-xlsx.ps1" -CsvPath $csvAll -XlsxPath $xlsxOut -SheetName 'All Cases'
}

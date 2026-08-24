# Shared TestRail REST helpers for QA Agent CLI tools.
# Loads credentials from testrail-mcp config/env.local via common.ps1.

function Resolve-TestRailMcpRoot {
    if ($env:TESTRAIL_MCP_ROOT) {
        return $env:TESTRAIL_MCP_ROOT
    }

    $candidates = @(
        (Join-Path $env:USERPROFILE 'OneDrive - CSG Systems Inc\Documents\AI\MCP\testrail-mcp'),
        (Join-Path $env:USERPROFILE 'Documents\AI\MCP\testrail-mcp'),
        (Join-Path $env:USERPROFILE 'AI\MCP\testrail-mcp')
    )

    foreach ($root in $candidates) {
        $lib = Join-Path $root 'scripts\lib\common.ps1'
        if (Test-Path -LiteralPath $lib) {
            return $root
        }
    }

    throw 'TestRail MCP root not found. Set TESTRAIL_MCP_ROOT or install AI/MCP/testrail-mcp.'
}

function Connect-TestRailApi {
    $root = Resolve-TestRailMcpRoot
    . (Join-Path $root 'scripts\lib\common.ps1')
    Import-TestrailMcpEnvFile
    Resolve-TestrailMcpEnv

    $base = $env:TESTRAIL_URL.TrimEnd('/')
    $pair = "$($env:TESTRAIL_USERNAME):$($env:TESTRAIL_API_KEY)"
    $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))

    return [PSCustomObject]@{
        Base    = $base
        Headers = @{
            Authorization  = "Basic $auth"
            'Content-Type' = 'application/json'
        }
    }
}

function Invoke-TestRailApi {
    param(
        [Parameter(Mandatory)][string]$Path,
        [ValidateSet('Get', 'Post')]
        [string]$Method = 'Get',
        [string]$Body = $null
    )

    $api = Connect-TestRailApi
    $uri = "$($api.Base)/index.php?/api/v2/$Path"

    if ($Method -eq 'Post') {
        return Invoke-RestMethod -Method Post -Uri $uri -Headers $api.Headers -Body $Body
    }

    return Invoke-RestMethod -Method Get -Uri $uri -Headers $api.Headers
}

function Get-TestRailAllSections {
    param(
        [Parameter(Mandatory)][int]$ProjectId,
        [Parameter(Mandatory)][int]$SuiteId
    )

    $resp = Invoke-TestRailApi -Path "get_sections/$ProjectId&suite_id=$SuiteId&limit=250"
    return @($resp.sections)
}

function Get-TestRailSectionTreeIds {
    param(
        [Parameter(Mandatory)]$Sections,
        [Parameter(Mandatory)][int[]]$RootSectionIds
    )

    $sectionById = @{}
    foreach ($s in $Sections) {
        $sectionById[[int]$s.id] = $s
    }

    $ids = [System.Collections.Generic.HashSet[int]]::new()
    foreach ($r in $RootSectionIds) {
        [void]$ids.Add([int]$r)
    }

    $changed = $true
    while ($changed) {
        $changed = $false
        foreach ($s in $Sections) {
            $sid = [int]$s.id
            $parent = if ($null -eq $s.parent_id) { 0 } else { [int]$s.parent_id }
            if ($ids.Contains($parent) -and -not $ids.Contains($sid)) {
                [void]$ids.Add($sid)
                $changed = $true
            }
        }
    }

    return @{
        Ids         = $ids
        SectionById = $sectionById
    }
}

function Get-TestRailSectionPath {
    param(
        [Parameter(Mandatory)][int]$SectionId,
        [Parameter(Mandatory)]$SectionById
    )

    $parts = @()
    $cur = $SectionId
    $guard = 0

    while ($cur -and $SectionById.ContainsKey($cur) -and $guard -lt 25) {
        $parts = ,$SectionById[$cur].name + $parts
        $parentId = $SectionById[$cur].parent_id
        if ($null -eq $parentId -or [int]$parentId -eq 0) { break }
        $cur = [int]$parentId
        $guard++
    }

    return ($parts -join ' > ')
}

function Get-TestRailAllCases {
    param(
        [Parameter(Mandatory)][int]$ProjectId,
        [Parameter(Mandatory)][int]$SuiteId,
        [int]$SectionId = 0
    )

    $all = @()
    $offset = 0

    do {
        $path = "get_cases/$ProjectId&suite_id=$SuiteId&limit=250&offset=$offset"
        if ($SectionId -gt 0) {
            $path += "&section_id=$SectionId"
        }
        $page = Invoke-TestRailApi -Path $path
        if ($page.cases) {
            $all += @($page.cases)
        }
        $offset += 250
    } while ($page._links.next)

    return $all
}

function Update-TestRailCaseFields {
    param(
        [Parameter(Mandatory)][int]$CaseId,
        [Parameter(Mandatory)][hashtable]$Fields
    )

    $body = ($Fields | ConvertTo-Json -Compress)
    return Invoke-TestRailApi -Method Post -Path "update_case/$CaseId" -Body $body
}

function Update-TestRailPlanEntryCases {
    param(
        [Parameter(Mandatory)][int]$PlanId,
        [Parameter(Mandatory)][string]$EntryId,
        [Parameter(Mandatory)][int]$SuiteId,
        [Parameter(Mandatory)][int[]]$CaseIds,
        [switch]$NoMerge
    )

    $finalIds = @($CaseIds | Select-Object -Unique)

    if (-not $NoMerge) {
        $plan = Invoke-TestRailApi -Path "get_plan/$PlanId"
        foreach ($entry in @($plan.entries)) {
            if ([string]$entry.id -ne [string]$EntryId) { continue }
            foreach ($run in @($entry.runs)) {
                if ($run.case_ids) {
                    $finalIds += @($run.case_ids | ForEach-Object { [int]$_ })
                }
            }
        }
        $finalIds = @($finalIds | Select-Object -Unique | Sort-Object)
    }

    $body = @{
        suite_id    = $SuiteId
        include_all = $false
        case_ids    = $finalIds
    } | ConvertTo-Json -Compress

    return Invoke-TestRailApi -Method Post -Path "update_plan_entry/$PlanId/$EntryId" -Body $body
}

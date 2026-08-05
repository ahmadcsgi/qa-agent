<#
.SYNOPSIS
    Remove QA Agent global install (skills, agent, optional memory).
.PARAMETER KeepMemory
    Keep ~/.qa-agent memory store
.EXAMPLE
    .\uninstall.ps1
    .\uninstall.ps1 -KeepMemory
#>
[CmdletBinding()]
param(
    [switch]$KeepMemory
)

$ErrorActionPreference = "Stop"

function Write-Info { Write-Host "[INFO]  $args" -ForegroundColor Cyan }
function Write-Ok   { Write-Host "[OK]    $args" -ForegroundColor Green }

$HomeDir = $env:USERPROFILE
$GlobalSkills = Join-Path $HomeDir ".cursor\skills"
$GlobalAgent = Join-Path $HomeDir ".cursor\agents\qa.md"
$GlobalCommand = Join-Path $HomeDir ".cursor\commands\qa.md"
$GlobalStore = Join-Path $HomeDir ".qa-agent"

$QaSkills = @(
    "qa-entry", "qa-search-tickets", "qa-defect-triage", "qa-ui-automation",
    "qa-perf-test", "qa-test-cases", "qa-test-execution", "qa-api-test", "qa-project-mapping",
    "qa-token-saver", "qa-visual-test", "qa-pr-review"
)

Write-Host "QA Agent uninstall (global Cursor install)" -ForegroundColor Yellow
Write-Host "This does NOT delete project .cursor/ folders or mcp.json." -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Info "Aborted"
    exit 0
}

foreach ($name in $QaSkills) {
    $target = Join-Path $GlobalSkills $name
    if (Test-Path $target) {
        Remove-Item -Recurse -Force $target
        Write-Ok "Removed skill $name"
    }
}

if (Test-Path $GlobalAgent) {
    Remove-Item -Force $GlobalAgent
    Write-Ok "Removed ~/.cursor/agents/qa.md"
}

if (Test-Path $GlobalCommand) {
    Remove-Item -Force $GlobalCommand
    Write-Ok "Removed ~/.cursor/commands/qa.md"
}

if (-not $KeepMemory) {
    if (Test-Path $GlobalStore) {
        Remove-Item -Recurse -Force $GlobalStore
        Write-Ok "Removed ~/.qa-agent"
    }
}
else {
    Write-Info "Kept ~/.qa-agent memory (KeepMemory)"
    foreach ($f in @("mcp-mode.js", "mcp-lib.js")) {
        $p = Join-Path $GlobalStore "lib\$f"
        if (Test-Path $p) {
            Remove-Item -Force $p
            Write-Ok "Removed lib/$f (reinstall via installer)"
        }
    }
}

Write-Host ""
Write-Host "Uninstall complete. Project-local .cursor/ files (if any) were left intact." -ForegroundColor Green

<#
.SYNOPSIS
    Update QA Agent (force reinstall from this repo).
.EXAMPLE
    .\update.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$VersionFile = Join-Path $Here "VERSION"
$Ver = if (Test-Path $VersionFile) { (Get-Content $VersionFile -Raw).Trim() } else { "unknown" }

Write-Host "QA Agent update → v$Ver" -ForegroundColor Cyan
$env:CI = "1"
& node (Join-Path $Here "scripts\update-agent.js") @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host ""
Write-Host "See CHANGELOG.md for what changed." -ForegroundColor Cyan

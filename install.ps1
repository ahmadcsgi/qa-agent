<#
.SYNOPSIS
    QA Agent Installer for Windows
.DESCRIPTION
    Installs QA Agent skills, subagent, rules, and memory structure.
    Creates global memory store at ~\.qa-agent\ for universal data.
.PARAMETER Force
    Overwrite existing global skills/agents without prompting
.EXAMPLE
    .\install.ps1
    .\install.ps1 -Force
#>

[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# ─── Colors ───────────────────────────────────────────────────────────────
function Write-Info  { Write-Host "[INFO]  $args" -ForegroundColor Cyan }
function Write-Ok    { Write-Host "[OK]    $args" -ForegroundColor Green }
function Write-Err   { Write-Host "[ERR]   $args" -ForegroundColor Red }

# ─── Paths ─────────────────────────────────────────────────────────────────
$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoDir = (Resolve-Path $RepoDir).Path

$SkillsSrc    = Join-Path $RepoDir ".cursor" "skills"
$AgentsSrc    = Join-Path $RepoDir ".cursor" "agents"
$RulesSrc     = Join-Path $RepoDir ".cursor" "rules"
$MemorySrc    = Join-Path $RepoDir ".cursor" "qa-memory"
$McpToolsSrc  = Join-Path $RepoDir ".cursor" "MCP_TOOLS.md"
$AgentsMdSrc  = Join-Path $RepoDir "AGENTS.md"
$ReadmeSrc    = Join-Path $RepoDir "README.md"
$StoreSrc     = Join-Path $RepoDir "scripts" "store.js"

# ─── Global store dir (~\.qa-agent\) ──────────────────────────────────────
$GlobalStoreDir = Join-Path $env:USERPROFILE ".qa-agent"

# ─── Detect target ─────────────────────────────────────────────────────────
$TestPath = Join-Path $RepoDir ".cursor" "skills" "qa-entry" "SKILL.md"
if (Test-Path $TestPath) {
    $TargetDir = $RepoDir
    Write-Info "Detected project root at $TargetDir (running in-place)"
}
else {
    $TargetDir = (Get-Location).Path
    Write-Info "Installing into $TargetDir"
}

# ─── Create project directories ────────────────────────────────────────────
Write-Info "Creating project directory structure..."
@(
    ".cursor\skills",
    ".cursor\agents",
    ".cursor\rules",
    ".cursor\qa-memory\project-context",
    ".cursor\qa-memory\generated-tests\cypress",
    ".cursor\qa-memory\generated-tests\k6",
    ".cursor\qa-memory\generated-tests\karate",
    ".cursor\qa-memory\generated-tests\visual"
) | ForEach-Object {
    $FullPath = Join-Path $TargetDir $_
    New-Item -ItemType Directory -Force -Path $FullPath | Out-Null
}

# ─── Global memory store ───────────────────────────────────────────────────
Write-Info "Creating global memory store at $GlobalStoreDir ..."
New-Item -ItemType Directory -Force -Path (Join-Path $GlobalStoreDir "lib") | Out-Null

# Copy storage engine
if (Test-Path $StoreSrc) {
    $LibTarget = Join-Path $GlobalStoreDir "lib" "store.js"
    Copy-Item -Path $StoreSrc -Destination $LibTarget -Force
    Write-Ok "  Storage engine installed (~\.qa-agent\lib\store.js)"
}
else {
    Write-Err "  store.js not found at $StoreSrc"
}

# Initialize JSON stores (compact format with short field names)
$GlobalFiles = @{
    "search-cache.json"  = '{"v":2,"c":"' + (Get-Date -Format o) + '","d":{}}'
    "corrections.json"   = '{"v":2,"c":"' + (Get-Date -Format o) + '","d":[]}'
    "knowledge.json"     = '{"v":2,"c":"' + (Get-Date -Format o) + '","d":[]}'
}
foreach ($file in $GlobalFiles.Keys) {
    $path = Join-Path $GlobalStoreDir $file
    if (-not (Test-Path $path)) {
        Set-Content -Path $path -Value $GlobalFiles[$file] -Encoding UTF8
        Write-Ok "  Created $file (v2 compact)"
    }
    else {
        Write-Info "  $file exists - skipping"
    }
}

# ─── Global skills directory ───────────────────────────────────────────────
$GlobalSkillsDir = Join-Path $env:USERPROFILE ".cursor" "skills"
New-Item -ItemType Directory -Force -Path $GlobalSkillsDir | Out-Null

# ─── Copy skills ───────────────────────────────────────────────────────────
if (-not (Test-Path $SkillsSrc)) {
    Write-Err "Skills directory not found at '$SkillsSrc'. Clone the full repo."
    exit 1
}

$SkillCount = (Get-ChildItem "$SkillsSrc" -Directory).Count
if ($TargetDir -ne $RepoDir) {
    Write-Info "Copying skills to project '$TargetDir\.cursor\skills\'..."
    Get-ChildItem "$SkillsSrc\*" -Directory | ForEach-Object {
        $Target = Join-Path $TargetDir ".cursor" "skills" $_.Name
        Copy-Item -Path $_.FullName -Destination $Target -Recurse -Force:$Force
    }
    Write-Ok "Project skills installed ($SkillCount skills)"
}
else {
    Write-Info "Running in-place - project skills already present ($SkillCount skills)"
}

Write-Info "Copying skills to global '$GlobalSkillsDir\'..."
Get-ChildItem "$SkillsSrc\*" -Directory | ForEach-Object {
    $SkillName = $_.Name
    $Target = Join-Path $GlobalSkillsDir $SkillName
    if (Test-Path $Target) {
        if ($Force) {
            Copy-Item -Path $_.FullName -Destination $Target -Recurse -Force
            Write-Ok "  Global skill '$SkillName' updated (forced)"
        }
        else {
            Write-Info "  Global skill '$SkillName' exists - skipping (use -Force to overwrite)"
        }
    }
    else {
        Copy-Item -Path $_.FullName -Destination $Target -Recurse
        Write-Ok "  Global skill '$SkillName' installed"
    }
}

# ─── Global agent directory ────────────────────────────────────────────────
$GlobalAgentsDir = Join-Path $env:USERPROFILE ".cursor" "agents"
New-Item -ItemType Directory -Force -Path $GlobalAgentsDir | Out-Null

# ─── Copy subagent (project + global) ─────────────────────────────────────
$AgentFile = Join-Path $AgentsSrc "qa.md"
if (-not (Test-Path $AgentFile)) {
    $AgentFile = Join-Path $AgentsSrc "qa-agent.md"  # legacy fallback
}
if (Test-Path $AgentFile) {
    $ProjectAgent = Join-Path $TargetDir ".cursor" "agents" "qa.md"
    if ($AgentFile -ne $ProjectAgent) {
        Copy-Item -Path $AgentFile -Destination $ProjectAgent -Force:$Force
        Write-Ok "Custom subagent installed (.cursor\agents\qa.md)"
    }
    $GlobalAgent = Join-Path $GlobalAgentsDir "qa.md"
    if ((-not (Test-Path $GlobalAgent)) -or $Force) {
        Copy-Item -Path $AgentFile -Destination $GlobalAgent -Force:$Force
        Write-Ok "Global custom agent installed (~\.cursor\agents\qa.md)"
    }
    else {
        Write-Info "Global custom agent exists - skipping (use -Force to overwrite)"
    }
}

# ─── Copy rules ────────────────────────────────────────────────────────────
$RulesFile = Join-Path $RulesSrc "qa-agent-rules.mdc"
if (Test-Path $RulesFile) {
    $Target = Join-Path $TargetDir ".cursor" "rules" "qa-agent-rules.mdc"
    if ($RulesFile -ne $Target) {
        Copy-Item -Path $RulesFile -Destination $Target -Force:$Force
        Write-Ok "Project rules installed (.cursor\rules\qa-agent-rules.mdc)"
    }
}

# ─── Copy AGENTS.md ────────────────────────────────────────────────────────
if (Test-Path $AgentsMdSrc) {
    $Target = Join-Path $TargetDir "AGENTS.md"
    if ($AgentsMdSrc -ne $Target) {
        Copy-Item -Path $AgentsMdSrc -Destination $Target -Force:$Force
        Write-Ok "AGENTS.md installed"
    }
}

# ─── Copy README.md ────────────────────────────────────────────────────────
if (Test-Path $ReadmeSrc) {
    $Target = Join-Path $TargetDir "README.md"
    if ($ReadmeSrc -ne $Target) {
        Copy-Item -Path $ReadmeSrc -Destination $Target -Force:$Force
        Write-Ok "README.md installed"
    }
}

# ─── Copy MCP_TOOLS.md ────────────────────────────────────────────────────
if (Test-Path $McpToolsSrc) {
    $Target = Join-Path $TargetDir ".cursor" "MCP_TOOLS.md"
    if ($McpToolsSrc -ne $Target) {
        Copy-Item -Path $McpToolsSrc -Destination $Target -Force:$Force
        Write-Ok "MCP_TOOLS.md installed"
    }
}

# ─── Copy project-context/current.md (if exists) ──────────────────────────
$ProjectContextSrc = Join-Path $MemorySrc "project-context" "current.md"
if (Test-Path $ProjectContextSrc) {
    $Target = Join-Path $TargetDir ".cursor" "qa-memory" "project-context" "current.md"
    if (-not (Test-Path $Target)) {
        Copy-Item -Path $ProjectContextSrc -Destination $Target -Force
        Write-Ok "project-context/current.md installed"
    }
}

# ─── Done ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  QA Agent installed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host ""
Write-Host "  1. Configure MCP servers -> ~\.cursor\mcp.json"
Write-Host "     See .cursor\MCP_TOOLS.md for required servers"
Write-Host ""
Write-Host "  2. Restart Cursor"
Write-Host ""
Write-Host "  3. Select '@qa' from the agent dropdown"
Write-Host "     (top-left of chat panel) or type @qa"
Write-Host ""
Write-Host "Memory:" -ForegroundColor Cyan
Write-Host "  Global (shared across projects): $GlobalStoreDir" -ForegroundColor Cyan
Write-Host "  Project (this project only):     .cursor\qa-memory\" -ForegroundColor Cyan
Write-Host ""
Write-Host "Windows known issue:" -ForegroundColor Yellow
Write-Host "  Cursor Agent has a known bug using wrong shell on Windows." -ForegroundColor Yellow
Write-Host "  Fix: Settings -> Agents -> Legacy Terminal Tool: ON" -ForegroundColor Yellow
Write-Host ""
Write-Host "  If using PowerShell 7 instead of PS 5, add pwsh to the top" -ForegroundColor Yellow
Write-Host "  of your system PATH (System Environment Variables)." -ForegroundColor Yellow

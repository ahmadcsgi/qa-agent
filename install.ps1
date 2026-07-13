<#
.SYNOPSIS
    QA Agent Installer for Windows
.DESCRIPTION
    Installs QA Agent skills, subagent, rules, and memory structure into the
    current project and global Cursor configuration.
.PARAMETER Force
    Overwrite existing files without prompting
.EXAMPLE
    .\install.ps1
    .\install.ps1 -Force
#>

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$InformationPreference = "Continue"

# ─── Colors ───────────────────────────────────────────────────────────────
function Write-Info  { Write-Host "[INFO]  $args" -ForegroundColor Cyan }
function Write-Ok    { Write-Host "[OK]    $args" -ForegroundColor Green }
function Write-Err   { Write-Host "[ERR]   $args" -ForegroundColor Red }

# ─── Paths ─────────────────────────────────────────────────────────────────
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoDir = Resolve-Path $ScriptDir

$SkillsSrc = Join-Path $RepoDir ".cursor\skills"
$AgentsSrc = Join-Path $RepoDir ".cursor\agents"
$RulesSrc = Join-Path $RepoDir ".cursor\rules"
$MemorySrc = Join-Path $RepoDir ".cursor\qa-memory"
$McpToolsSrc = Join-Path $RepoDir ".cursor\MCP_TOOLS.md"
$AgentsMdSrc = Join-Path $RepoDir "AGENTS.md"

# ─── Detect target ─────────────────────────────────────────────────────────
$TestPath = Join-Path $RepoDir ".cursor\skills\qa-entry\SKILL.md"
if (Test-Path $TestPath) {
    $TargetDir = $RepoDir
    Write-Info "Detected project root at $TargetDir (running in-place)"
} else {
    $TargetDir = (Get-Location).Path
    Write-Info "Installing into $TargetDir"
}

# ─── Create directories ────────────────────────────────────────────────────
Write-Info "Creating directory structure..."
$Dirs = @(
    ".cursor\skills",
    ".cursor\agents",
    ".cursor\rules",
    ".cursor\qa-memory\project-context",
    ".cursor\qa-memory\search-cache",
    ".cursor\qa-memory\corrections",
    ".cursor\qa-memory\generated-tests\cypress",
    ".cursor\qa-memory\generated-tests\k6",
    ".cursor\qa-memory\generated-tests\karate",
    ".cursor\qa-memory\knowledge"
)

foreach ($Dir in $Dirs) {
    $FullPath = Join-Path $TargetDir $Dir
    New-Item -ItemType Directory -Force -Path $FullPath | Out-Null
}

# ─── Global skills directory ───────────────────────────────────────────────
$GlobalSkillsDir = Join-Path $env:USERPROFILE ".cursor\skills"
New-Item -ItemType Directory -Force -Path $GlobalSkillsDir | Out-Null

# ─── Copy skills ───────────────────────────────────────────────────────────
if (Test-Path $SkillsSrc) {
    Write-Info "Copying skills to project '$TargetDir\.cursor\skills\'..."
    Get-ChildItem "$SkillsSrc\*" -Directory | ForEach-Object {
        $Target = Join-Path $TargetDir ".cursor\skills\$($_.Name)"
        Copy-Item -Path $_.FullName -Destination $Target -Recurse -Force:$Force
    }
    $SkillCount = (Get-ChildItem "$TargetDir\.cursor\skills\" -Directory).Count
    Write-Ok "Project skills installed ($SkillCount skills)"

    Write-Info "Copying skills to global '$GlobalSkillsDir\'..."
    Get-ChildItem "$SkillsSrc\*" -Directory | ForEach-Object {
        $SkillName = $_.Name
        $Target = Join-Path $GlobalSkillsDir $SkillName
        if (Test-Path $Target) {
            if ($Force) {
                Copy-Item -Path $_.FullName -Destination $Target -Recurse -Force
                Write-Ok "  Global skill '$SkillName' installed (forced)"
            } else {
                Write-Info "  Global skill '$SkillName' exists — skipping (use -Force to overwrite)"
            }
        } else {
            Copy-Item -Path $_.FullName -Destination $Target -Recurse
            Write-Ok "  Global skill '$SkillName' installed"
        }
    }
} else {
    Write-Err "Skills directory not found at '$SkillsSrc'. Clone the full repo."
    exit 1
}

# ─── Copy subagent ─────────────────────────────────────────────────────────
$AgentFile = Join-Path $AgentsSrc "qa-agent.md"
if (Test-Path $AgentFile) {
    $Target = Join-Path $TargetDir ".cursor\agents\qa-agent.md"
    Copy-Item -Path $AgentFile -Destination $Target -Force:$Force
    Write-Ok "Custom subagent installed (.cursor\agents\qa-agent.md)"
}

# ─── Copy rules ────────────────────────────────────────────────────────────
$RulesFile = Join-Path $RulesSrc "qa-agent-rules.mdc"
if (Test-Path $RulesFile) {
    $Target = Join-Path $TargetDir ".cursor\rules\qa-agent-rules.mdc"
    Copy-Item -Path $RulesFile -Destination $Target -Force:$Force
    Write-Ok "Project rules installed (.cursor\rules\qa-agent-rules.mdc)"
}

# ─── Copy AGENTS.md ────────────────────────────────────────────────────────
if (Test-Path $AgentsMdSrc) {
    $Target = Join-Path $TargetDir "AGENTS.md"
    Copy-Item -Path $AgentsMdSrc -Destination $Target -Force:$Force
    Write-Ok "AGENTS.md installed at project root"
}

# ─── Copy MCP_TOOLS.md ─────────────────────────────────────────────────────
if (Test-Path $McpToolsSrc) {
    $Target = Join-Path $TargetDir ".cursor\MCP_TOOLS.md"
    Copy-Item -Path $McpToolsSrc -Destination $Target -Force:$Force
    Write-Ok "MCP_TOOLS.md installed"
}

# ─── Copy MEMORY_PROTOCOL.md (if exists) ───────────────────────────────────
$MemoryProtocol = Join-Path $MemorySrc "MEMORY_PROTOCOL.md"
$TargetMemoryProtocol = Join-Path $TargetDir ".cursor\qa-memory\MEMORY_PROTOCOL.md"
if (Test-Path $MemoryProtocol) {
    if (-not (Test-Path $TargetMemoryProtocol) -or $Force) {
        Copy-Item -Path $MemoryProtocol -Destination $TargetMemoryProtocol -Force:$Force
        Write-Ok "MEMORY_PROTOCOL.md installed"
    } else {
        Write-Info "MEMORY_PROTOCOL.md exists — skipping (use -Force to overwrite)"
    }
}

# ─── Done ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  QA Agent installed successfully!"       -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Bold
Write-Host ""
Write-Host "  1. Configure MCP servers → ~\.cursor\mcp.json"
Write-Host "     See .cursor\MCP_TOOLS.md for required servers"
Write-Host ""
Write-Host "  2. Paste User Rules into Cursor Settings > Rules > User Rules:"
Write-Host "     (Open Cursor → Ctrl+Shift+P → 'Preferences: Open User Rules')"
Write-Host "     Paste the content from the README.md 'User Rules' section"
Write-Host ""
Write-Host "  3. Restart Cursor"
Write-Host ""
Write-Host "  4. Type @qa in chat to start using the QA Agent!"
Write-Host ""
Write-Host "Tip: Skills are also available globally at ~\.cursor\skills\" -ForegroundColor Cyan
Write-Host "     so you can use @qa-* in ANY Cursor project." -ForegroundColor Cyan
Write-Host ""
Write-Host "Agent Selection:" -ForegroundColor Bold
Write-Host "  After restarting Cursor, select 'qa-agent' from the agent dropdown"
Write-Host "  (top-left of chat panel) or type @qa-agent in chat."

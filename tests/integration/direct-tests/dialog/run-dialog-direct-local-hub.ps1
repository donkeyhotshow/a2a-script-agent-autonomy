# Run dialog flow. Local HTTP LLM on 11435; a2a-ai-hub proxy on 11434.
# If timeout: set FORWARD_TIMEOUT_SECONDS=180 when starting a2a-ai-hub.
#
# Usage:
#   .\run-dialog-direct-local-hub.ps1
#   .\run-dialog-direct-local-hub.ps1 -RetryRequest "a2a-server\storage\requests\prom_xxx.json"

param(
    [string]$RetryRequest,
    [string]$LocalLlmUpstreamUrl = 'http://localhost:11435',
    [string]$ClientUrl = 'http://localhost:5173'
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $PSCommandPath
$directTestsDir = Split-Path -Parent $scriptDir
$repoRoot = Resolve-Path (Join-Path $directTestsDir '..\..')
$a2aServerDir = Join-Path $repoRoot 'a2a-server'
$envFile = Join-Path $a2aServerDir '.env'

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "  OK $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  WARN $msg" -ForegroundColor Yellow }

Write-Step "Dialog flow (a2a-ai-hub -> local LLM upstream)"

Write-Host "`n[1] Local LLM upstream" -ForegroundColor Gray
try {
    $null = Invoke-RestMethod -Uri "$LocalLlmUpstreamUrl/api/tags" -TimeoutSec 5
    Ok "Local LLM upstream reachable"
} catch {
    Write-Host "  FAIL: not reachable at $LocalLlmUpstreamUrl" -ForegroundColor Red
    Write-Host "  Start your HTTP LLM on that port (see docs/SYSTEM_STARTUP.md)." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n[2] a2a-server config" -ForegroundColor Gray
try {
    Invoke-RestMethod -Uri "http://localhost:11434/health" -TimeoutSec 3 | Out-Null
    Ok "a2a-ai-hub proxy (11434)"
} catch {
    Warn "a2a-ai-hub not reachable. Start with: start-all.bat"
}

Write-Host "`n[3] Services" -ForegroundColor Gray
$checks = @(
    @{ Name = "Client API"; Url = "$ClientUrl/api/a2a/projects" }
    @{ Name = "Server"; Url = "http://localhost:3000/health" }
)
foreach ($c in $checks) {
    try {
        Invoke-RestMethod -Uri $c.Url -TimeoutSec 3 | Out-Null
        Ok $c.Name
    } catch {
        Write-Host "  FAIL: $($c.Name) not reachable" -ForegroundColor Red
        Write-Host "  Start services: .\start-all.bat" -ForegroundColor Yellow
        exit 1
    }
}

if ($RetryRequest) {
    Write-Step "Retrying request: $RetryRequest"
    $reqPath = if ([System.IO.Path]::IsPathRooted($RetryRequest)) { $RetryRequest } else { Join-Path $repoRoot $RetryRequest }
    if (-not (Test-Path $reqPath)) {
        Write-Host "  FAIL: File not found: $reqPath" -ForegroundColor Red
        exit 1
    }
    $content = Get-Content $reqPath -Raw
    $req = $content | ConvertFrom-Json
    $req.status = 'pending'
    $req.result = $null
    $req.error = $null
    $req.startedAt = $null
    $req.completedAt = $null
    $req | ConvertTo-Json -Depth 10 | Set-Content $reqPath -Encoding utf8 -NoNewline
    Ok "Request reset to pending. Server will reprocess on next tick (5s)."
    exit 0
}

Write-Step "Running test-dialog-flow.ps1"
Push-Location $directTestsDir
try {
    & (Join-Path $directTestsDir 'test-dialog-flow.ps1')
} finally {
    Pop-Location
}

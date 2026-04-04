# Run dialog flow. Use ai-integration proxy (11435) -> Ollama (11434).
# If timeout: set FORWARD_TIMEOUT_SECONDS=180 when starting ai-integration.
#
# Usage:
#   .\run-dialog-direct-ollama.ps1
#   .\run-dialog-direct-ollama.ps1 -RetryRequest "a2a-server\storage\requests\prom_xxx.json"

param(
    [string]$RetryRequest,
    [string]$OllamaUrl = 'http://localhost:11435',
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

Write-Step "Dialog flow (ai-integration -> Ollama)"

# 1. Check Ollama
Write-Host "`n[1] Ollama" -ForegroundColor Gray
try {
    $tags = Invoke-RestMethod -Uri "$OllamaUrl/api/tags" -TimeoutSec 5
    Ok "Ollama reachable"
} catch {
    Write-Host "  FAIL: Ollama not reachable at $OllamaUrl" -ForegroundColor Red
    Write-Host "  Run: ollama serve" -ForegroundColor Yellow
    exit 1
}

# 2. Check ai-integration proxy
Write-Host "`n[2] a2a-server config" -ForegroundColor Gray
try {
    Invoke-RestMethod -Uri "http://localhost:11434/health" -TimeoutSec 3 | Out-Null
    Ok "ai-integration proxy (11434)"
} catch {
    Warn "ai-integration not reachable. Start with: start-all.bat"
}

# 3. Check services
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

# 4. Retry failed request (optional)
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

# 5. Run dialog test
Write-Step "Running test-dialog-flow.ps1"
Push-Location $directTestsDir
try {
    & (Join-Path $directTestsDir 'test-dialog-flow.ps1')
} finally {
    Pop-Location
}

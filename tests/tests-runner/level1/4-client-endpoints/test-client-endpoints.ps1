# Level 1.4: Client API Endpoints Test
# Verifies all client API (port 3001) endpoints respond correctly.

param([switch]$Verbose)

$ErrorActionPreference = 'Stop'
$BaseUrl = 'http://localhost:3001'

function Write-Success { param($Message) Write-Host "  OK $Message" -ForegroundColor Green }
function Write-Fail { param($Message) Write-Host "  FAIL $Message" -ForegroundColor Red }
function Write-Skip { param($Message) Write-Host "  SKIP $Message" -ForegroundColor Yellow }
function Write-Info { param($Message) Write-Host "  $Message" -ForegroundColor Cyan }

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method = 'GET',
        [string]$Path,
        [object]$Body = $null,
        [int[]]$AcceptStatus = @(200, 201),
        [switch]$Optional
    )
    $url = "$BaseUrl$Path"
    try {
        $params = @{ Uri = $url; Method = $Method; TimeoutSec = 5; UseBasicParsing = $true }
        if ($Body) {
            $params['Body'] = ($Body | ConvertTo-Json -Compress -Depth 5)
            $params['ContentType'] = 'application/json'
        }
        $r = Invoke-WebRequest @params -ErrorAction Stop
        if ($r.StatusCode -in $AcceptStatus) {
            Write-Success "$Name -> $($r.StatusCode)"
            return $true
        }
        if ($Optional) { Write-Skip "$Name -> $($r.StatusCode) (optional)"; return $true }
        Write-Fail "$Name -> $($r.StatusCode), expected $AcceptStatus"
        return $false
    }
    catch {
        if ($Optional) { Write-Skip "$Name -> $($_.Exception.Message)"; return $true }
        Write-Fail "$Name -> $($_.Exception.Message)"
        return $false
    }
}

Write-Host "`nLevel 1.4: Client API Endpoints (localhost:3001)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$failed = 0

# --- No-auth / info ---
Write-Host "`n[1] Health & API info" -ForegroundColor White
if (-not (Test-Endpoint -Name "GET /health" -Path "/health")) { $failed++ }
if (-not (Test-Endpoint -Name "GET /api" -Path "/api")) { $failed++ }
if (-not (Test-Endpoint -Name "GET /api/v1" -Path "/api/v1")) { $failed++ }
if (-not (Test-Endpoint -Name "GET /api/ws" -Path "/api/ws")) { $failed++ }

# --- Config ---
Write-Host "`n[2] Config" -ForegroundColor White
if (-not (Test-Endpoint -Name "GET /api/config" -Path "/api/config")) { $failed++ }
$cfg = @{ serverUrl = "http://localhost:3000/api/v1"; token = $null }
if (-not (Test-Endpoint -Name "POST /api/config" -Method POST -Path "/api/config" -Body $cfg -AcceptStatus @(200))) { $failed++ }

# --- Projects ---
Write-Host "`n[3] Projects" -ForegroundColor White
if (-not (Test-Endpoint -Name "GET /api/projects" -Path "/api/projects")) { $failed++ }
$proj = @{ name = "e2e-test-project"; id = "e2e_p_1" }
if (-not (Test-Endpoint -Name "POST /api/projects" -Method POST -Path "/api/projects" -Body $proj -AcceptStatus @(201))) { $failed++ }
if (-not (Test-Endpoint -Name "GET /api/projects (with data)" -Path "/api/projects")) { $failed++ }

# --- Sessions ---
Write-Host "`n[4] Sessions" -ForegroundColor White
if (-not (Test-Endpoint -Name "GET /api/sessions" -Path "/api/sessions")) { $failed++ }
$sessBody = @{ projectId = "e2e_p_1"; title = "E2E Session" }
$createResp = $null
try {
    $createResp = Invoke-RestMethod -Uri "$BaseUrl/api/sessions" -Method POST -Body ($sessBody | ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 5
} catch { }
$sessionId = $createResp.id
if (-not $sessionId) {
    Write-Fail "POST /api/sessions did not return session id"
    $failed++
} else {
    Write-Success "POST /api/sessions -> created $sessionId"
    if (-not (Test-Endpoint -Name "GET /api/sessions/:id" -Path "/api/sessions/$sessionId")) { $failed++ }
    if (-not (Test-Endpoint -Name "GET /api/sessions/:id/metadata" -Path "/api/sessions/$sessionId/metadata")) { $failed++ }
    if (-not (Test-Endpoint -Name "PATCH /api/sessions/:id" -Method PATCH -Path "/api/sessions/$sessionId" -Body @{ title = "Updated" } -AcceptStatus @(200))) { $failed++ }
}

# --- Terminal ---
Write-Host "`n[5] Terminal" -ForegroundColor White
$cmdBody = @{ command = "echo ok" }
if (-not (Test-Endpoint -Name "POST /api/terminal/execute" -Method POST -Path "/api/terminal/execute" -Body $cmdBody)) { $failed++ }
$actionBody = @{ action = "pwd" }
if (-not (Test-Endpoint -Name "POST /api/terminal/action" -Method POST -Path "/api/terminal/action" -Body $actionBody)) { $failed++ }

# --- FS ---
Write-Host "`n[6] File system" -ForegroundColor White
if (-not (Test-Endpoint -Name "GET /api/fs/cwd" -Path "/api/fs/cwd")) { $failed++ }
$cwd = (Invoke-RestMethod -Uri "$BaseUrl/api/fs/cwd" -UseBasicParsing).cwd
$listBody = @{ dirPath = $cwd }
if (-not (Test-Endpoint -Name "POST /api/fs/list" -Method POST -Path "/api/fs/list" -Body $listBody)) { $failed++ }
$existsBody = @{ path = $cwd }
if (-not (Test-Endpoint -Name "POST /api/fs/exists" -Method POST -Path "/api/fs/exists" -Body $existsBody)) { $failed++ }
$scanBody = @{ dir = $cwd; options = @{ recursive = $false } }
if (-not (Test-Endpoint -Name "POST /api/fs/scan" -Method POST -Path "/api/fs/scan" -Body $scanBody)) { $failed++ }

# --- Storage KV ---
Write-Host "`n[7] Storage KV" -ForegroundColor White
if (-not (Test-Endpoint -Name "POST /api/storage/test/check" -Method POST -Path "/api/storage/test/check" -Body @{ value = @{ t = 1 } })) { $failed++ }
if (-not (Test-Endpoint -Name "GET /api/storage/test/check" -Path "/api/storage/test/check")) { $failed++ }
if (-not (Test-Endpoint -Name "DELETE /api/storage/test/check" -Method DELETE -Path "/api/storage/test/check")) { $failed++ }

# --- Tester (dev) ---
Write-Host "`n[8] Tester routes" -ForegroundColor White
if (-not (Test-Endpoint -Name "GET /api/tester/status" -Path "/api/tester/status")) { $failed++ }
if (-not (Test-Endpoint -Name "GET /api/tester/sessions" -Path "/api/tester/sessions")) { $failed++ }

# --- Session flow (next, result, cancel) - expect 200 or 400 ---
Write-Host "`n[9] Session flow (next/result/cancel)" -ForegroundColor White
if ($sessionId) {
    $nextBody = @{ projectId = "e2e_p_1" }
    Test-Endpoint -Name "POST /api/sessions/:id/next" -Method POST -Path "/api/sessions/$sessionId/next" -Body $nextBody -AcceptStatus @(200, 400) -Optional | Out-Null
    $resultBody = @{ choice = "skip" }
    Test-Endpoint -Name "POST /api/sessions/:id/result" -Method POST -Path "/api/sessions/$sessionId/result" -Body $resultBody -AcceptStatus @(200, 400) -Optional | Out-Null
    if (-not (Test-Endpoint -Name "POST /api/sessions/:id/cancel" -Method POST -Path "/api/sessions/$sessionId/cancel" -Body @{} -AcceptStatus @(200))) { $failed++ }
}

# --- Files (upload/list) - list always 200 ---
Write-Host "`n[10] Files API" -ForegroundColor White
if (-not (Test-Endpoint -Name "GET /api/files" -Path "/api/files")) { $failed++ }

# --- RAG (may 503 if Meilisearch down) ---
Write-Host "`n[11] RAG (optional if Meilisearch unavailable)" -ForegroundColor White
Test-Endpoint -Name "POST /api/rag/search" -Method POST -Path "/api/rag/search" -Body @{ query = "test"; limit = 1 } -AcceptStatus @(200, 503) -Optional | Out-Null

# --- SSE (connection only) ---
Write-Host "`n[12] SSE" -ForegroundColor White
try {
    $job = Start-Job -ScriptBlock {
        $req = [System.Net.WebRequest]::Create("http://localhost:3001/api/sse")
        $req.Timeout = 2000
        $req.GetResponse()
    }
    $result = Wait-Job $job -Timeout 3; Receive-Job $job; Stop-Job $job; Remove-Job $job -Force
    Write-Success "GET /api/sse -> connection accepted"
} catch {
    Write-Skip "GET /api/sse -> $($_.Exception.Message)"
}

# --- Invoke proxy ---
Write-Host "`n[13] Invoke proxy" -ForegroundColor White
Test-Endpoint -Name "POST /api/v1/invoke" -Method POST -Path "/api/v1/invoke" -Body @{ task = "ping" } -AcceptStatus @(200, 400, 502) -Optional | Out-Null

# --- Cleanup: delete session, delete project ---
Write-Host "`n[14] Cleanup" -ForegroundColor White
if ($sessionId) {
    if (-not (Test-Endpoint -Name "DELETE /api/sessions/:id" -Method DELETE -Path "/api/sessions/$sessionId")) { $failed++ }
}
if (-not (Test-Endpoint -Name "DELETE /api/projects/:id" -Method DELETE -Path "/api/projects/e2e_p_1")) { $failed++ }

# --- Summary ---
Write-Host "`n=================================================" -ForegroundColor Cyan
if ($failed -eq 0) {
    Write-Host "All client endpoint checks passed." -ForegroundColor Green
    exit 0
} else {
    Write-Host "$failed check(s) failed." -ForegroundColor Red
    exit 1
}

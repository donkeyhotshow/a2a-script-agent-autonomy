<#
.SYNOPSIS
    Test dialog chain via Client API -> a2a-server. No mocks.
.DESCRIPTION
    Verifies: task -> choices -> choice dialog -> input form -> message -> message.
    Requires: Client API (5173), a2a-server (3000) running.
.EXAMPLE
    .\tests\direct-tests\test-dialog-flow.ps1
    .\tests\direct-tests\test-dialog-flow.ps1 -ClientPort 5173 -ServerPort 3000
#>
param(
    [int]$ClientPort = 5173,
    [int]$ServerPort = 3000,
    [int]$PollIntervalSec = 2,
    [int]$MaxPolls = 30
)

$ErrorActionPreference = "Stop"
$ClientUrl = "http://localhost:$ClientPort"
$ServerUrl = "http://localhost:$ServerPort"
$SessionHeader = @{ "X-Session-Id" = "dialog-test"; "Content-Type" = "application/json" }

function Write-Step($num, $desc) {
    Write-Host "`n=== Step $num : $desc ===" -ForegroundColor Cyan
}
function Ok($msg) { Write-Host "  OK $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  FAIL $msg" -ForegroundColor Red; throw $msg }

function Unwrap-SessionBody($body) {
    if ($null -ne $body.session) { return $body.session }
    return $body
}

# POST /next ack uses asyncPending only (no promiseId on public DTO). Poll Client API /async then hydrate.
function Wait-ClientAsyncSettled {
    param([string]$Sid)
    for ($i = 0; $i -lt $MaxPolls; $i++) {
        $a = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$Sid/async" -Headers $SessionHeader -TimeoutSec 15
        if (-not $a.asyncPending) { return }
        Start-Sleep -Seconds $PollIntervalSec
    }
    Fail "Client /async poll timeout"
}

function After-NextHydrate {
    param($ack, [string]$Sid)
    if ($ack.asyncPending) {
        Wait-ClientAsyncSettled -Sid $Sid
    }
    $raw = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$Sid" -Headers $SessionHeader -TimeoutSec 15
    return (Unwrap-SessionBody $raw)
}

# Pre-flight: health checks
Write-Host "`n=== Pre-flight ===" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "$ClientUrl/api/a2a/projects" -TimeoutSec 5 | Out-Null
    Ok "Client API ($ClientPort)"
} catch { Fail "Client API not reachable: $ClientUrl" }

try {
    Invoke-RestMethod -Uri "$ServerUrl/health" -TimeoutSec 5 | Out-Null
    Ok "a2a-server ($ServerPort)"
} catch { Fail "a2a-server not reachable: $ServerUrl" }

# Step 1: Create session (sync) -> get initial form
Write-Step 1 "Create session -> get initial form"

$body1 = '{"title":"Dialog Test","task":"dialog"}'
$r1 = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions" -Method POST -Body $body1 -Headers $SessionHeader -TimeoutSec 15

$sessionId = $r1.session.id
if (-not $sessionId) { Fail "No session id" }
Ok "Session: $sessionId"

# Sync response - check session.execute for input form
if (-not $r1.session.execute.form.input) { Fail "No execute.form.input in sync response" }
Ok "execute.form.input found - initial form received"

# Step 1b: Send task via /next to trigger server routing
Write-Step 1b "Send task via /next to get router"

$body1b = '{"result":{"message":"dialog"}}'
$r1b = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId/next" -Method POST -Body $body1b -Headers $SessionHeader -TimeoutSec 15
$s1b = After-NextHydrate -ack $r1b -Sid $sessionId
if (-not $s1b.execute.form.choices) { Fail "No execute.form.choices after /next" }
if ($s1b.execute.form.choices.Count -lt 2) { Fail "Expected at least 2 choices" }
Ok "execute.form.choices ($($s1b.execute.form.choices.Count) items)"

# Step 2: choice "dialog" -> expect input form
Write-Step 2 "Select choice 'dialog' -> expect input form"

$body2 = '{"result":{"choice":"dialog"}}'
$r2 = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId/next" -Method POST -Body $body2 -Headers $SessionHeader -TimeoutSec 15
$s2 = After-NextHydrate -ack $r2 -Sid $sessionId
# Dialog pipeline may still be writing the step; retry hydrate (async race or slow LLM).
$waitInputDeadline = (Get-Date).AddSeconds(45)
while ((-not $s2.execute.form.input) -and (Get-Date) -lt $waitInputDeadline) {
    Start-Sleep -Seconds 2
    $raw2 = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId" -Headers $SessionHeader -TimeoutSec 15
    $s2 = Unwrap-SessionBody $raw2
}
if (-not $s2.execute.form.input) { Fail "No execute.form.input" }
$inputField = $s2.execute.form.input
if ($inputField -is [array]) {
    if ($inputField.Count -eq 0) { Fail "Form input array empty" }
    $inputField = $inputField[0]
} else {
    if (-not $inputField.name) { Fail "Form input missing name" }
}
Ok "execute.form.input"

# Step 3: message "hello world" -> expect response + form
Write-Step 3 "Send message 'hello world' -> expect response"

$body3 = '{"result":{"message":"hello world"}}'
$r3 = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId/next" -Method POST -Body $body3 -Headers $SessionHeader -TimeoutSec 15
$s3 = After-NextHydrate -ack $r3 -Sid $sessionId
$hasUserHello = $false
if ($null -ne $s3.messages) {
    foreach ($m in $s3.messages) {
        if ($m.role -eq 'user' -and $m.content -match 'hello world') { $hasUserHello = $true; break }
    }
}
if (-not $hasUserHello) { Fail "Step 3: expected user message containing hello world" }
Ok "Step 3 completed"

# Step 4: message "Thanks!" -> expect completed
Write-Step 4 "Send message 'Thanks!' -> expect completed"

$body4 = '{"result":{"message":"Thanks!"}}'
$r4 = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId/next" -Method POST -Body $body4 -Headers $SessionHeader -TimeoutSec 15
$s4 = After-NextHydrate -ack $r4 -Sid $sessionId
$hasThanks = $false
if ($null -ne $s4.messages) {
    foreach ($m in $s4.messages) {
        if ($m.role -eq 'user' -and $m.content -match 'Thanks') { $hasThanks = $true; break }
    }
}
if (-not $hasThanks) { Fail "Step 4: expected user message Thanks" }
Ok "Step 4 completed"

Write-Host "`n=== All steps passed ===" -ForegroundColor Green

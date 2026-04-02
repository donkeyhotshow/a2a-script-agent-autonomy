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

function Invoke-PollResult {
    param([string]$PromiseId)
    for ($i = 0; $i -lt $MaxPolls; $i++) {
        Start-Sleep -Seconds $PollIntervalSec
        try {
            $r = Invoke-RestMethod -Uri "$ServerUrl/api/v1/requests/$PromiseId/result" -Headers @{ "x-skip-auth" = "true" } -TimeoutSec 10
            if ($r.data.status -eq "completed") {
                # Server responses expose `execute` at `data.execute` (not `data.result.execute`)
                if ($null -ne $r.data.result) {
                    return $r.data.result
                }
                return $r.data
            }
            if ($r.data.status -eq "failed") {
                $err = $null
                if ($null -ne $r.data.result -and $null -ne $r.data.result.error) {
                    $err = $r.data.result.error
                } elseif ($null -ne $r.data.error) {
                    $err = $r.data.error
                } else {
                    $err = $r.data.message
                }
                Fail "Request failed: $err"
            }
        } catch {
            Write-Host "  Poll $i : $($_.Exception.Message)" -ForegroundColor Gray
        }
    }
    Fail "Poll timeout"
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

# Check for async response
$prom1b = $r1b.asyncPending
if ($prom1b) {
    Ok "Async pending, waiting for completion..."
    # Wait for async to complete - poll the async endpoint
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 2
        $asyncCheck = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId/async" -Headers $SessionHeader -TimeoutSec 15
        if (-not $asyncCheck.asyncPending) {
            Ok "Async completed"
            break
        }
    }
    # Get the updated session
    $r1b = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId" -Headers $SessionHeader -TimeoutSec 15
}

if (-not $r1b.execute.form.choices) { Fail "No execute.form.choices after /next" }
if ($r1b.execute.form.choices.Count -lt 2) { Fail "Expected at least 2 choices" }
Ok "execute.form.choices ($($r1b.execute.form.choices.Count) items)"

# Step 2: choice "dialog" -> expect input form
Write-Step 2 "Select choice 'dialog' -> expect input form"

$body2 = '{"result":{"choice":"dialog"}}'
$r2 = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId/next" -Method POST -Body $body2 -Headers $SessionHeader -TimeoutSec 15

$prom2 = $r2.promiseId
if (-not $prom2) { Fail "No promiseId in step 2" }

$result2 = Invoke-PollResult -PromiseId $prom2
if (-not $result2.execute.form.input) { Fail "No execute.form.input" }
$inputField = $result2.execute.form.input
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

$prom3 = $r3.promiseId
if (-not $prom3) { Fail "No promiseId in step 3" }

$result3 = Invoke-PollResult -PromiseId $prom3
if ($result3.outcome -eq "failed") { Fail "Step 3 failed: $($result3.error)" }
Ok "Step 3 completed (outcome: $($result3.outcome))"

# Step 4: message "Thanks!" -> expect completed
Write-Step 4 "Send message 'Thanks!' -> expect completed"

$body4 = '{"result":{"message":"Thanks!"}}'
$r4 = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId/next" -Method POST -Body $body4 -Headers $SessionHeader -TimeoutSec 15

$prom4 = $r4.promiseId
if (-not $prom4) { Fail "No promiseId in step 4" }

$result4 = Invoke-PollResult -PromiseId $prom4
if ($result4.outcome -eq "failed") { Fail "Step 4 failed: $($result4.error)" }
Ok "Step 4 completed (outcome: $($result4.outcome))"

Write-Host "`n=== All steps passed ===" -ForegroundColor Green

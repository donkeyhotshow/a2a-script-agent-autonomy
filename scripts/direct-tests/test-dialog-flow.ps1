<#
.SYNOPSIS
    Test dialog chain via Client API -> a2a-server. No mocks.
.DESCRIPTION
    Verifies: task -> choices -> choice dialog -> input form -> message -> message.
    Requires: Client API (3001), a2a-server (3000) running.
.EXAMPLE
    .\scripts\direct-tests\test-dialog-flow.ps1
    .\scripts\direct-tests\test-dialog-flow.ps1 -ClientPort 3001 -ServerPort 3000
#>
param(
    [int]$ClientPort = 3001,
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
                return $r.data.result
            }
            if ($r.data.status -eq "failed") {
                Fail "Request failed: $($r.data.result.error)"
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
    Invoke-RestMethod -Uri "$ClientUrl/health" -TimeoutSec 5 | Out-Null
    Ok "Client API ($ClientPort)"
} catch { Fail "Client API not reachable: $ClientUrl" }

try {
    Invoke-RestMethod -Uri "$ServerUrl/health" -TimeoutSec 5 | Out-Null
    Ok "a2a-server ($ServerPort)"
} catch { Fail "a2a-server not reachable: $ServerUrl" }

# Step 1: Create session with task "диалог" -> expect router (execute.form.choices)
Write-Step 1 "Create session with task 'диалог' -> expect router"

$body1 = '{"title":"Dialog Test","task":"диалог"}'
$r1 = Invoke-RestMethod -Uri "$ClientUrl/api/sessions" -Method POST -Body $body1 -Headers $SessionHeader -TimeoutSec 15

$sessionId = $r1.data.id
if (-not $sessionId) { Fail "No session id" }
Ok "Session: $sessionId"

$prom1 = $r1.serverResponse.data.promiseId
if (-not $prom1) { Fail "No promiseId in step 1" }

$result1 = Invoke-PollResult -PromiseId $prom1
if (-not $result1.execute.form.choices) { Fail "No execute.form.choices" }
if ($result1.execute.form.choices.Count -lt 2) { Fail "Expected at least 2 choices" }
Ok "execute.form.choices ($($result1.execute.form.choices.Count) items)"

# Step 2: choice "dialog" -> expect input form
Write-Step 2 "Select choice 'dialog' -> expect input form"

$body2 = '{"choice":"dialog","input":{}}'
$r2 = Invoke-RestMethod -Uri "$ClientUrl/api/sessions/$sessionId/action" -Method POST -Body $body2 -Headers $SessionHeader -TimeoutSec 15

$prom2 = $r2.promiseId
if (-not $prom2) { Fail "No promiseId in step 2" }

$result2 = Invoke-PollResult -PromiseId $prom2
if (-not $result2.execute.form.input) { Fail "No execute.form.input" }
$inputField = $result2.execute.form.input
if ($inputField -is [array]) {
    if ($inputField.Count -eq 0) { Fail "Form input array empty" }
} else {
    if (-not $inputField.name) { Fail "Form input missing name" }
}
Ok "execute.form.input"

# Step 3: message "hello world" -> expect response + form
Write-Step 3 "Send message 'hello world' -> expect response"

$body3 = '{"result":{"message":"hello world"}}'
$r3 = Invoke-RestMethod -Uri "$ClientUrl/api/sessions/$sessionId/next" -Method POST -Body $body3 -Headers $SessionHeader -TimeoutSec 15

$prom3 = $r3.promiseId
if (-not $prom3) { Fail "No promiseId in step 3" }

$result3 = Invoke-PollResult -PromiseId $prom3
if ($result3.outcome -eq "failed") { Fail "Step 3 failed: $($result3.error)" }
Ok "Step 3 completed (outcome: $($result3.outcome))"

# Step 4: message "Дякую!" -> expect completed
Write-Step 4 "Send message 'Дякую!' -> expect completed"

$body4 = '{"result":{"message":"Дякую!"}}'
$r4 = Invoke-RestMethod -Uri "$ClientUrl/api/sessions/$sessionId/next" -Method POST -Body $body4 -Headers $SessionHeader -TimeoutSec 15

$prom4 = $r4.promiseId
if (-not $prom4) { Fail "No promiseId in step 4" }

$result4 = Invoke-PollResult -PromiseId $prom4
if ($result4.outcome -eq "failed") { Fail "Step 4 failed: $($result4.error)" }
Ok "Step 4 completed (outcome: $($result4.outcome))"

Write-Host "`n=== All steps passed ===" -ForegroundColor Green

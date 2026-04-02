<#
.SYNOPSIS
    Drive an agent run through the Client API session flow (default).
.DESCRIPTION
    Default (normative): Client API session flow (same surface as the Web UI):
      POST /api/a2a/sessions (mode agent + task)
      -> inspect GET /sessions/:id (router / task form)
      -> POST /next (message or choice per execute.form)
      -> poll GET /async until settled

    Optional (debug-only): bypass sessions and call A2A Server directly:
      POST /api/v1/invoke -> poll GET /api/v1/requests/{id}/result until completed.
.EXAMPLE
    .\scripts\direct-tests\server-invoke-agent.ps1 -Task "List repo files"
.EXAMPLE
    .\scripts\direct-tests\server-invoke-agent.ps1 -UseDirectServer -Task "List repo files"
#>
param(
    [int]$ClientPort = 5173,
    [int]$ServerPort = 3000,
    [switch]$UseDirectServer,
    [string]$Task = "List the top-level files in the repository root.",
    [int]$PollIntervalSec = 2,
    [int]$MaxPolls = 180
)

$ErrorActionPreference = "Stop"
$ClientUrl = "http://localhost:$ClientPort"
$ServerUrl = "http://localhost:$ServerPort"

function Poll-ServerDirect {
    param([string]$promiseId)
    Write-Host "`n=== Poll (server direct) ===" -ForegroundColor Cyan
    for ($i = 0; $i -lt $MaxPolls; $i++) {
        Start-Sleep -Seconds $PollIntervalSec
        $r = Invoke-RestMethod -Uri "$ServerUrl/api/v1/requests/$promiseId/result" -Headers @{ "x-skip-auth" = "true" } -TimeoutSec 60
        if ($r.data.status -eq "completed") {
            Write-Host "  completed" -ForegroundColor Green
            $r.data | ConvertTo-Json -Depth 50
            exit 0
        }
        if ($r.data.status -eq "failed") {
            Write-Host "  failed" -ForegroundColor Red
            $r.data | ConvertTo-Json -Depth 50
            exit 1
        }
        Write-Host "  pending ($i)" -ForegroundColor Gray
    }
    throw "Poll timeout"
}

function Poll-ClientApiAsync {
    param([string]$sessionId, [hashtable]$Headers)
    Write-Host "`n=== Poll (Client API /async) ===" -ForegroundColor Cyan
    for ($i = 0; $i -lt $MaxPolls; $i++) {
        Start-Sleep -Seconds $PollIntervalSec
        $r = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId/async" -Method GET -Headers $Headers -TimeoutSec 60
        $done =
            ($r.asyncPending -eq $false) -or
            ($r.completed -eq $true) -or
            ($r.status -eq "completed") -or
            ($r.status -eq "done")
        if ($done) {
            Write-Host "  settled ($i) status=$($r.status) asyncPending=$($r.asyncPending)" -ForegroundColor Green
            return
        }
        Write-Host "  pending ($i)" -ForegroundColor Gray
    }
    throw "Poll timeout (increase -MaxPolls if the model is slow; default 180 ~6 min at 2s interval)"
}

function Get-SessionSnapshot {
    param([string]$sessionId, [hashtable]$Headers)
    return Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId" -Method GET -Headers $Headers -TimeoutSec 60
}

function Has-Choices($execute) {
    return ($null -ne $execute -and $null -ne $execute.form -and $null -ne $execute.form.choices -and $execute.form.choices.Count -gt 0)
}

function Pick-AgentChoiceId($choices) {
    if ($null -eq $choices -or $choices.Count -eq 0) { return $null }
    foreach ($c in $choices) { if ($c.id -eq "agent") { return "agent" } }
    foreach ($c in $choices) { if ($c.id) { return $c.id } }
    return $null
}

if ($UseDirectServer) {
    Write-Host "`n=== Invoke (server direct; debug-only) ===" -ForegroundColor Yellow
} else {
    Write-Host "`n=== Session (Client API; normative) ===" -ForegroundColor Cyan
}

$payload = @{
    context = @{
        execution = @{ action = "agent"; step = "new" }
        task      = $Task
    }
    task = $Task
} | ConvertTo-Json -Depth 20

if ($UseDirectServer) {
    $invoke = Invoke-RestMethod -Uri "$ServerUrl/api/v1/invoke" -Method POST -Headers @{ "Content-Type" = "application/json"; "x-skip-auth" = "true" } -Body $payload -TimeoutSec 60
    $promiseId = $invoke.data.promiseId
    if (-not $promiseId) { throw "No promiseId in invoke response" }
    Write-Host "  promiseId: $promiseId" -ForegroundColor Green
    Poll-ServerDirect -promiseId $promiseId
    exit 0
}

$hdr = @{ "Content-Type" = "application/json"; "X-Session-Id" = "agent-invoke-test" }

$createBody = @{
    title = "Agent invoke test"
    mode  = "agent"
    task  = $Task
} | ConvertTo-Json -Depth 10

$sess = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions" -Method POST -Headers $hdr -Body $createBody -TimeoutSec 60
$sessionId = $null
if ($sess.session -and $sess.session.id) { $sessionId = $sess.session.id }
elseif ($sess.id) { $sessionId = $sess.id }
if (-not $sessionId) { throw "No session id in create response" }
Write-Host "  sessionId: $sessionId" -ForegroundColor Green

# Beat 1: if UI shows task input form, submit task as message (same as test-dialog-flow / test-agent-flow).
$snap = Get-SessionSnapshot -sessionId $sessionId -Headers $hdr
$exec = $snap.execute
if ($null -ne $exec -and $null -ne $exec.form -and $null -ne $exec.form.input) {
    Write-Host "  step: submit task into execute.form.input" -ForegroundColor Gray
    $nextBody = @{ result = @{ message = $Task } } | ConvertTo-Json -Depth 10
    Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId/next" -Method POST -Headers $hdr -Body $nextBody -TimeoutSec 60 | Out-Null
    Poll-ClientApiAsync -sessionId $sessionId -Headers $hdr
    $snap = Get-SessionSnapshot -sessionId $sessionId -Headers $hdr
    $exec = $snap.execute
}

# Beat 2: optional router choices (keyword router may still appear).
if (Has-Choices $exec) {
    $choiceId = Pick-AgentChoiceId -choices $exec.form.choices
    if (-not $choiceId) { throw "Router form has choices but no usable id" }
    Write-Host "  step: router choice -> $choiceId" -ForegroundColor Gray
    $nextBody = @{ result = @{ choice = $choiceId } } | ConvertTo-Json -Depth 10
    Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId/next" -Method POST -Headers $hdr -Body $nextBody -TimeoutSec 60 | Out-Null
    Poll-ClientApiAsync -sessionId $sessionId -Headers $hdr
}

Write-Host "`n=== Session snapshot ===" -ForegroundColor Cyan
$final = Get-SessionSnapshot -sessionId $sessionId -Headers $hdr
$final | ConvertTo-Json -Depth 50
exit 0

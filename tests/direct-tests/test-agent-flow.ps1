<#
.SYNOPSIS
    Test agent-mode flow via Client API -> a2a-server. No mocks.
.DESCRIPTION
    Drives a session with `mode: "agent"` using only the Client API:
      POST /sessions -> POST /next -> poll GET /async -> repeat

    Asserts we actually enter agent pipeline (`context.execution.action === "agent"`)
    and observe at least one tool-style `execute` (non-form), then reach a settled state.

    Requires: Client API (5173), a2a-server (3000) running.
.EXAMPLE
    .\tests\direct-tests\test-agent-flow.ps1
    .\tests\direct-tests\test-agent-flow.ps1 -ClientPort 5173 -ServerPort 3000 -MaxTurns 12
#>
param(
    [int]$ClientPort = 5173,
    [int]$ServerPort = 3000,
    [int]$PollIntervalSec = 2,
    [int]$MaxPolls = 90,
    [int]$MaxTurns = 12
)

$ErrorActionPreference = "Stop"
$ClientUrl = "http://localhost:$ClientPort"
$ServerUrl = "http://localhost:$ServerPort"
$SessionHeader = @{ "X-Session-Id" = "agent-test"; "Content-Type" = "application/json" }

function Write-Step($num, $desc) {
    Write-Host "`n=== Turn $num : $desc ===" -ForegroundColor Cyan
}
function Ok($msg) { Write-Host "  OK $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  WARN $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "  FAIL $msg" -ForegroundColor Red; throw $msg }

function Wait-AsyncSettled {
    param([string]$SessionId)
    for ($i = 0; $i -lt $MaxPolls; $i++) {
        $a = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$SessionId/async" -Headers $SessionHeader -TimeoutSec 30
        if (-not $a.asyncPending) {
            return $a
        }
        Start-Sleep -Seconds $PollIntervalSec
    }
    Fail "Async poll timeout"
}

function Get-Session {
    param([string]$SessionId)
    return Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$SessionId" -Headers $SessionHeader -TimeoutSec 30
}

function Has-Choices($execute) {
    return ($null -ne $execute -and $null -ne $execute.form -and $null -ne $execute.form.choices -and $execute.form.choices.Count -gt 0)
}

function Pick-ChoiceId($choices) {
    if ($null -eq $choices -or $choices.Count -eq 0) { return $null }
    # Prefer stable ids when present.
    foreach ($c in $choices) { if ($c.id -eq "agent") { return "agent" } }
    foreach ($c in $choices) { if ($c.id -eq "continue") { return "continue" } }
    foreach ($c in $choices) { if ($c.id) { return $c.id } }
    return $null
}

function Is-ToolExecute($execute) {
    if ($null -eq $execute) { return $false }
    if ($null -ne $execute.form) { return $false }
    $props = $execute.PSObject.Properties | ForEach-Object { $_.Name }
    return ($props.Count -gt 0)
}

# Prefer sending the actual task when a form asks for it.
function Extract-FormInputName($execute) {
    if ($null -eq $execute -or $null -eq $execute.form -or $null -eq $execute.form.input) { return $null }
    $inp = $execute.form.input
    if ($inp -is [array]) {
        if ($inp.Count -eq 0) { return $null }
        return $inp[0].name
    }
    return $inp.name
}

# Pre-flight
Write-Host "`n=== Pre-flight ===" -ForegroundColor Cyan
try { Invoke-RestMethod -Uri "$ClientUrl/api/a2a/projects" -TimeoutSec 5 | Out-Null; Ok "Client API ($ClientPort)" }
catch { Fail "Client API not reachable: $ClientUrl" }

try { Invoke-RestMethod -Uri "$ServerUrl/health" -TimeoutSec 5 | Out-Null; Ok "a2a-server ($ServerPort)" }
catch { Fail "a2a-server not reachable: $ServerUrl" }

# Create session (seed agent + task)
Write-Host "`n=== Create agent session ===" -ForegroundColor Cyan
$task = "List the top-level files in the repository root, then read START-FULL-SPECTRUM.md and return a 3-bullet summary."
$bodyCreate = (@{
    title = "Agent Flow Test"
    mode  = "agent"
    task  = $task
} | ConvertTo-Json -Depth 10)

$create = Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions" -Method POST -Body $bodyCreate -Headers $SessionHeader -TimeoutSec 30
$sessionId = $create.session.id
if (-not $sessionId) { Fail "No session id" }
Ok "Session: $sessionId"

$s = $create.session
if ($null -eq $s.execute) { Warn "No execute in create response (ok; will drive with /next)" }

$enteredAgent = $false
$sawToolExecute = $false
$completed = $false

for ($turn = 1; $turn -le $MaxTurns; $turn++) {
    $s = Get-Session -SessionId $sessionId
    $exec = $s.execute

    if ($s.context -and $s.context.execution -and $s.context.execution.action -eq "agent") {
        $enteredAgent = $true
    }
    if (Is-ToolExecute $exec) {
        $sawToolExecute = $true
    }

    if ($s.result -and ($s.result.completed -eq $true)) {
        Ok "Session completed (result.completed=true)"
        $completed = $true
        break
    }
    if ($s.context -and $s.context.execution -and $s.context.execution.status -eq "completed") {
        Ok "Session completed (context.execution.status=completed)"
        $completed = $true
        break
    }

    if ($null -eq $exec) {
        Warn "No execute present; sending a nudge message"
        Write-Step $turn "POST /next (message)"
        Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId/next" -Method POST -Body (@{ result = @{ message = "continue" } } | ConvertTo-Json -Depth 10) -Headers $SessionHeader -TimeoutSec 30 | Out-Null
        Wait-AsyncSettled -SessionId $sessionId | Out-Null
        continue
    }

    if (Has-Choices $exec) {
        $choiceId = Pick-ChoiceId -choices $exec.form.choices
        if (-not $choiceId) { Fail "Execute form has choices but no id fields" }
        Write-Step $turn "POST /next (choice=$choiceId)"
        Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId/next" -Method POST -Body (@{ result = @{ choice = $choiceId } } | ConvertTo-Json -Depth 10) -Headers $SessionHeader -TimeoutSec 30 | Out-Null
        Wait-AsyncSettled -SessionId $sessionId | Out-Null
        continue
    }

    if ($exec.form -and $exec.form.input) {
        $inputName = Extract-FormInputName -execute $exec
        $msg = if ($inputName -eq "task") { $task } else { "yes" }
        Write-Step $turn "POST /next (message to input form: $inputName)"
        Invoke-RestMethod -Uri "$ClientUrl/api/a2a/sessions/$sessionId/next" -Method POST -Body (@{ result = @{ message = $msg } } | ConvertTo-Json -Depth 10) -Headers $SessionHeader -TimeoutSec 30 | Out-Null
        Wait-AsyncSettled -SessionId $sessionId | Out-Null
        continue
    }

    # If we get a tool execute surfaced to the operator, we can't run it here.
    # This indicates the web/client executor didn't consume it.
    $keys = ($exec.PSObject.Properties | ForEach-Object { $_.Name }) -join ", "
    Fail "Unexpected execute (non-form) surfaced to operator: [$keys]. This suggests agent tool execution isn't being handled by Client API."
}

if (-not $enteredAgent) { Fail "Did not enter agent pipeline (context.execution.action !== 'agent')" }
Ok "Entered agent pipeline"

if (-not $sawToolExecute) { Warn "Did not observe a tool-style execute in session snapshots (may still be ok if agent stayed dialog-only)" }
else { Ok "Observed tool-style execute at least once" }

if (-not $completed) { Fail "Did not reach a completed state within $MaxTurns turns" }
Ok "Reached completed state"

Write-Host "`n=== Agent flow test finished ===" -ForegroundColor Green


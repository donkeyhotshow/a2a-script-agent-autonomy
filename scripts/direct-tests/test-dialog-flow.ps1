# Test script for dialog simulation flow
# Verifies protocol compliance with simulations/dialog/*.json

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3001"

function Write-Step($num, $desc) {
    Write-Host "`n=== Step $num : $desc ===" -ForegroundColor Cyan
}

# Create test project first
function Ensure-TestProject($projectId) {
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/projects/$projectId" -Method GET | Out-Null
        Write-Host "  Using existing project: $projectId" -ForegroundColor Gray
    } catch {
        # Create project
        $body = @{ id = $projectId; name = "Test Dialog Project"; path = "C:\\temp\\$projectId" } | ConvertTo-Json -Depth 3
        Invoke-RestMethod -Uri "$baseUrl/api/projects" -Method POST -Body $body -ContentType "application/json" | Out-Null
        Write-Host "  Created test project: $projectId" -ForegroundColor Gray
    }
}

function Test-Response($actual, $expectedPath, $fields) {
    $expectedJson = Get-Content $expectedPath -Raw
    $expected = $expectedJson | ConvertFrom-Json

    foreach ($field in $fields) {
        $parts = $field.Split(".")
        $actualVal = $actual
        $expectedVal = $expected

        foreach ($part in $parts) {
            if ($actualVal -is [PSCustomObject]) {
                $actualVal = $actualVal.$part
            } else {
                $actualVal = $null
            }
            if ($expectedVal -is [PSCustomObject]) {
                $expectedVal = $expectedVal.$part
            } else {
                $expectedVal = $null
            }
        }

        if ($actualVal -eq $null -and $expectedVal -ne $null) {
            Write-Host "  FAIL: Missing field $field" -ForegroundColor Red
            return $false
        }

        if ($field -eq "execute.form.choices" -or $field -eq "execute.form.input") {
            $actualCount = if ($actualVal -is [array]) { $actualVal.Count } else { 0 }
            $expectedCount = if ($expectedVal -is [array]) { $expectedVal.Count } else { 0 }
            if ($actualCount -ne $expectedCount) {
                Write-Host "  FAIL: $field count mismatch (got $actualCount, expected $expectedCount)" -ForegroundColor Red
                return $false
            }
        }
    }

    Write-Host "  PASS: All fields match" -ForegroundColor Green
    return $true
}

# Ensure test project exists
Ensure-TestProject "test_dialog_123"

# Step 1: Create session with task "dialog"
Write-Step 1 "Create session with task 'dialog' -> expect input form directly"

$step1Body = @{ task = "dialog"; projectId = "test_dialog_123" } | ConvertTo-Json -Depth 5
$step1Response = Invoke-RestMethod -Uri "$baseUrl/api/sessions" -Method POST -Body $step1Body -ContentType "application/json"

$sessionId = $step1Response.session.id
Write-Host "  Session ID: $sessionId"

# Check if sync or async response
if ($step1Response.serverResponse.data.execute) {
    Write-Host "  Sync response detected"
    # For direct dialog task, expect input form directly
    if ($step1Response.serverResponse.data.execute.form.input) {
        Write-Host "  Direct input form returned (no router)"
        Test-Response $step1Response.serverResponse.data "../../simulations/dialog/2/response.json" @(
        "context.execution.step",
        "execute.form.input"
        )
    } else {
        Write-Host "  Router form returned"
        Test-Response $step1Response.serverResponse.data "../../simulations/dialog/1/received.json" @(
        "context.execution.step",
        "execute.form.choices"
        )
    }
} else {
    Write-Host "  ASYNC: Response pending, poll for result at /api/v1/requests/$($step1Response.serverResponse.data.promiseId)/status" -ForegroundColor Yellow
    Write-Host "  SKIP: Cannot verify sync protocol compliance" -ForegroundColor Yellow
}

# Step 2: Send first message "hello world"
Write-Step 2 "Send message 'hello world' -> expect message + input form"

$step2Body = @{ result = @{ message = "hello world" }; projectId = "test_dialog_123" } | ConvertTo-Json -Depth 5
$step2Response = Invoke-RestMethod -Uri "$baseUrl/api/sessions/$sessionId/result" -Method POST -Body $step2Body -ContentType "application/json"

Test-Response $step2Response.data "../../simulations/dialog/3/response.json" @(
    "context.execution.step",
    "context.history",
    "execute.message",
    "execute.form.input"
)

# Step 3: Send message 'Thanks!' -> expect completed

$step3Body = @{ result = @{ message = "Thanks!" }; projectId = "test_dialog_123" } | ConvertTo-Json -Depth 5
$step3Response = Invoke-RestMethod -Uri "$baseUrl/api/sessions/$sessionId/result" -Method POST -Body $step3Body -ContentType "application/json"

Test-Response $step3Response.data "../../simulations/dialog/4/response.json" @(
    "context.execution.step",
    "execute"
)

Write-Host "`n=== All steps completed ===" -ForegroundColor Cyan

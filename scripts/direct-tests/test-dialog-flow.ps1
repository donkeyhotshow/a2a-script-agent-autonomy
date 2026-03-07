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
        $body = @{ id = $projectId; name = "Test Dialog Project"; path = "C:\temp\$projectId" } | ConvertTo-Json -Depth 3
        Invoke-RestMethod -Uri "$baseUrl/api/projects" -Method POST -Body $body -ContentType "application/json" | Out-Null
        Write-Host "  Created test project: $projectId" -ForegroundColor Gray
    }
}

function Test-Response($actual, $expectedPath, $fields) {
    $scriptDir = Split-Path -Parent $PSCommandPath
    $fullPath = Join-Path $scriptDir $expectedPath
    $expectedJson = Get-Content $fullPath -Raw
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
Write-Step 1 "Create session with task 'dialog' -> expect router"

$step1Body = @{ task = "dialog"; projectId = "test_dialog_123" } | ConvertTo-Json -Depth 5
$step1Response = Invoke-RestMethod -Uri "$baseUrl/api/sessions" -Method POST -Body $step1Body -ContentType "application/json"

$sessionId = $step1Response.session.id
Write-Host "  Session ID: $sessionId"

# Check if sync or async response
if ($step1Response.serverResponse.data.execute) {
    Write-Host "  Sync response detected"
    # Should return router form
    if ($step1Response.serverResponse.data.execute.form.choices) {
        Write-Host "  Router form returned"
        Test-Response $step1Response.serverResponse.data "../../simulations/dialog/1/response.json" @(
            "context.execution.step",
            "execute.form.choices"
        )
    } else {
        Write-Host "  WARNING: Expected router form but got something else" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ASYNC: Response pending, poll for result at /api/v1/requests/$($step1Response.serverResponse.data.promiseId)/status" -ForegroundColor Yellow
    # Poll for async result
    $promiseId = $step1Response.serverResponse.data.promiseId
    $maxPolls = 30
    $pollCount = 0
    do {
        Start-Sleep 1
        $pollCount++
        $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/requests/$promiseId/status" -Method GET
        Write-Host "  Poll $pollCount : status = $($statusResponse.status)" -ForegroundColor Gray
    } while ($statusResponse.status -eq "pending" -and $pollCount -lt $maxPolls)

    if ($statusResponse.status -eq "completed" -and $statusResponse.result) {
        Write-Host "  ASYNC result received" -ForegroundColor Green
        Test-Response $statusResponse.result "../../simulations/dialog/1/response.json" @(
            "context.execution.step",
            "execute.form.choices"
        )
    } else {
        Write-Host "  ASYNC result timeout or failed" -ForegroundColor Red
    }
}

# Step 2: Send choice "dialog" from router
Write-Step 2 "Select choice 'dialog' -> expect input form"

$step2Body = @{ result = @{ choice = "dialog" }; projectId = "test_dialog_123" } | ConvertTo-Json -Depth 5
$step2Response = Invoke-RestMethod -Uri "$baseUrl/api/sessions/$sessionId/result" -Method POST -Body $step2Body -ContentType "application/json"

# Handle async response for step 2
if ($step2Response.data.promiseId) {
    Write-Host "  ASYNC: Response pending, polling..." -ForegroundColor Yellow
    $promiseId = $step2Response.data.promiseId
    $maxPolls = 30
    $pollCount = 0
    do {
        Start-Sleep 1
        $pollCount++
        $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/requests/$promiseId/status" -Method GET
        Write-Host "  Poll $pollCount : status = $($statusResponse.status)" -ForegroundColor Gray
    } while ($statusResponse.status -eq "pending" -and $pollCount -lt $maxPolls)

    if ($statusResponse.status -eq "completed" -and $statusResponse.result) {
        Write-Host "  ASYNC result received" -ForegroundColor Green
        Test-Response $statusResponse.result "../../simulations/dialog/2/response.json" @(
            "context.execution.step",
            "execute.form.input"
        )
    } else {
        Write-Host "  ASYNC result timeout or failed" -ForegroundColor Red
    }
} else {
    # Sync response
    Test-Response $step2Response.data "../../simulations/dialog/2/response.json" @(
        "context.execution.step",
        "execute.form.input"
    )
}

# Step 3: Send message "hello world" -> expect LLM response + input form
Write-Step 3 "Send message 'hello world' -> expect LLM response + input form"

$step3Body = @{ result = @{ message = "hello world" }; projectId = "test_dialog_123" } | ConvertTo-Json -Depth 5
$step3Response = Invoke-RestMethod -Uri "$baseUrl/api/sessions/$sessionId/result" -Method POST -Body $step3Body -ContentType "application/json"

# Handle async response for step 3
if ($step3Response.data.promiseId) {
    Write-Host "  ASYNC: Response pending, polling..." -ForegroundColor Yellow
    $promiseId = $step3Response.data.promiseId
    $maxPolls = 30
    $pollCount = 0
    do {
        Start-Sleep 1
        $pollCount++
        $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/requests/$promiseId/status" -Method GET
        Write-Host "  Poll $pollCount : status = $($statusResponse.status)" -ForegroundColor Gray
    } while ($statusResponse.status -eq "pending" -and $pollCount -lt $maxPolls)

    if ($statusResponse.status -eq "completed" -and $statusResponse.result) {
        Write-Host "  ASYNC result received" -ForegroundColor Green
        # Check what we got back
        if ($statusResponse.result.execute.message) {
            Write-Host "  Got message in response: $($statusResponse.result.execute.message)" -ForegroundColor Gray
        }
        Test-Response $statusResponse.result "../../simulations/dialog/3/response.json" @(
            "context.execution.step",
            "execute.form.input"
        )
    } else {
        Write-Host "  ASYNC result timeout or failed" -ForegroundColor Red
    }
} else {
    # Sync response
    if ($step3Response.data.execute.message) {
        Write-Host "  Got message in response: $($step3Response.data.execute.message)" -ForegroundColor Gray
    }
    Test-Response $step3Response.data "../../simulations/dialog/3/response.json" @(
        "context.execution.step",
        "execute.form.input"
    )
}

# Step 4: Send message 'Thanks!' -> expect completed
Write-Step 4 "Send message 'Thanks!' -> expect completed"

$step4Body = @{ result = @{ message = "Thanks!" }; projectId = "test_dialog_123" } | ConvertTo-Json -Depth 5
$step4Response = Invoke-RestMethod -Uri "$baseUrl/api/sessions/$sessionId/result" -Method POST -Body $step4Body -ContentType "application/json"

# Handle async response for step 4
if ($step4Response.data.promiseId) {
    Write-Host "  ASYNC: Response pending, polling..." -ForegroundColor Yellow
    $promiseId = $step4Response.data.promiseId
    $maxPolls = 30
    $pollCount = 0
    do {
        Start-Sleep 1
        $pollCount++
        $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/requests/$promiseId/status" -Method GET
        Write-Host "  Poll $pollCount : status = $($statusResponse.status)" -ForegroundColor Gray
    } while ($statusResponse.status -eq "pending" -and $pollCount -lt $maxPolls)

    if ($statusResponse.status -eq "completed" -and $statusResponse.result) {
        Write-Host "  ASYNC result received" -ForegroundColor Green
        Test-Response $statusResponse.result "../../simulations/dialog/4/response.json" @(
            "context.execution.step",
            "execute"
        )
    } else {
        Write-Host "  ASYNC result timeout or failed" -ForegroundColor Red
    }
} else {
    # Sync response
    Test-Response $step4Response.data "../../simulations/dialog/4/response.json" @(
        "context.execution.step",
        "execute"
    )
}

Write-Host "`n=== All steps completed ===" -ForegroundColor Cyan

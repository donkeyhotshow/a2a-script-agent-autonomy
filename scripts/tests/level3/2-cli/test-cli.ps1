# Level 3.2: CLI Automation Tests
# Тесты CLI управления и автоматизации

param(
    [switch]$Verbose
)

function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }

Write-Info "Level 3.2: CLI Automation Tests"
Write-Info "================================"

$cliTests = @(
    @{
        Name = "CLI Status Check"
        Test = {
            $result = & "$PSScriptRoot/../../../a2a-client/tester/cli.js" status --api-url http://localhost:3001 --json 2>$null
            if ($LASTEXITCODE -ne 0) { throw "CLI status command failed" }
            Write-Info "CLI status command executed successfully"
        }
    },
    @{
        Name = "CLI Ping Test"
        Test = {
            $result = & "$PSScriptRoot/../../../a2a-client/tester/cli.js" send ping --api-url http://localhost:3001 --session cli-test-session --json 2>$null
            if ($LASTEXITCODE -ne 0) { throw "CLI ping command failed" }
            Write-Info "CLI ping command sent successfully"
        }
    },
    @{
        Name = "CLI Panel Control"
        Test = {
            $result = & "$PSScriptRoot/../../../a2a-client/tester/cli.js" panel show task-panel --api-url http://localhost:3001 --session cli-test-session --json 2>$null
            if ($LASTEXITCODE -ne 0) { throw "CLI panel control failed" }
            Write-Info "CLI panel control executed successfully"
        }
    },
    @{
        Name = "CLI Session Management"
        Test = {
            $result = & "$PSScriptRoot/../../../a2a-client/tester/cli.js" session create --title "CLI Test Session" --api-url http://localhost:3001 --session cli-session-test --json 2>$null
            if ($LASTEXITCODE -ne 0) { throw "CLI session management failed" }
            Write-Info "CLI session management executed successfully"
        }
    }
)

$results = @{}
$allPassed = $true

foreach ($test in $cliTests) {
    Write-Info "Testing CLI automation: $($test.Name)..."

    try {
        & $test.Test
        Write-Success "$($test.Name) passed"
        $results[$test.Name] = $true
    } catch {
        Write-Error "$($test.Name) failed: $($_.Exception.Message)"
        $results[$test.Name] = $false
        $allPassed = $false
    }
}

# Test automated test suite
Write-Info "Testing automated test suite..."
try {
    $testResult = & "$PSScriptRoot/../../../a2a-client/tester/cli.js" test --suite panels --api-url http://localhost:3001 --session cli-test-suite --json 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Automated test suite executed successfully"
        $results["Automated Test Suite"] = $true
    } else {
        Write-Error "Automated test suite failed"
        $results["Automated Test Suite"] = $false
        $allPassed = $false
    }
} catch {
    Write-Error "Automated test suite failed: $($_.Exception.Message)"
    $results["Automated Test Suite"] = $false
    $allPassed = $false
}

Write-Host ""
Write-Info "CLI Automation Test Summary:"
foreach ($result in $results.GetEnumerator()) {
    $status = if ($result.Value) { "✓ PASS" } else { "✗ FAIL" }
    Write-Host ("{0,-30} : {1}" -f $result.Key, $status)
}

if ($allPassed) {
    Write-Success "All Level 3.2 CLI automation tests passed!"
    exit 0
} else {
    Write-Error "Some CLI automation tests failed. Check CLI framework integration."
    exit 1
}
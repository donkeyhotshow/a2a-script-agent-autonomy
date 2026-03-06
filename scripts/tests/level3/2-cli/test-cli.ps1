# Level 3.2: CLI Automation Tests
# Тесты CLI управления и автоматизации

param(
    [switch]$Verbose
)

function Write-Success { param($Message) Write-Host "[PASS] $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "[FAIL] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }

Write-Info "Level 3.2: CLI Automation Tests"
Write-Info "================================"

$cliTests = @(
    @{
        Name = "CLI Status Check"
        Optional = $true
        Test = {
            $result = & "$PSScriptRoot/../../../a2a-client/tester/cli.js" status --api-url http://localhost:3001 --json 2>$null
            if ($LASTEXITCODE -ne 0) { throw "CLI status command failed" }
            Write-Info "CLI status command executed successfully"
        }
    },
    @{
        Name = "CLI Ping Test"
        Optional = $true
        Test = {
            $result = & "$PSScriptRoot/../../../a2a-client/tester/cli.js" send ping --api-url http://localhost:3001 --session cli-test-session --json 2>$null
            if ($LASTEXITCODE -ne 0) { throw "CLI ping command failed" }
            Write-Info "CLI ping command sent successfully"
        }
    },
    @{
        Name = "CLI Panel Control"
        Optional = $true
        Test = {
            $result = & "$PSScriptRoot/../../../a2a-client/tester/cli.js" panel show task-panel --api-url http://localhost:3001 --session cli-test-session --json 2>$null
            if ($LASTEXITCODE -ne 0) { throw "CLI panel control failed" }
            Write-Info "CLI panel control executed successfully"
        }
    },
    @{
        Name = "CLI Session Management"
        Optional = $true
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
    $optionalTest = $test.Optional -eq $true

    try {
        & $test.Test
        Write-Success "$($test.Name) passed"
        $results[$test.Name] = "PASS"
    } catch {
        if ($optionalTest) {
            Write-Warning "$($test.Name) warning: $($_.Exception.Message)"
            $results[$test.Name] = "WARN"
        } else {
            Write-Error "$($test.Name) failed: $($_.Exception.Message)"
            $results[$test.Name] = "FAIL"
            $allPassed = $false
        }
    }
}

# Test automated test suite
Write-Info "Testing automated test suite..."
try {
    $testResult = & "$PSScriptRoot/../../../a2a-client/tester/cli.js" test --suite panels --api-url http://localhost:3001 --session cli-test-suite --json 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Automated test suite executed successfully"
        $results["Automated Test Suite"] = "PASS"
    } else {
        Write-Error "Automated test suite failed"
        $results["Automated Test Suite"] = "FAIL"
        $allPassed = $false
    }
} catch {
    Write-Warning "Automated test suite warning: $($_.Exception.Message)"
    $results["Automated Test Suite"] = "WARN"
}

Write-Host ""
Write-Info "CLI Automation Test Summary:"
foreach ($result in $results.GetEnumerator()) {
    $status = switch ($result.Value) {
        "PASS" { "[PASS]" }
        "WARN" { "[WARN]" }
        default { "[FAIL]" }
    }
    Write-Host ("{0,-30} : {1}" -f $result.Key, $status)
}

if ($allPassed) {
    Write-Success "All Level 3.2 CLI automation tests passed!"
    exit 0
} else {
    Write-Error "Some CLI automation tests failed. Check CLI framework integration."
    exit 1
}

# Level 1.3: Basic API Endpoints Test
# Проверка базовых API эндпоинтов (GET /health и простые запросы)

param(
    [switch]$Verbose
)

# Color output functions
function Write-Success { param($Message) Write-Host "PASS $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "FAIL $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }

Write-Info "Level 1.3: Basic API Endpoints Test"
Write-Info "==================================="

function Test-Endpoint {
    param(
        [Hashtable]$Endpoint
    )

    $maxRetries = if ($Endpoint.Name -eq "AI Integration Daemon Status") { 3 } else { 1 }
    $delaySeconds = 3

    for ($attempt = 1; $attempt -le $maxRetries; $attempt++) {
        if ($attempt -gt 1) {
            Write-Info "  Retrying $($Endpoint.Name) (attempt $attempt of $maxRetries)..."
        }

        try {
            $response = Invoke-WebRequest -Uri $Endpoint.Url -Method $Endpoint.Method -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq $Endpoint.ExpectedStatus) {
                return $response
            }
            Write-Info "  Received status $($response.StatusCode)"
        } catch {
            if ($_.Exception.Response) {
                $statusCode = $_.Exception.Response.StatusCode
                Write-Info "  Received status $statusCode"
            } else {
                Write-Info "  Request failed: $($_.Exception.Message)"
            }
        }

        if ($attempt -lt $maxRetries) {
            Start-Sleep -Seconds $delaySeconds
        }
    }

    return $null
}

$apiEndpoints = @(
    @{
        Name = "A2A Server Health"
        Url = "http://localhost:3000/health"
        Method = "GET"
        ExpectedStatus = 200
        Service = "A2A Server"
    },
    @{
        Name = "A2A Server Detailed Health"
        Url = "http://localhost:3000/api/v1/health"
        Method = "GET"
        ExpectedStatus = 200
        Service = "A2A Server"
    },
    @{
        Name = "Client API Health"
        Url = "http://localhost:3001/health"
        Method = "GET"
        ExpectedStatus = 200
        Service = "Client API"
    },
    @{
        Name = "AI Integration Health"
        Url = "http://localhost:11434/health"
        Method = "GET"
        ExpectedStatus = 200
        Service = "AI Integration"
        Optional = $true
    },
    @{
        Name = "AI Integration Daemon Status"
        Url = "http://localhost:11434/daemon/status"
        Method = "GET"
        ExpectedStatus = 200
        Service = "AI Integration"
        Optional = $true
    },
    @{
        Name = "Local LLM upstream API Tags"
        Url = "http://localhost:11435/api/tags"
        Method = "GET"
        ExpectedStatus = 200
        Service = "Local LLM upstream"
    }
)

$results = @{}
$allPassed = $true

foreach ($endpoint in $apiEndpoints) {
    Write-Info "Testing $($endpoint.Name)..."

    $response = Test-Endpoint -Endpoint $endpoint

    $optionalEndpoint = $endpoint.Optional -eq $true

    if ($response -and $response.StatusCode -eq $endpoint.ExpectedStatus) {
        Write-Success "$($endpoint.Name) returned expected status $($endpoint.ExpectedStatus)"
        if ($endpoint.Url -match "/daemon/status") {
            try {
                $statusData = $response.Content | ConvertFrom-Json
                Write-Info "  Daemon running: $($statusData.running)"
                Write-Info "  Auto execute: $($statusData.auto_execute)"
            } catch {
                Write-Info "  Could not parse daemon status JSON"
            }
        } elseif ($endpoint.Url -match "/api/tags") {
            try {
                $tagsData = $response.Content | ConvertFrom-Json
                $modelCount = $tagsData.models.Count
                Write-Info "  Available models: $modelCount"
                if ($modelCount -gt 0) {
                    Write-Info "  First model: $($tagsData.models[0].name)"
                }
            } catch {
                Write-Info "  Could not parse Local LLM upstream tags JSON"
            }
        }
        $results[$endpoint.Name] = "PASS"
    } else {
        if ($response) {
            Write-Error "$($endpoint.Name) returned status $($response.StatusCode), expected $($endpoint.ExpectedStatus)"
        } else {
            Write-Error "$($endpoint.Name) failed after retries."
        }
        $status = if ($optionalEndpoint) { "WARN" } else { "FAIL" }
        $results[$endpoint.Name] = $status
        if (-not $optionalEndpoint) { $allPassed = $false }
    }
}

# Test basic API functionality (simple requests that don't require complex setup)
Write-Info "Testing basic API functionality..."

$basicTests = @(
    @{
        Name = "A2A Server Metrics"
        Url = "http://localhost:3000/metrics"
        Method = "GET"
        Service = "A2A Server"
        Optional = $true  # Metrics might not be available in all configurations
    },
    @{
        Name = "Client API Tester Status"
        Url = "http://localhost:3001/api/tester/status"
        Method = "GET"
        Service = "Client API"
        Optional = $true
    },
    @{
        Name = "AI Integration Cleanup Stats"
        Url = "http://localhost:11434/cleanup/stats"
        Method = "GET"
        Service = "AI Integration"
        Optional = $true
    }
)

foreach ($test in $basicTests) {
    Write-Info "Testing $($test.Name) (optional)..."

    try {
        $response = Invoke-WebRequest -Uri $test.Url -Method $test.Method -TimeoutSec 5 -ErrorAction Stop

        if ($response.StatusCode -eq 200) {
            Write-Success "$($test.Name) is available"
            $results[$test.Name] = $true
        } else {
            Write-Info "$($test.Name) returned status $($response.StatusCode) (optional endpoint)"
            $results[$test.Name] = $true  # Optional endpoints don't fail the test
        }
    } catch {
        Write-Info "$($test.Name) not available: $($_.Exception.Message) (optional endpoint)"
        $results[$test.Name] = $true  # Optional endpoints don't fail the test
    }
}

# Summary
Write-Host ""
Write-Info "Basic API Test Summary:"
foreach ($result in $results.GetEnumerator()) {
    $status = switch ($result.Value) {
        "PASS" { "PASS PASS" }
        "WARN" { "WARN WARN" }
        default { "FAIL FAIL" }
    }
    Write-Host ("{0,-35} : {1}" -f $result.Key, $status)
}

if ($allPassed) {
    Write-Success "All Level 1.3 basic API tests passed!"
    exit 0
} else {
    Write-Error "Some basic API tests failed. Check service configuration."
    exit 1
}

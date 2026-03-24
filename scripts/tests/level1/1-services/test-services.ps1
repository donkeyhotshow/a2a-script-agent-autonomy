# Level 1.1: Service Availability Test
# Проверка доступности основных сервисов (без запуска)

param(
    [switch]$Verbose
)

# Color output functions
function Write-Success { param($Message) Write-Host "PASS $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "FAIL $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }

Write-Info "Level 1.1: Service Availability Test"
Write-Info "===================================="

$services = @(
    @{
        Name = "A2A Server"
        Port = 3000
        Url = "http://localhost:3000/health"
        Description = "Main API server"
    },
    @{
        Name = "Client API"
        Port = 3001
        Url = "http://localhost:3001/health"
        Description = "Client-side API"
    },
    @{
        Name = "AI Integration Proxy"
        Port = 11434
        Url = "http://localhost:11434/health"
        Description = "LLM proxy service"
        Optional = $true
    },
    @{
        Name = "Ollama"
        Port = 11435
        Url = "http://localhost:11435/api/tags"
        Description = "LLM runtime"
    }
)

$results = @{}
$allPassed = $true

foreach ($service in $services) {
    Write-Info "Testing $($service.Name) (port $($service.Port))..."
    $optional = $service.Optional -eq $true

    try {
        $response = Invoke-WebRequest -Uri $service.Url -TimeoutSec 3 -ErrorAction Stop

        if ($response.StatusCode -eq 200) {
            Write-Success "$($service.Name) is available"
            $results[$service.Name] = "PASS"
        } else {
            Write-Error "$($service.Name) returned status $($response.StatusCode)"
            $results[$service.Name] = if ($optional) { "WARN" } else { "FAIL" }
            if (-not $optional) { $allPassed = $false }
        }
    } catch {
        if ($optional) {
            Write-Info "$($service.Name) is not accessible (optional): $($_.Exception.Message)"
            $results[$service.Name] = "WARN"
        } else {
            Write-Error "$($service.Name) is not accessible: $($_.Exception.Message)"
            $results[$service.Name] = "FAIL"
            $allPassed = $false
        }
    }
}

# Check Docker services
Write-Info "Testing Docker services..."
try {
    $dockerOutput = docker ps --format "{{.Names}}" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $containers = $dockerOutput | Where-Object { $_ -match 'postgres|redis' }
        if ($containers.Count -ge 1) {
            Write-Success "Docker services available: $($containers -join ', ')"
            $results["Docker Services"] = "PASS"
        } else {
            Write-Error "Required Docker services not found"
            $results["Docker Services"] = "FAIL"
            $allPassed = $false
        }
    } else {
        Write-Error "Docker not available or not running"
        $results["Docker Services"] = "FAIL"
        $allPassed = $false
    }
} catch {
    Write-Error "Docker check failed: $($_.Exception.Message)"
    $results["Docker Services"] = "FAIL"
    $allPassed = $false
}

# Summary
Write-Host ""
Write-Info "Service Availability Summary:"
foreach ($result in $results.GetEnumerator()) {
    $status = switch ($result.Value) {
        "PASS" { "✓ PASS" }
        "WARN" { "⚠️ WARN" }
        default { "✗ FAIL" }
    }
    Write-Host ("{0,-25} : {1}" -f $result.Key, $status)
}

if ($allPassed) {
    Write-Success "All Level 1.1 tests passed!"
    exit 0
} else {
    Write-Error "Some services are not available. Fix before proceeding."
    exit 1
}

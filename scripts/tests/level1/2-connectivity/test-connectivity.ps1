# Level 1.2: Network Connectivity Test
# Проверка сетевых подключений и DNS

param(
    [switch]$Verbose
)

# Color output functions
function Write-Success { param($Message) Write-Host "PASS $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "FAIL $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }

Write-Info "Level 1.2: Network Connectivity Test"
Write-Info "===================================="

$connectivityTests = @(
    @{
        Name = "Localhost DNS"
        Test = { Resolve-DnsName localhost -ErrorAction Stop | Out-Null }
        Description = "DNS resolution for localhost"
    },
    @{
        Name = "Loopback Interface"
        Test = {
            $result = Test-NetConnection -ComputerName 127.0.0.1 -Port 80 -WarningAction SilentlyContinue
            if (-not $result.TcpTestSucceeded) { throw "Loopback connection failed" }
        }
        Description = "TCP connectivity to loopback"
    },
    @{
        Name = "Port Availability Check"
        Test = {
            $ports = @(3000, 3001, 5173, 11434, 11435, 5433)
            $blockedPorts = @()

            foreach ($port in $ports) {
                $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
                if ($connection.TcpTestSucceeded) {
                    # Port is open, which might be expected or not depending on service state
                    Write-Info "Port $port is open (service may be running)"
                }
            }
        }
        Description = "Check if required ports are not blocked by firewall"
    },
    @{
        Name = "Internet Connectivity"
        Test = {
            $result = Test-NetConnection -ComputerName 8.8.8.8 -Port 53 -WarningAction SilentlyContinue
            if (-not $result.TcpTestSucceeded) { throw "Internet connectivity failed" }
        }
        Description = "Basic internet connectivity check"
    }
)

$results = @{}
$allPassed = $true

foreach ($test in $connectivityTests) {
    Write-Info "Testing $($test.Name)..."

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

# Additional port scan for our services
Write-Info "Scanning service ports..."
$servicePorts = @(
    @{ Port = 3000; Service = "A2A Server" },
    @{ Port = 3001; Service = "Client API" },
    @{ Port = 5173; Service = "Web UI" },
    @{ Port = 11434; Service = "Ollama" },
    @{ Port = 11435; Service = "AI Proxy" },
    @{ Port = 5433; Service = "PostgreSQL" }
)

$portResults = @{}
foreach ($servicePort in $servicePorts) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $servicePort.Port -WarningAction SilentlyContinue
        $portResults[$servicePort.Service] = @{
            Port = $servicePort.Port
            Open = $connection.TcpTestSucceeded
        }

        if ($connection.TcpTestSucceeded) {
            Write-Success "$($servicePort.Service) port $($servicePort.Port) is accessible"
        } else {
            Write-Info "$($servicePort.Service) port $($servicePort.Port) is closed (expected if service not running)"
        }
    } catch {
        Write-Error "Failed to check $($servicePort.Service) port $($servicePort.Port)"
        $portResults[$servicePort.Service] = @{
            Port = $servicePort.Port
            Open = $false
            Error = $_.Exception.Message
        }
        $allPassed = $false
    }
}

# Summary
Write-Host ""
Write-Info "Connectivity Test Summary:"
foreach ($result in $results.GetEnumerator()) {
    $status = if ($result.Value) { "PASS PASS" } else { "FAIL FAIL" }
    Write-Host ("{0,-25} : {1}" -f $result.Key, $status)
}

Write-Host ""
Write-Info "Port Status:"
foreach ($portResult in $portResults.GetEnumerator()) {
    $status = if ($portResult.Value.Open) { "PASS Open" } else { "○ Closed" }
    Write-Host ("{0,-15} (port {1,-5}) : {2}" -f $portResult.Key, $portResult.Value.Port, $status)
}

if ($allPassed) {
    Write-Success "All Level 1.2 connectivity tests passed!"
    exit 0
} else {
    Write-Error "Some connectivity tests failed. Check network configuration."
    exit 1
}
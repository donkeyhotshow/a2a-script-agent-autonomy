# Level 1 Runner: Basic Health Checks
# Запуск всех Level 1 тестов с fail-fast логикой

param(
    [switch]$Verbose,
    [switch]$ContinueOnError,
    [switch]$SkipSubLevel  # Пропустить конкретный подуровень
)

$rootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))

Write-Host "🚀🚀🚀 LEVEL 1: Basic Health Checks 🚀🚀🚀" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Testing order: Services → Connectivity → Basic API" -ForegroundColor Gray
Write-Host ""

$subLevels = @(
    @{
        Name = "1.1 Services"
        Path = "1-services\run.ps1"
        Description = "Service availability checks"
    },
    @{
        Name = "1.2 Connectivity"
        Path = "2-connectivity\run.ps1"
        Description = "Network connectivity tests"
    },
    @{
        Name = "1.3 Basic API"
        Path = "3-basic-api\run.ps1"
        Description = "Basic API endpoint tests"
    }
)

$failedLevels = @()

foreach ($subLevel in $subLevels) {
    Write-Host ""
    Write-Host "Running $($subLevel.Name): $($subLevel.Description)" -ForegroundColor Yellow

    try {
        $scriptPath = Join-Path $PSScriptRoot $subLevel.Path

        if ($Verbose) {
            & $scriptPath -Verbose
        } elseif ($ContinueOnError) {
            & $scriptPath -ContinueOnError
        } else {
            & $scriptPath
        }

        if ($LASTEXITCODE -ne 0) {
            $failedLevels += $subLevel.Name
            if (-not $ContinueOnError) {
                Write-Host ""
                Write-Host "❌ LEVEL 1 FAILED at $($subLevel.Name)" -ForegroundColor Red
                Write-Host "Failed sub-levels: $($failedLevels -join ', ')" -ForegroundColor Red
                exit 1
            } else {
                Write-Host "⚠️  $($subLevel.Name) failed but continuing..." -ForegroundColor Yellow
            }
        }

    } catch {
        $failedLevels += $subLevel.Name
        Write-Host "💥 Critical error in $($subLevel.Name): $($_.Exception.Message)" -ForegroundColor Red

        if (-not $ContinueOnError) {
            Write-Host ""
            Write-Host "❌ LEVEL 1 CRITICAL FAILURE" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host ""
if ($failedLevels.Count -eq 0) {
    Write-Host "🎉 LEVEL 1 COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "All basic health checks passed. Ready for Level 2 tests." -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  LEVEL 1 COMPLETED WITH ISSUES" -ForegroundColor Yellow
    Write-Host "Failed sub-levels: $($failedLevels -join ', ')" -ForegroundColor Yellow
    Write-Host "Some basic functionality may not work. Proceed with caution." -ForegroundColor Yellow
    exit 2  # Warning exit code
}
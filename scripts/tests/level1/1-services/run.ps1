# Level 1.1 Runner: Service Availability
# Запуск тестов доступности сервисов

param(
    [switch]$Verbose,
    [switch]$ContinueOnError
)

$rootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))

Write-Host "🚀 Level 1.1: Service Availability Tests" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

try {
    $testScript = Join-Path $PSScriptRoot "test-services.ps1"

    if ($Verbose) {
        & $testScript -Verbose
    } else {
        & $testScript
    }

    if ($LASTEXITCODE -ne 0) {
        if (-not $ContinueOnError) {
            Write-Host "❌ Level 1.1 failed. Stopping execution." -ForegroundColor Red
            exit 1
        } else {
            Write-Host "⚠️  Level 1.1 failed but continuing..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ Level 1.1 passed!" -ForegroundColor Green
    }

} catch {
    Write-Host "💥 Critical error in Level 1.1: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
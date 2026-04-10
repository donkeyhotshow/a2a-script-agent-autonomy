# Level 1.3 Runner: Basic API Endpoints
# Запуск тестов базовых API эндпоинтов

param(
    [switch]$Verbose,
    [switch]$ContinueOnError
)

$rootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))

Write-Host "🚀 Level 1.3: Basic API Endpoints Tests" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

try {
    $testScript = Join-Path $PSScriptRoot "test-basic-api.ps1"

    if ($Verbose) {
        & $testScript -Verbose
    } else {
        & $testScript
    }

    if ($LASTEXITCODE -ne 0) {
        if (-not $ContinueOnError) {
            Write-Host "❌ Level 1.3 failed. Stopping execution." -ForegroundColor Red
            exit 1
        } else {
            Write-Host "⚠️  Level 1.3 failed but continuing..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ Level 1.3 passed!" -ForegroundColor Green
    }

} catch {
    Write-Host "💥 Critical error in Level 1.3: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
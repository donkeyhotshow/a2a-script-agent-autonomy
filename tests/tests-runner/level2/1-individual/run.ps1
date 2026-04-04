# Level 2.1 Runner: Individual Components
# Запуск тестов отдельных компонентов

param(
    [switch]$Verbose,
    [switch]$ContinueOnError,
    [switch]$Quick
)

$rootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))

Write-Host "🚀 Level 2.1: Individual Component Tests" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

try {
    $testScript = Join-Path $PSScriptRoot "test-individual.ps1"
    $args = @()

    if ($Verbose) { $args += "-Verbose" }
    if ($Quick) { $args += "-Quick" }

    & $testScript @args

    if ($LASTEXITCODE -ne 0) {
        if (-not $ContinueOnError) {
            Write-Host "❌ Level 2.1 failed. Stopping execution." -ForegroundColor Red
            exit 1
        } else {
            Write-Host "⚠️  Level 2.1 failed but continuing..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ Level 2.1 passed!" -ForegroundColor Green
    }

} catch {
    Write-Host "💥 Critical error in Level 2.1: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
# Level 3.3 Runner: Performance Tests
param([switch]$Verbose,[switch]$ContinueOnError,[switch]$Light)
$rootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Write-Host "🚀 Level 3.3: Performance Tests" -ForegroundColor Cyan
try {
    $testScript = Join-Path $PSScriptRoot "test-performance.ps1"
    $args = @()
    if ($Verbose) { $args += "-Verbose" }
    if ($Light) { $args += "-Light" }
    & $testScript @args
    if ($LASTEXITCODE -ne 0) {
        if (-not $ContinueOnError) { Write-Host "❌ Level 3.3 failed." -ForegroundColor Red; exit 1 }
        else { Write-Host "⚠️  Level 3.3 failed but continuing..." -ForegroundColor Yellow }
    } else { Write-Host "✅ Level 3.3 passed!" -ForegroundColor Green }
} catch { Write-Host "💥 Critical error in Level 3.3: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
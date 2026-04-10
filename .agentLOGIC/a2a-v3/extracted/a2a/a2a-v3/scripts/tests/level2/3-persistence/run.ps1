# Level 2.3 Runner: Data Persistence
param([switch]$Verbose,[switch]$ContinueOnError)
$rootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Write-Host "🚀 Level 2.3: Data Persistence Tests" -ForegroundColor Cyan
try {
    $testScript = Join-Path $PSScriptRoot "test-persistence.ps1"
    if ($Verbose) { & $testScript -Verbose } else { & $testScript }
    if ($LASTEXITCODE -ne 0) {
        if (-not $ContinueOnError) { Write-Host "❌ Level 2.3 failed." -ForegroundColor Red; exit 1 }
        else { Write-Host "⚠️  Level 2.3 failed but continuing..." -ForegroundColor Yellow }
    } else { Write-Host "✅ Level 2.3 passed!" -ForegroundColor Green }
} catch { Write-Host "💥 Critical error in Level 2.3: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
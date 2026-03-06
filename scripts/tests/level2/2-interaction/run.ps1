# Level 2.2 Runner: Component Interactions
param([switch]$Verbose,[switch]$ContinueOnError)
$rootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Write-Host "🚀 Level 2.2: Component Interaction Tests" -ForegroundColor Cyan
try {
    $testScript = Join-Path $PSScriptRoot "test-interaction.ps1"
    if ($Verbose) { & $testScript -Verbose } else { & $testScript }
    if ($LASTEXITCODE -ne 0) {
        if (-not $ContinueOnError) { Write-Host "❌ Level 2.2 failed." -ForegroundColor Red; exit 1 }
        else { Write-Host "⚠️  Level 2.2 failed but continuing..." -ForegroundColor Yellow }
    } else { Write-Host "✅ Level 2.2 passed!" -ForegroundColor Green }
} catch { Write-Host "💥 Critical error in Level 2.2: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
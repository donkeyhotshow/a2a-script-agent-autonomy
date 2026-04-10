# Level 1.4 Runner: Client API Endpoints
param([switch]$Verbose, [switch]$ContinueOnError)

$testScript = Join-Path $PSScriptRoot "test-client-endpoints.ps1"
if ($Verbose) { & $testScript -Verbose } else { & $testScript }
$code = $LASTEXITCODE
if ($code -ne 0 -and -not $ContinueOnError) {
    Write-Host "Level 1.4 failed. Stopping." -ForegroundColor Red
    exit 1
}
exit $code

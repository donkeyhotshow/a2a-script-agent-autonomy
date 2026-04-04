Param(
    [string]$Model = "glm-4.7-flash",
    [string]$Message = "debug proxy headers"
)

# Ensure we run from the script directory (should be repo root)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host ">>> Reading ai-integration proxy config (python ai-integration\proxy\config.py)..." -ForegroundColor Cyan
$configOutput = python ai-integration\proxy\config.py 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Config script failed:" -ForegroundColor Red
    $configOutput | Out-String | Write-Host
    exit 1
}

$storageLine = $configOutput | Select-String "Storage Directory"
if (-not $storageLine) {
    Write-Host "Could not find 'Storage Directory' line in config output." -ForegroundColor Red
    $configOutput | Out-String | Write-Host
    exit 1
}

$storageDir = ($storageLine -replace '.*Storage Directory:\s*','').Trim()
Write-Host ">>> STORAGE_DIR = $storageDir" -ForegroundColor Green

if (-not (Test-Path $storageDir)) {
    Write-Host "Storage directory does not exist: $storageDir" -ForegroundColor Red
    exit 1
}

# Build a minimal chat body for the promise request
$bodyObj = @{
    model    = $Model
    messages = @(@{
        role    = "user"
        content = $Message
    })
}
$bodyJson = $bodyObj | ConvertTo-Json -Depth 5

Write-Host ">>> Sending promise request to http://localhost:11434/api/chat?promise=1&model=$Model ..." -ForegroundColor Cyan
$resp = curl -s "http://localhost:11434/api/chat?promise=1&model=$Model" `
    -H "Content-Type: application/json" `
    -d $bodyJson

Write-Host "Response from /api/chat?promise=1&model=$Model :" -ForegroundColor Yellow
$resp | Out-String | Write-Host

# Give the inline promise job a small moment to write debug file (should be immediate, but be safe)
Start-Sleep -Seconds 1

$debugPath = Join-Path $storageDir "debug-request-latest.json"
if (-not (Test-Path $debugPath)) {
    Write-Host "debug-request-latest.json not found at: $debugPath" -ForegroundColor Red
    exit 1
}

Write-Host ">>> Found debug-request-latest.json at: $debugPath" -ForegroundColor Green
Write-Host ">>> File contents (paste this back to me):" -ForegroundColor Cyan
""
Get-Content $debugPath | Write-Output
""
Write-Host ">>> End of debug-request-latest.json" -ForegroundColor Cyan


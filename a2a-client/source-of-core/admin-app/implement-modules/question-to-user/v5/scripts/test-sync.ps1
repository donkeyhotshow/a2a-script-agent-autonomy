# Test synchronization script for QTU v5
$ErrorActionPreference = "Stop"

# Configuration
$config = @{
    SourceDir = "C:\apps\admin-app\implement-modules\question-to-user\v5"
    TargetDir = "C:\apps\admin-app\script"
    LogFile = "C:\apps\admin-app\implement-modules\question-to-user\v5\logs\sync-test.log"
    BackupDir = "C:\apps\admin-app\implement-modules\question-to-user\v5\backup"
}

# Create necessary directories
$directories = @(
    (Split-Path -Parent $config.LogFile),
    $config.BackupDir,
    "$($config.TargetDir)\docs\standards\json\questions",
    "$($config.TargetDir)\docs\processes\development\workflow",
    "$($config.TargetDir)\docs\guides\user\basic"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir"
    }
}

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $config.LogFile -Value $logMessage
    Write-Host $logMessage
}

# Test question synchronization
Write-Log "Starting test synchronization..."
Write-Log "Source directory: $($config.SourceDir)"
Write-Log "Target directory: $($config.TargetDir)"

# Test question file
$testQuestion = @{
    Source = "$($config.SourceDir)\data\questions\test-question-001.json"
    Target = "$($config.TargetDir)\docs\standards\json\questions\test-question-001.json"
}

# Backup existing file if exists
if (Test-Path $testQuestion.Target) {
    $backupPath = Join-Path $config.BackupDir "test-question-001.json.bak"
    Copy-Item -Path $testQuestion.Target -Destination $backupPath -Force
    Write-Log "Created backup: $backupPath"
}

# Copy test question
try {
    # Read source content
    $sourceContent = Get-Content $testQuestion.Source -Raw
    
    # Write to target file (overwrite if exists)
    Set-Content -Path $testQuestion.Target -Value $sourceContent -Force
    Write-Log "Successfully copied test question"
} catch {
    Write-Log "Error copying test question: $_" -Level "ERROR"
    throw
}

# Verify the copy
if (Test-Path $testQuestion.Target) {
    $sourceContent = Get-Content $testQuestion.Source -Raw
    $targetContent = Get-Content $testQuestion.Target -Raw
    if ($sourceContent -eq $targetContent) {
        Write-Log "Verification successful: files match"
    } else {
        Write-Log "Verification failed: files do not match" -Level "ERROR"
        throw "File verification failed"
    }
} else {
    Write-Log "Verification failed: target file not found" -Level "ERROR"
    throw "Target file not found"
}

Write-Log "Test synchronization completed successfully" 
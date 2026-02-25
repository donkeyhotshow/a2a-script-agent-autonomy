# Documentation synchronization script for QTU v5
$ErrorActionPreference = "Stop"

# Configuration
$config = @{
    SourceDir = "C:\apps\admin-app\implement-modules\question-to-user\v5"
    TargetDir = "C:\apps\admin-app\script"
    LogFile = "C:\apps\admin-app\implement-modules\question-to-user\v5\logs\sync-docs.log"
    BackupDir = "C:\apps\admin-app\implement-modules\question-to-user\v5\backup"
    SyncPaths = @{
        Standards = @{
            Source = "docs\standards"
            Target = "docs\standards"
            Patterns = @("*.md", "*.json")
        }
        Processes = @{
            Source = "docs\processes"
            Target = "docs\processes"
            Patterns = @("*.md")
        }
        Guides = @{
            Source = "docs\guides"
            Target = "docs\guides"
            Patterns = @("*.md")
        }
    }
}

# Create necessary directories
$directories = @(
    (Split-Path -Parent $config.LogFile),
    $config.BackupDir
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

# Validation function for JSON files
function Test-JsonContent {
    param(
        [string]$FilePath
    )
    try {
        $content = Get-Content $FilePath -Raw
        $null = $content | ConvertFrom-Json
        return $true
    }
    catch {
        Write-Log "Invalid JSON in file: $FilePath" -Level "ERROR"
        return $false
    }
}

# Validation function for Markdown files
function Test-MarkdownContent {
    param(
        [string]$FilePath
    )
    try {
        $content = Get-Content $FilePath -Raw
        # Basic markdown validation
        if ($content -match "^#\s+.+") {
            return $true
        }
        Write-Log "Invalid Markdown format in file: $FilePath" -Level "ERROR"
        return $false
    }
    catch {
        Write-Log "Error reading Markdown file: $FilePath" -Level "ERROR"
        return $false
    }
}

# Synchronization function for a single file
function Sync-File {
    param(
        [string]$SourceFile,
        [string]$TargetFile
    )
    
    try {
        # Create backup if target exists
        if (Test-Path $TargetFile) {
            $backupPath = Join-Path $config.BackupDir (Split-Path $TargetFile -Leaf)
            Copy-Item -Path $TargetFile -Destination $backupPath -Force
            Write-Log "Created backup: $backupPath"
        }

        # Ensure target directory exists
        $targetDir = Split-Path $TargetFile -Parent
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }

        # Copy file
        $sourceContent = Get-Content $SourceFile -Raw
        Set-Content -Path $TargetFile -Value $sourceContent -Force
        Write-Log "Successfully copied: $SourceFile to $TargetFile"

        # Validate content based on file type
        $extension = [System.IO.Path]::GetExtension($SourceFile)
        $isValid = switch ($extension) {
            ".json" { Test-JsonContent $TargetFile }
            ".md" { Test-MarkdownContent $TargetFile }
            default { $true }
        }

        if (-not $isValid) {
            throw "Validation failed for file: $TargetFile"
        }

        return $true
    }
    catch {
        Write-Log "Error processing file $SourceFile : $_" -Level "ERROR"
        return $false
    }
}

# Main synchronization function
function Start-DocSync {
    $stats = @{
        Total = 0
        Success = 0
        Failed = 0
        Skipped = 0
    }

    Write-Log "Starting documentation synchronization..."
    Write-Log "Source directory: $($config.SourceDir)"
    Write-Log "Target directory: $($config.TargetDir)"

    foreach ($docType in $config.SyncPaths.Keys) {
        $syncConfig = $config.SyncPaths[$docType]
        $sourcePath = Join-Path $config.SourceDir $syncConfig.Source
        $targetPath = Join-Path $config.TargetDir $syncConfig.Target

        Write-Log "Processing $docType documentation..."

        foreach ($pattern in $syncConfig.Patterns) {
            $files = Get-ChildItem -Path $sourcePath -Filter $pattern -Recurse
            foreach ($file in $files) {
                $stats.Total++
                $relativePath = $file.FullName.Substring($sourcePath.Length)
                $targetFile = Join-Path $targetPath $relativePath

                if (Test-Path $targetFile) {
                    $sourceHash = (Get-FileHash $file.FullName -Algorithm MD5).Hash
                    $targetHash = (Get-FileHash $targetFile -Algorithm MD5).Hash
                    
                    if ($sourceHash -eq $targetHash) {
                        Write-Log "Skipping unchanged file: $($file.Name)"
                        $stats.Skipped++
                        continue
                    }
                }

                if (Sync-File $file.FullName $targetFile) {
                    $stats.Success++
                }
                else {
                    $stats.Failed++
                }
            }
        }
    }

    # Report results
    Write-Log "Synchronization completed"
    Write-Log "Total files processed: $($stats.Total)"
    Write-Log "Successfully synchronized: $($stats.Success)"
    Write-Log "Failed to synchronize: $($stats.Failed)"
    Write-Log "Skipped (unchanged): $($stats.Skipped)"

    return $stats
}

# Run synchronization
$syncResults = Start-DocSync

# Exit with error if any files failed to sync
if ($syncResults.Failed -gt 0) {
    exit 1
}

# Git Settings Import Script
# Imports Git configuration from a backup file

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFilePath
)

if (-Not (Test-Path $BackupFilePath)) {
    Write-Host "Error: Backup file '$BackupFilePath' not found." -ForegroundColor Red
    exit 1
}

Write-Host "Importing Git configuration from $BackupFilePath..." -ForegroundColor Green

# Read the backup file and apply each setting
Get-Content $BackupFilePath | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        
        # Skip empty lines or comments
        if ($key -and -Not ($key.StartsWith("#"))) {
            try {
                git config --global $key $value
                Write-Host "Set: $key = $value" -ForegroundColor DarkGreen
            } catch {
                Write-Host "Failed to set $key: $_" -ForegroundColor Red
            }
        }
    }
}

Write-Host "Git configuration imported successfully!" -ForegroundColor Green
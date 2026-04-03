# Git Settings Export Script
# Exports current Git configuration to a file for later import

$exportPath = "git-settings-backup.txt"

Write-Host "Exporting Git configuration to $exportPath..." -ForegroundColor Green

# Get all Git configuration settings
git config --list | Out-File -FilePath $exportPath -Encoding UTF8

Write-Host "Git configuration exported successfully to $exportPath" -ForegroundColor Green
Write-Host "To import these settings on another device, run:" -ForegroundColor Yellow
Write-Host "  Get-Content $exportPath | ForEach-Object { if ($_ -match '^([^=]+)=(.*)$') { git config --global $matches[1] $matches[2] } }" -ForegroundColor Yellow
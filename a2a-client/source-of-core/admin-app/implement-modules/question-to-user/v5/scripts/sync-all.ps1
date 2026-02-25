# Скрипт запуска всех синхронизаций
# Автор: Claude
# Дата: 2024-03-20

# Конфигурация
$config = @{
    ScriptsDir = "C:\apps\admin-app\implement-modules\question-to-user\v5\scripts"
    LogFile = "C:\apps\admin-app\implement-modules\question-to-user\v5\logs\sync-all.log"
    NotifyEmail = "admin@example.com"
}

# Функция логирования
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Запись в лог
    Add-Content -Path $config.LogFile -Value $logMessage
    
    # Вывод в консоль
    Write-Host $logMessage
}

# Функция отправки уведомления
function Send-Notification {
    param(
        [string]$Subject,
        [string]$Body
    )
    
    # TODO: Реализовать отправку email
    Write-Log "Notification: $Subject" "NOTIFY"
}

# Функция запуска синхронизации
function Start-Sync {
    param(
        [string]$ScriptName,
        [string]$Description
    )
    
    Write-Log "Starting $Description synchronization" "INFO"
    
    try {
        $scriptPath = Join-Path $config.ScriptsDir $ScriptName
        & $scriptPath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "$Description synchronization completed successfully" "INFO"
            return $true
        }
        else {
            Write-Log "$Description synchronization failed with exit code $LASTEXITCODE" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Error running $Description synchronization: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Основная функция
function Start-AllSync {
    Write-Log "Starting all synchronizations" "INFO"
    
    $results = @{
        Questions = $false
        Documentation = $false
    }
    
    # Синхронизация вопросов
    $results.Questions = Start-Sync "sync-questions.ps1" "Questions"
    
    # Синхронизация документации
    $results.Documentation = Start-Sync "sync-docs.ps1" "Documentation"
    
    # Формирование отчета
    $successCount = ($results.Values | Where-Object { $_ -eq $true }).Count
    $totalCount = $results.Count
    
    $subject = "Synchronization Report"
    $body = @"
Synchronization completed:
- Questions: $($results.Questions)
- Documentation: $($results.Documentation)

Success rate: $successCount/$totalCount
"@
    
    Send-Notification $subject $body
    
    Write-Log "All synchronizations completed. Success rate: $successCount/$totalCount" "INFO"
}

# Запуск всех синхронизаций
Start-AllSync 
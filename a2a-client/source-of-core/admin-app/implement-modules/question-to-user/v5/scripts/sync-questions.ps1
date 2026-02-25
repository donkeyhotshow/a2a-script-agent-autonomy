# Скрипт синхронизации вопросов между ИИ и модулем QTU
# Автор: Claude
# Дата: 2024-03-20

# Конфигурация
$config = @{
    SourceDir = "C:\apps\admin-app\script\data\questions"  # Директория с вопросами от ИИ
    TargetDir = "C:\apps\admin-app\implement-modules\question-to-user\v5\data\questions"  # Директория модуля QTU
    LogFile = "C:\apps\admin-app\implement-modules\question-to-user\v5\logs\sync.log"  # Файл лога
    BackupDir = "C:\apps\admin-app\implement-modules\question-to-user\v5\backups"  # Директория для бэкапов
    NotifyEmail = "admin@example.com"  # Email для уведомлений
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

# Функция валидации JSON
function Test-QuestionJson {
    param(
        [string]$JsonPath
    )
    
    try {
        $content = Get-Content -Path $JsonPath -Raw
        $question = $content | ConvertFrom-Json
        
        # Проверка обязательных полей
        $requiredFields = @("id", "text", "type", "metadata")
        foreach ($field in $requiredFields) {
            if (-not $question.$field) {
                Write-Log "Missing required field: $field in $JsonPath" "ERROR"
                return $false
            }
        }
        
        return $true
    }
    catch {
        Write-Log "Invalid JSON in $($JsonPath): $_" "ERROR"
        return $false
    }
}

# Функция проверки уникальности ID
function Test-QuestionIdUnique {
    param(
        [string]$QuestionId,
        [string]$TargetDir
    )
    
    $existingFiles = Get-ChildItem -Path $TargetDir -Filter "*.json"
    foreach ($file in $existingFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        $question = $content | ConvertFrom-Json
        if ($question.id -eq $QuestionId) {
            return $false
        }
    }
    return $true
}

# Функция создания бэкапа
function Backup-File {
    param(
        [string]$FilePath
    )
    
    $fileName = Split-Path $FilePath -Leaf
    $backupPath = Join-Path $config.BackupDir "$fileName.$(Get-Date -Format 'yyyyMMddHHmmss').bak"
    
    Copy-Item -Path $FilePath -Destination $backupPath
    Write-Log "Created backup: $backupPath" "INFO"
}

# Основная функция синхронизации
function Sync-Questions {
    Write-Log "Starting question synchronization" "INFO"
    
    # Проверка директорий
    if (-not (Test-Path $config.SourceDir)) {
        Write-Log "Source directory does not exist: $($config.SourceDir)" "ERROR"
        return
    }
    
    if (-not (Test-Path $config.TargetDir)) {
        New-Item -ItemType Directory -Path $config.TargetDir -Force
        Write-Log "Created target directory: $($config.TargetDir)" "INFO"
    }
    
    # Получение списка файлов
    $sourceFiles = Get-ChildItem -Path $config.SourceDir -Filter "*.json"
    $processedCount = 0
    $errorCount = 0
    
    foreach ($file in $sourceFiles) {
        try {
            # Валидация JSON
            if (-not (Test-QuestionJson $file.FullName)) {
                $errorCount++
                continue
            }
            
            # Чтение вопроса
            $content = Get-Content -Path $file.FullName -Raw
            $question = $content | ConvertFrom-Json
            
            # Проверка уникальности ID
            if (-not (Test-QuestionIdUnique $question.id $config.TargetDir)) {
                Write-Log "Duplicate question ID: $($question.id)" "WARN"
                $errorCount++
                continue
            }
            
            # Создание бэкапа существующего файла
            $targetPath = Join-Path $config.TargetDir $file.Name
            if (Test-Path $targetPath) {
                Backup-File $targetPath
            }
            
            # Копирование файла
            Copy-Item -Path $file.FullName -Destination $targetPath -Force
            $processedCount++
            
            Write-Log "Processed question: $($question.id)" "INFO"
        }
        catch {
            Write-Log "Error processing $($file.Name): $_" "ERROR"
            $errorCount++
        }
    }
    
    # Отправка уведомления
    $subject = "Question Synchronization Report"
    $body = "Processed: $processedCount`nErrors: $errorCount"
    Send-Notification $subject $body
    
    Write-Log "Synchronization completed. Processed: $processedCount, Errors: $errorCount" "INFO"
}

# Запуск синхронизации
Sync-Questions 
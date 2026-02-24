param(
    [Parameter(Mandatory=$true)]
    [string]$QuestionId,
    [int]$Port = 8765,
    [int]$TimeoutSeconds = 600
)

$ErrorActionPreference = "Stop"

# Paths
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$questionsDir = Join-Path $scriptDir "questions-to-user"
$answersFile = Join-Path $questionsDir "answers.json"
$logFile = Join-Path $questionsDir "ask-question.log"

# Logging function
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $logFile -Value $logMessage -ErrorAction SilentlyContinue
}

Write-Log "Starting ask-question for: $QuestionId"
Write-Host "Opening question: $QuestionId" -ForegroundColor Cyan

# Start PHP server
Write-Host "Starting PHP server on port $Port..." -ForegroundColor Gray
$phpProcess = $null
try {
    $phpProcess = Start-Process "php" -ArgumentList "-S", "localhost:$Port", "-t", $questionsDir -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 2
    Write-Log "PHP server started (PID: $($phpProcess.Id))"
} catch {
    Write-Log "Failed to start PHP: $_" "ERROR"
    Write-Host "Warning: PHP server not started, using file:// URL" -ForegroundColor Yellow
}

# Clear previous answer
if (Test-Path $answersFile) {
    try {
        $answers = Get-Content $answersFile -Raw | ConvertFrom-Json
        if ($answers.answers.PSObject.Properties.Name -contains $QuestionId) {
            $answers.answers.PSObject.Properties.Remove($QuestionId)
            $answers | ConvertTo-Json -Depth 10 | Set-Content $answersFile -Encoding UTF8
        }
    } catch {
        Write-Log "Could not clear previous answer: $_" "WARNING"
    }
}

# Build URL
if ($phpProcess) {
    $questionUrl = "http://localhost:$Port/question.html?id=$QuestionId&autoClose=true"
} else {
    $questionUrl = "file:///$($questionsDir -replace '\\', '/')/question.html?id=$QuestionId&autoClose=true"
}
Write-Host "URL: $questionUrl" -ForegroundColor Gray

# Try browsers
$browserOpened = $false
$browsers = @(
    @{Name="Edge"; Command="msedge.exe"; Args="--new-window"},
    @{Name="Chrome"; Command="chrome.exe"; Args="--new-window"},
    @{Name="Firefox"; Command="firefox.exe"; Args="-new-window"},
    @{Name="Default"; Command="start"; Args=""}
)

foreach ($browser in $browsers) {
    try {
        if ($browser.Command -eq "start") {
            Start-Process $questionUrl
        } else {
            Start-Process $browser.Command -ArgumentList $browser.Args, $questionUrl -ErrorAction Stop
        }
        Write-Host "Opened in $($browser.Name)" -ForegroundColor Green
        Write-Log "Opened in $($browser.Name)"
        $browserOpened = $true
        break
    } catch {
        Write-Log "$($browser.Name) not available" "WARNING"
    }
}

if (-not $browserOpened) {
    Write-Host "Failed to open browser" -ForegroundColor Red
    if ($phpProcess) { Stop-Process -Id $phpProcess.Id -Force }
    exit 1
}

Write-Host "`nWaiting for answer (timeout: $TimeoutSeconds sec)..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to cancel" -ForegroundColor Gray

# Poll for answer
$pollIntervalSeconds = 1
$elapsed = 0
$progressChars = @('⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏')
$progressIndex = 0

try {
    while ($elapsed -lt $TimeoutSeconds) {
        Start-Sleep -Seconds $pollIntervalSeconds
        $elapsed += $pollIntervalSeconds
        
        if (Test-Path $answersFile) {
            try {
                $answers = Get-Content $answersFile -Raw | ConvertFrom-Json
                
                if ($answers.answers.PSObject.Properties.Name -contains $QuestionId) {
                    $answer = $answers.answers.$QuestionId
                    
                    Write-Host "`n"
                    Write-Host "`nAnswer received!" -ForegroundColor Green
                    Write-Host "`nQuestion ID: $QuestionId" -ForegroundColor Cyan
                    Write-Host "Answer:" -ForegroundColor Cyan
                    
                    if ($answer -is [array]) {
                        $answer | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
                    } else {
                        Write-Host "  $answer" -ForegroundColor White
                    }
                    
                    $result = @{
                        questionId = $QuestionId
                        answer = $answer
                        timestamp = Get-Date -Format "o"
                    }
                    
                    Write-Host "`nJSON Output:" -ForegroundColor Gray
                    $jsonOutput = $result | ConvertTo-Json -Compress
                    Write-Host $jsonOutput
                    
                    Write-Log "Completed: $jsonOutput"
                    
                    if ($phpProcess) {
                        Stop-Process -Id $phpProcess.Id -Force -ErrorAction SilentlyContinue
                    }
                    
                    exit 0
                }
            } catch {
                Write-Log "Error reading answers: $_" "WARNING"
            }
        }
        
        # Animated progress
        $percent = [math]::Round(($elapsed / $TimeoutSeconds) * 100)
        $progressChar = $progressChars[$progressIndex % $progressChars.Length]
        $progressMsg = "$progressChar Waiting... $elapsed/$TimeoutSeconds sec ($percent%)"
        Write-Host "`r$progressMsg" -NoNewline -ForegroundColor Yellow
        $progressIndex++
    }
    
    Write-Host "`n"
    Write-Host "`nTimeout: No answer received" -ForegroundColor Red
    Write-Log "Timeout after $TimeoutSeconds seconds" "ERROR"
    
    if ($phpProcess) {
        Stop-Process -Id $phpProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    exit 1
} catch {
    Write-Log "Fatal error: $_" "ERROR"
    if ($phpProcess) {
        Stop-Process -Id $phpProcess.Id -Force -ErrorAction SilentlyContinue
    }
    throw
}

<#
.SYNOPSIS
    Hub for stack checks by part. Run health checks for selected layers only.
.DESCRIPTION
    Scopes: LLM | ServerLLM | ClientServerLLM | Full | WebClientServer | WebClient | ClientServer
.EXAMPLE
    .\run-checks.ps1 -Scope LLM
    .\run-checks.ps1 -Scope ClientServerLLM -ServerPort 3000
#>
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('LLM', 'ServerLLM', 'ClientServerLLM', 'Full', 'WebClientServer', 'WebClient', 'ClientServer')]
    [string]$Scope,

    [int]$ServerPort = 3000,
    [int]$ClientPort = 5173,
    [int]$WebPort = 5173,
    [string]$OllamaUrl = 'http://localhost:11435',
    [string]$AiProxyUrl = 'http://localhost:11434',
    [int]$TimeoutSec = 10
)

$ErrorActionPreference = 'Stop'
function Ok { param($msg) Write-Host "  OK $msg" -ForegroundColor Green }
function Fail { param($msg) Write-Host "  FAIL $msg" -ForegroundColor Red; return $false }
function Check-Url {
    param([string]$Url, [string]$Name)
    try {
        $r = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -lt 500) { Ok "$Name ($Url)"; return $true }
        Fail "$Name $($r.StatusCode)"
    } catch { Fail "$Name $($_.Exception.Message)" }
}

$failed = 0

Write-Host "=== direct-tests hub: $Scope ===" -ForegroundColor Cyan

switch ($Scope) {
    'LLM' {
        Write-Host "LLM only" -ForegroundColor Gray
        if (-not (Check-Url -Url "$OllamaUrl/api/tags" -Name "Ollama")) { $failed++ }
        if (-not (Check-Url -Url "$AiProxyUrl/health" -Name "AI proxy")) { $failed++ }
    }
    'ServerLLM' {
        Write-Host "Server + LLM" -ForegroundColor Gray
        if (-not (Check-Url -Url "http://localhost:${ServerPort}/health" -Name "Server")) { $failed++ }
        if (-not (Check-Url -Url "$OllamaUrl/api/tags" -Name "Ollama")) { $failed++ }
        if (-not (Check-Url -Url "$AiProxyUrl/health" -Name "AI proxy")) { $failed++ }
    }
    'ClientServer' {
        Write-Host "Client + Server" -ForegroundColor Gray
        if (-not (Check-Url -Url "http://localhost:${ClientPort}/api/a2a/projects" -Name "Client API")) { $failed++ }
        if (-not (Check-Url -Url "http://localhost:${ServerPort}/health" -Name "Server")) { $failed++ }
    }
    'ClientServerLLM' {
        Write-Host "Client + Server + LLM" -ForegroundColor Gray
        if (-not (Check-Url -Url "http://localhost:${ClientPort}/api/a2a/projects" -Name "Client API")) { $failed++ }
        if (-not (Check-Url -Url "http://localhost:${ServerPort}/health" -Name "Server")) { $failed++ }
        if (-not (Check-Url -Url "$OllamaUrl/api/tags" -Name "Ollama")) { $failed++ }
        if (-not (Check-Url -Url "$AiProxyUrl/health" -Name "AI proxy")) { $failed++ }
    }
    'WebClient' {
        Write-Host "Web + Client" -ForegroundColor Gray
        if (-not (Check-Url -Url "http://localhost:${WebPort}/" -Name "Web")) { $failed++ }
        if (-not (Check-Url -Url "http://localhost:${ClientPort}/api/a2a/projects" -Name "Client API")) { $failed++ }
    }
    'WebClientServer' {
        Write-Host "Web + Client + Server" -ForegroundColor Gray
        if (-not (Check-Url -Url "http://localhost:${WebPort}/" -Name "Web")) { $failed++ }
        if (-not (Check-Url -Url "http://localhost:${ClientPort}/api/a2a/projects" -Name "Client API")) { $failed++ }
        if (-not (Check-Url -Url "http://localhost:${ServerPort}/health" -Name "Server")) { $failed++ }
    }
    'Full' {
        Write-Host "Web + Client + Server + LLM" -ForegroundColor Gray
        if (-not (Check-Url -Url "http://localhost:${WebPort}/" -Name "Web")) { $failed++ }
        if (-not (Check-Url -Url "http://localhost:${ClientPort}/api/a2a/projects" -Name "Client API")) { $failed++ }
        if (-not (Check-Url -Url "http://localhost:${ServerPort}/health" -Name "Server")) { $failed++ }
        if (-not (Check-Url -Url "$OllamaUrl/api/tags" -Name "Ollama")) { $failed++ }
        if (-not (Check-Url -Url "$AiProxyUrl/health" -Name "AI proxy")) { $failed++ }
    }
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "PASS: $Scope" -ForegroundColor Green
    exit 0
} else {
    Write-Host "FAIL: $Scope ($failed check(s))" -ForegroundColor Red
    exit 1
}

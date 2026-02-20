param(
  [string]$BaseUrl = "http://localhost:3000/api/v1",
  [string]$Token = $env:A2A_TOKEN,
  [string]$ProjectPath = "C:\workspace\domain-platform\websitestore.com.ua",
  [string]$Message = "Собери первичный граф и скажи, чего не хватает",
  [int]$PollSeconds = 2,
  [int]$TimeoutSeconds = 60,
  [switch]$SkipAuth
)

$ErrorActionPreference = "Stop"

function Get-Headers {
  $headers = @{ "Content-Type" = "application/json" }
  if (-not $SkipAuth) {
    if ([string]::IsNullOrWhiteSpace($Token)) {
      throw "Token is required (pass -Token or set A2A_TOKEN), or run with -SkipAuth when server uses SKIP_AUTH=1."
    }
    $headers["Authorization"] = "Bearer $Token"
  }
  return $headers
}

function Invoke-A2AJson {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $false)]$Body
  )

  $headers = Get-Headers
  if ($null -ne $Body) {
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body ($Body | ConvertTo-Json -Depth 20)
  }
  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
}

function Invoke-WithRetry {
  param(
    [Parameter(Mandatory = $true)][scriptblock]$Action,
    [int]$Retries = 10,
    [int]$DelaySeconds = 1,
    [string]$Label = "request"
  )

  $lastError = $null
  for ($i = 1; $i -le $Retries; $i++) {
    try {
      return & $Action
    } catch {
      $lastError = $_
      if ($i -lt $Retries) {
        Start-Sleep -Seconds $DelaySeconds
        continue
      }
      throw "Failed $Label after $Retries attempts. Last error: $($lastError.Exception.Message)"
    }
  }
}

Write-Host "1) Clearing pending queue…" -ForegroundColor Cyan
$clear = Invoke-WithRetry -Label "queue clear" -Action {
  Invoke-A2AJson -Method "DELETE" -Url "$BaseUrl/requests/queue/pending"
}
Write-Host ("   cancelledCount = {0}" -f $clear.data.cancelledCount)

Write-Host "2) Creating request…" -ForegroundColor Cyan
$createBody = @{
  context = @{
    version = "1.0"
    session_id = "smoke"
    project_path = $ProjectPath
    new_task = @($Message)
  }
  message = $Message
}
$created = Invoke-WithRetry -Label "create request" -Action {
  Invoke-A2AJson -Method "POST" -Url "$BaseUrl/requests" -Body $createBody
}
$promiseId = $created.data.promiseId
Write-Host ("   promiseId = {0}" -f $promiseId)

Write-Host "3) Polling result…" -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ($true) {
  if ((Get-Date) -gt $deadline) {
    throw "Timeout waiting for result for $promiseId (waited ${TimeoutSeconds}s)."
  }

  $res = Invoke-A2AJson -Method "GET" -Url "$BaseUrl/requests/$promiseId/result"
  $status = $res.data.status

  if ($status -eq "completed" -or $status -eq "failed") {
    Write-Host ("   status = {0}" -f $status)
    $res | ConvertTo-Json -Depth 30
    break
  }

  Start-Sleep -Seconds $PollSeconds
}

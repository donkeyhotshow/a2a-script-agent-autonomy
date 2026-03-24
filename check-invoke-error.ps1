param(
  [string]$SessionId = 'sess_1774313243950',
  [string]$PayloadFile = "$PSScriptRoot\a2a-client\storage\sessions\$SessionId\2\request-to-server.json",
  [string]$Url = 'http://localhost:3000/api/v1/invoke'
)

$body = Get-Content $PayloadFile -Raw
try {
  $response = Invoke-RestMethod -Uri $Url -Method Post -ContentType 'application/json' -Body $body -Verbose
  Write-Host "Success response:" -ForegroundColor Green
  $response | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Request failed:" -ForegroundColor Red
  $_.Exception.Response | Format-List *
  if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host "Body:" -ForegroundColor Yellow
    $reader.ReadToEnd()
  }
}

# Origin: a2a-client/packages/sdk/scripts/test-server-connection.ts
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$sdkDir = Join-Path $repo 'a2a-client\packages\sdk'
Push-Location $sdkDir
try { npx tsx scripts/test-server-connection.ts @args } finally { Pop-Location }

# Origin: scripts/prod-test.js
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
Push-Location $repo
try { node scripts/prod-test.js @args } finally { Pop-Location }

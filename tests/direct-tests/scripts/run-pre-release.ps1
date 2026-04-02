# Origin: scripts/pre-release.js
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
Push-Location $repo
try { node scripts/pre-release.js @args } finally { Pop-Location }

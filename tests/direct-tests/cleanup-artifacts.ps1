$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location $repo
try {
  node tests/direct-tests/cleanup-artifacts.js @args
} finally {
  Pop-Location
}


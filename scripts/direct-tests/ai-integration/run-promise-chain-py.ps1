# Run AI integration promise chain test from repo root. Origin: ai-integration/scripts/tests/promise_chain.py
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$aiDir = Join-Path $repo 'ai-integration'
Push-Location $aiDir
try { python scripts/tests/promise_chain.py @args } finally { Pop-Location }

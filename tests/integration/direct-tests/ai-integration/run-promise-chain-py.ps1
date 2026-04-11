# Run AI integration promise chain test from repo root. Origin: a2a-ai-hub/scripts/tests/promise_chain.py
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$aiDir = Join-Path $repo 'a2a-ai-hub'
Push-Location $aiDir
try { python scripts/tests/promise_chain.py @args } finally { Pop-Location }

# Origin: ai-integration/scripts/test_promise_simulate.py
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location (Join-Path $repo 'ai-integration')
try { python scripts/test_promise_simulate.py @args } finally { Pop-Location }

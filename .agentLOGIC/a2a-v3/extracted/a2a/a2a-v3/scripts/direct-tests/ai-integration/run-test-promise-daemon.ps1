# Origin: ai-integration/scripts/test_promise_daemon.py
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location (Join-Path $repo 'ai-integration')
try { python scripts/test_promise_daemon.py @args } finally { Pop-Location }

# Origin: a2a-ai-hub/scripts/test_promise_simulate.py
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
Push-Location (Join-Path $repo 'a2a-ai-hub')
try { python scripts/test_promise_simulate.py @args } finally { Pop-Location }

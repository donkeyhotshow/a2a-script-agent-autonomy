# Origin: a2a-ai-hub/scripts/tests/promise_chain.py
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
Push-Location (Join-Path $repo 'a2a-ai-hub')
try { python scripts/tests/promise_chain.py @args } finally { Pop-Location }

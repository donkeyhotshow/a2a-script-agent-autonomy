# Origin: ai-integration/scripts/tests/promise_chain.py
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
Push-Location (Join-Path $repo 'ai-integration')
try { python scripts/tests/promise_chain.py @args } finally { Pop-Location }

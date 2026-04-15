# Origin: ai-integration/scripts/test_cleanup.py
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
Push-Location (Join-Path $repo 'ai-integration')
try { python scripts/test_cleanup.py @args } finally { Pop-Location }

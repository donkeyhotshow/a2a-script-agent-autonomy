# Origin: a2a-ai-hub/scripts/test_cleanup.py
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
Push-Location (Join-Path $repo 'a2a-ai-hub')
try { python scripts/test_cleanup.py @args } finally { Pop-Location }

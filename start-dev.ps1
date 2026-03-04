cd a2a-server
 = Start-Process npm -ArgumentList 'run','dev:no-auth' -RedirectStandardOutput '..\server-dev.log' -RedirectStandardError '..\server-dev.log' -PassThru
Start-Sleep -Seconds 8
if (-not .HasExited) { .Kill() }

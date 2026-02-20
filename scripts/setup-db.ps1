# A2A Server - PostgreSQL setup script (run from project root)
# Usage: .\scripts\setup-db.ps1

$ErrorActionPreference = 'Stop'

$DbUser = 'a2a'
$DbPass = '51202368Wmid@'
$DbName = 'a2a_server'
$DbHost = 'localhost'
$DbPort = 5432

$psqlPaths = @(
    'C:\Program Files\PostgreSQL\16\bin\psql.exe',
    'C:\Program Files\PostgreSQL\15\bin\psql.exe',
    'C:\Program Files\PostgreSQL\14\bin\psql.exe',
    'psql'
)

$psql = $null
foreach ($p in $psqlPaths) {
    if (Get-Command $p -ErrorAction SilentlyContinue) {
        $psql = $p
        break
    }
    if (Test-Path $p) {
        $psql = $p
        break
    }
}

if (-not $psql) {
    Write-Error "psql not found. Install PostgreSQL or add it to PATH."
    exit 1
}

Write-Host "Using: $psql"
Write-Host "Creating user '$DbUser' and database '$DbName'..."

$sql = @"
DROP DATABASE IF EXISTS $DbName;
DROP USER IF EXISTS $DbUser;
CREATE USER $DbUser WITH PASSWORD '$DbPass' LOGIN CREATEDB;
CREATE DATABASE $DbName OWNER $DbUser;
\c $DbName
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS vector; EXCEPTION WHEN OTHERS THEN NULL; END $$;
GRANT ALL ON SCHEMA public TO $DbUser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DbUser;
"@

$PgUser = if ($env:PGUSER) { $env:PGUSER } else { 'postgres' }
$sql | & $psql -h $DbHost -p $DbPort -U $PgUser 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Error "Setup failed. Ensure PostgreSQL is running."
    Write-Host "Set postgres password: `$env:PGPASSWORD='your_postgres_password'; .\scripts\setup-db.ps1"
    exit 1
}

Write-Host "Database setup complete."
Write-Host "Updating .env..."

$DbPassEnc = $DbPass -replace '@', '%40' -replace ':', '%3A' -replace '/', '%2F'
$envPath = Join-Path $PSScriptRoot '..\a2a-server\.env'
$envContent = Get-Content $envPath -Raw
$newUrl = "postgresql://${DbUser}:${DbPassEnc}@${DbHost}:${DbPort}/${DbName}?schema=public"
$envContent = $envContent -replace 'DATABASE_URL="[^"]*"', "DATABASE_URL=`"$newUrl`""
Set-Content $envPath $envContent -NoNewline

Write-Host "Running Prisma migrate..."
Push-Location (Join-Path $PSScriptRoot '..\a2a-server')
npx prisma migrate dev --name init
Pop-Location

Write-Host "Done. Start server: npm run dev"

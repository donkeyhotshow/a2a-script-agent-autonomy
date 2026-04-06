# `execute-command`: allowlist includes arbitrary-execution tools

**File:** `a2a-server/src/actions/handlers/command-execution.ts` (`ALLOWED_COMMANDS`, `validateCommand`, `runCommand`)

**Problem:** Whitelist includes `node`, `npx`, `docker`, `docker-compose`, `curl`, `wget`, `npm`, etc. With an allowed first token, callers (e.g. LLM-driven `execute-command`) can run `node -e '…'`, `npx` arbitrary packages, or network/file exfiltration via `curl`/`wget`, far beyond “read-only” tooling.

**Done when:** Split tiers (read-only vs build vs network); disable high-risk binaries by default; require env flag for `node`/`npx`/`docker`; keep `shell: true` off unless same gate.

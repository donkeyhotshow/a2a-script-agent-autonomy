# Express JSON / urlencoded body limit 10 MB

**File:** `a2a-server/src/app.ts` (~lines 21–22)

**Problem:** `express.json({ limit: '10mb' })` and `urlencoded` with the same cap allow large bodies per request — easier memory/CPU abuse on a public host than a tight default.

**Done when:** Lower default + env override; or reverse-proxy limits + request size metrics.

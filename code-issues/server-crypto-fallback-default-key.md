# `getEncryptionKey`: falls back to hardcoded dev string

**File:** `a2a-server/src/utils/crypto.ts` (~lines 7–9)

**Problem:** If both `ENCRYPTION_KEY` and `JWT_SECRET` are unset, code uses `'default-dev-key-32-chars-min!'`. Same ciphertext is trivially breakable across installs; production misconfig silently degrades to a public default.

**Done when:** Throw on missing key when `NODE_ENV === 'production'` (or `A2A_REQUIRE_SECRETS=1`); no silent default outside explicit dev flag.

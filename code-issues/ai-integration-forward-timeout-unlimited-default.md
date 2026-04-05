# AI integration proxy: unlimited forward timeout by default

**File:** `ai-integration/proxy/config.py` (`forward_timeout_seconds`, `provider_timeout` — defaults **0** = no limit per comments)

**Problem:** A stuck or slow upstream LLM can tie up worker threads / connections indefinitely, easing DoS and resource exhaustion.

**Done when:** Positive default cap (with env override), document in `ENV-MATRIX`; align with `ollama_timeout` story.

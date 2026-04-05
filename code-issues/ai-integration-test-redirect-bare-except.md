# ai-integration: bare `except` in test script

**File:** `ai-integration/test_redirect.py` (~line 38)

**Problem:** `except:` swallows all exceptions when parsing non-JSON error bodies — hides bugs and breaks on `KeyboardInterrupt`.

**Done when:** `except json.JSONDecodeError:` (or `ValueError`) and optionally log.

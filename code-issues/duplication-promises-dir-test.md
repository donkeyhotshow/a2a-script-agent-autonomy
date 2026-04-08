# Code Duplication: PROMISES_DIR Monkeypatch in Test File

## Description
The PROMISES_DIR monkeypatch setup (`monkeypatch.setattr(pc, "PROMISES_DIR", base)` and `monkeypatch.setattr(ps, "PROMISES_DIR", base)`) is repeated in 2 test functions in ai-integration/tests/test_promise_queue_semantics.py.

## Files Involved
- `ai-integration/tests/test_promise_queue_semantics.py` (lines 35-36 and 53-54)

## Recommendation
Extract into a helper or fixture.
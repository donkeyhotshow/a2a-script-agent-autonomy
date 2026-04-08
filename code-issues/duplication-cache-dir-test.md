# Code Duplication: Cache Dir Monkeypatch in Test File

## Description
The line `monkeypatch.setattr(c, "CACHE_DIR", str(tmp_path / "cache"))` is repeated in 9 test functions in ai-integration/tests/test_llm_cache.py.

## Files Involved
- `ai-integration/tests/test_llm_cache.py` (lines 10, 42, 72, 106, 138, 161, 194, 226, 246)

## Recommendation
Refactor into a pytest fixture for better maintainability.
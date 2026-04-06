# Human-review test run (ai-integration)

**When:** 2026-04-05T23:19:31.974675+00:00
**Exit code:** 0

## Summary

See pytest output below.

## Console

```text
============================= test session starts =============================
platform win32 -- Python 3.13.12, pytest-9.0.2, pluggy-1.6.0 -- C:\Users\dev\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\python.exe
cachedir: .pytest_cache
rootdir: C:\workspace\org-carrier\a2a-script-agent\ai-integration
configfile: pyproject.toml
plugins: anyio-4.12.1, asyncio-1.3.0
asyncio: mode=Mode.STRICT, debug=False, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
collecting ... collected 4 items

tests/human-review/test_extract_prompt_multimodal.py::test_extract_prompt_collects_text_from_multimodal_message_content PASSED [ 25%]
tests/human-review/test_extract_prompt_numeric_content.py::test_extract_prompt_stringifies_numeric_message_content PASSED [ 50%]
tests/human-review/test_extract_prompt_tool_calls.py::test_extract_prompt_includes_tool_call_metadata_for_rule_matching PASSED [ 75%]
tests/human-review/test_match_when_path_trailing_slash.py::test_match_when_path_treats_trailing_slash_as_equivalent PASSED [100%]

============================== 4 passed in 1.25s ==============================


```

## Your confirmation (edit below)

- [ ] I reviewed failures above — real bugs vs wrong expectations
- [ ] Notes:


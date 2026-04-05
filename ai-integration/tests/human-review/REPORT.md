# Human-review test run (ai-integration)

**When:** 2026-04-05T22:49:49.002685+00:00
**Exit code:** 1

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
collecting ... collected 1 item

tests/human-review/test_extract_prompt_multimodal.py::test_extract_prompt_collects_text_from_multimodal_message_content FAILED [100%]

================================== FAILURES ===================================
______ test_extract_prompt_collects_text_from_multimodal_message_content ______
tests\human-review\test_extract_prompt_multimodal.py:18: in test_extract_prompt_collects_text_from_multimodal_message_content
    assert "hello multimodal" in _extract_prompt(body)
E   AssertionError: assert 'hello multimodal' in ''
E    +  where '' = _extract_prompt({'messages': [{'content': [{'text': 'hello multimodal', 'type': 'text'}], 'role': 'user'}]})
=========================== short test summary info ===========================
FAILED tests/human-review/test_extract_prompt_multimodal.py::test_extract_prompt_collects_text_from_multimodal_message_content
============================== 1 failed in 1.21s ==============================


```

## Your confirmation (edit below)

- [ ] I reviewed failures above — real bugs vs wrong expectations
- [ ] Notes:


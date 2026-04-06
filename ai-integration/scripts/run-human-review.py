#!/usr/bin/env python3
"""
Run tests/human-review only (default pytest ignores this folder).
Overwrites tests/human-review/REPORT.md.
"""
from __future__ import annotations

import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HR = ROOT / "tests" / "human-review"
REPORT = HR / "REPORT.md"


def main() -> int:
    HR.mkdir(parents=True, exist_ok=True)
    cmd = [
        sys.executable,
        "-m",
        "pytest",
        str(HR),
        "-v",
        "--tb=short",
        "--color=no",
    ]
    proc = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)
    stamp = datetime.now(timezone.utc).isoformat()
    body = f"""# Human-review test run (ai-integration)

**When:** {stamp}
**Exit code:** {proc.returncode}

## Summary

See pytest output below.

## Console

```text
{proc.stdout}
{proc.stderr}
```

## Your confirmation (edit below)

- [ ] I reviewed failures above — real bugs vs wrong expectations
- [ ] Notes:

"""
    REPORT.write_text(body, encoding="utf-8")
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())

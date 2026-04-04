#!/usr/bin/env python3
"""
If config/providers.json is missing, copy from config/providers.example.json.
Run after clone or CI before starting the proxy.
"""
from __future__ import annotations

import pathlib
import shutil
import sys


def main() -> int:
    root = pathlib.Path(__file__).resolve().parent.parent
    cfg = root / "config"
    dst = cfg / "providers.json"
    src = cfg / "providers.example.json"
    if dst.exists():
        return 0
    if not src.is_file():
        print(f"Missing template: {src}", file=sys.stderr)
        return 1
    shutil.copy(src, dst)
    print(f"Created {dst} from {src}")
    print("Edit api_keys and providers.z_ai.api_key — keys belong in this file, not .env.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

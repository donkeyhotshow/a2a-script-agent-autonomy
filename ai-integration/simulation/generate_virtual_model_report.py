"""
Generate Markdown report by running requests against the proxy and capturing responses.

Use-case: smoke-test a "virtual/big" model (e.g. rnj-L) without changing client code.
The report file is overwritten on every run.
"""

from __future__ import annotations

import argparse
import json
import logging
import time
import os
import subprocess
from typing import Any, Optional

import requests

_log = logging.getLogger(__name__)


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2)


def _safe_json(resp: requests.Response) -> Optional[Any]:
    try:
        return resp.json()
    except Exception as e:
        _log.warning(
            "response JSON parse failed status=%s url=%s: %s",
            resp.status_code,
            getattr(resp, "url", ""),
            e,
        )
        return None


def _request(
    session: requests.Session,
    *,
    method: str,
    url: str,
    params: Optional[dict] = None,
    json_body: Optional[dict] = None,
    timeout: int = 30,
) -> dict:
    started = time.time()
    resp = session.request(method, url, params=params, json=json_body, timeout=timeout)
    elapsed_ms = int((time.time() - started) * 1000)
    body_json = _safe_json(resp)
    body_text = None if body_json is not None else resp.text

    return {
        "request": {
            "method": method,
            "url": url,
            "params": params or {},
            "json": json_body,
        },
        "response": {
            "status_code": resp.status_code,
            "elapsed_ms": elapsed_ms,
            "headers": {k: v for k, v in resp.headers.items()},
            "json": body_json,
            "text": body_text,
        },
    }


def _md_block(title: str, payload: dict) -> str:
    req = payload["request"]
    res = payload["response"]
    lines: list[str] = []
    lines.append(f"## {title}")
    lines.append("")
    lines.append("### Request")
    lines.append("```json")
    lines.append(_json_dumps(req))
    lines.append("```")
    lines.append("")
    lines.append(f"### Response ({res['status_code']}, {res['elapsed_ms']}ms)")
    lines.append("```json")
    lines.append(_json_dumps({k: res[k] for k in ["status_code", "elapsed_ms", "headers"]}))
    lines.append("```")
    lines.append("")
    if res["json"] is not None:
        lines.append("### Body (json)")
        lines.append("```json")
        lines.append(_json_dumps(res["json"]))
        lines.append("```")
    else:
        lines.append("### Body (text)")
        lines.append("```text")
        lines.append(res["text"] or "")
        lines.append("```")
    lines.append("")
    return "\n".join(lines)


def _poll_promise(session: requests.Session, base_url: str, promise_id: str, timeout_seconds: int) -> dict:
    started = time.time()
    while True:
        status = _request(session, method="GET", url=f"{base_url}/promise/{promise_id}", timeout=10)
        if status["response"]["status_code"] == 200:
            break
        if time.time() - started > timeout_seconds:
            return {"error": "promise_timeout", "promiseId": promise_id, "last_status": status}
        time.sleep(0.05)

    result = _request(session, method="GET", url=f"{base_url}/promise/{promise_id}/response", timeout=30)
    return {"promiseId": promise_id, "status": status, "result": result}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:11434", help="Proxy base URL")
    parser.add_argument("--model", default="rnj-L", help="Virtual/big model name")
    parser.add_argument("--out", default="docs/virtual_model_report.md", help="Markdown report path (overwritten)")
    parser.add_argument("--timeout", type=int, default=30, help="HTTP timeout seconds")
    parser.add_argument("--promise-wait", type=int, default=10, help="Max seconds to wait for promise completion")
    parser.add_argument("--start-proxy", action="store_true", help="Start proxy.py automatically for the run")
    parser.add_argument("--proxy-port", type=int, default=11436, help="Proxy port when using --start-proxy")
    parser.add_argument("--config", default="docs/ai-hub.config.example.json", help="AI_HUB_CONFIG path when using --start-proxy")
    args = parser.parse_args()
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")

    base_url = args.base_url.rstrip("/")
    proc: subprocess.Popen | None = None

    if args.start_proxy:
        cfg_path = os.path.abspath(args.config)
        env = os.environ.copy()
        env["AI_HUB_CONFIG"] = cfg_path
        env["PROXY_PORT"] = str(args.proxy_port)
        env.setdefault("OLLAMA_HOST", "http://localhost:11435")
        env.setdefault("FORWARD_TIMEOUT_SECONDS", "2")

        base_url = f"http://localhost:{args.proxy_port}"

        creationflags = 0
        if os.name == "nt":
            creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)

        proc = subprocess.Popen(
            ["python", "proxy.py"],
            env=env,
            cwd=os.path.dirname(os.path.abspath(__file__)),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creationflags,
        )

    blocks: list[str] = []
    blocks.append("# Virtual Model Report")
    blocks.append("")
    blocks.append(f"- generated_at: `{_now_iso()}`")
    blocks.append(f"- base_url: `{base_url}`")
    blocks.append(f"- model: `{args.model}`")
    blocks.append("")

    try:
        with requests.Session() as session:
            # Preflight: ensure we're talking to *our* proxy, not some other service.
            health: Optional[dict] = None
            preflight_deadline = time.time() + (20 if args.start_proxy else 0)
            while True:
                try:
                    health = _request(session, method="GET", url=f"{base_url}/health", timeout=min(args.timeout, 10))
                    break
                except requests.RequestException:
                    if not args.start_proxy or time.time() > preflight_deadline:
                        raise
                    time.sleep(0.25)

            if health["response"]["status_code"] != 200 or not isinstance(health["response"]["json"], dict):
                sc = health["response"]["status_code"]
                print(f"[X] Unexpected /health response from {base_url} (status={sc}).")
                print("    This usually means the proxy isn't running, or another service is bound to this port.")
                print("    Start it first: python proxy.py")
                return 2

            if health["response"]["json"].get("status") != "running":
                print("[X] /health does not look like our proxy (missing status=running).")
                print("    Start it first: python proxy.py")
                return 2

            blocks.append(_md_block("Health", health))
            blocks.append(_md_block("Tags (api/tags)", _request(session, method="GET", url=f"{base_url}/api/tags", timeout=args.timeout)))
            blocks.append(
                _md_block(
                    "Show (api/show?model=...)",
                    _request(session, method="GET", url=f"{base_url}/api/show", params={"model": args.model}, timeout=args.timeout),
                )
            )

            blocks.append(
                _md_block(
                    "Generate (sync, simulated prompt)",
                    _request(
                        session,
                        method="POST",
                        url=f"{base_url}/api/generate",
                        json_body={"model": args.model, "prompt": "SIMULATE: smoke test rnj-L", "stream": False},
                        timeout=args.timeout,
                    ),
                )
            )

            promise_req = _request(
                session,
                method="POST",
                url=f"{base_url}/api/generate",
                params={"promise": "1"},
                json_body={"model": args.model, "prompt": "SIMULATE: promise smoke test rnj-L", "stream": False},
                timeout=args.timeout,
            )
            blocks.append(_md_block("Generate (promise=1)", promise_req))

            promise_id = None
            if isinstance(promise_req["response"]["json"], dict):
                promise_id = promise_req["response"]["json"].get("promiseId")
            if isinstance(promise_id, str) and promise_id:
                poll = _poll_promise(session, base_url, promise_id, args.promise_wait)
                blocks.append("## Promise result")
                blocks.append("")
                blocks.append("```json")
                blocks.append(_json_dumps(poll))
                blocks.append("```")
                blocks.append("")
    finally:
        if proc is not None:
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except Exception as e:
                _log.warning("subprocess terminate/wait failed: %s", e, exc_info=True)
                try:
                    proc.kill()
                except Exception as e2:
                    _log.warning("subprocess kill failed: %s", e2, exc_info=True)

    content = "\n".join(blocks)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[OK] Wrote report: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

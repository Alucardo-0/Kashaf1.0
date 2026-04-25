"""Minimal async HTTP API for DNS -> engine -> callback integration."""

from __future__ import annotations

import argparse
import hmac
import json
import os
import threading
import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4

from integration.service import run_engine_job, send_callback

JOBS: dict[str, dict[str, Any]] = {}
JOBS_LOCK = threading.Lock()
EXECUTOR = ThreadPoolExecutor(max_workers=2)

ENGINE_TOKEN_HEADER = "X-Engine-Token"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _read_json_body(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    length = int(handler.headers.get("Content-Length", "0"))
    raw = handler.rfile.read(length) if length > 0 else b"{}"
    return json.loads(raw.decode("utf-8"))


def _run_async_job(job_id: str, payload: dict[str, Any]) -> None:
    callback_url = payload.get("callback_url")
    callback_headers = payload.get("callback_headers") or {}

    with JOBS_LOCK:
        JOBS[job_id]["status"] = "running"
        JOBS[job_id]["started_at"] = _now_iso()

    try:
        result = run_engine_job(payload)
        with JOBS_LOCK:
            JOBS[job_id]["status"] = "completed"
            JOBS[job_id]["completed_at"] = _now_iso()
            JOBS[job_id]["result"] = result

        if callback_url:
            callback_payload = {
                "job_id": job_id,
                "status": "completed",
                "result": result,
                "metadata": payload.get("metadata", {}),
            }
            send_callback(callback_url, callback_payload, callback_headers)
            with JOBS_LOCK:
                JOBS[job_id]["callback_sent_at"] = _now_iso()

    except Exception as exc:  # noqa: BLE001
        error_payload = {
            "message": str(exc),
            "traceback": traceback.format_exc(limit=5),
        }
        with JOBS_LOCK:
            JOBS[job_id]["status"] = "failed"
            JOBS[job_id]["completed_at"] = _now_iso()
            JOBS[job_id]["error"] = error_payload

        if callback_url:
            callback_payload = {
                "job_id": job_id,
                "status": "failed",
                "error": error_payload,
                "metadata": payload.get("metadata", {}),
            }
            try:
                send_callback(callback_url, callback_payload, callback_headers)
            except Exception:
                with JOBS_LOCK:
                    JOBS[job_id]["callback_error"] = "Failed to deliver error callback"


def _expected_engine_token() -> str:
    """Shared secret used to authorize inbound DNS -> engine requests."""
    return os.getenv("KASHAF_ENGINE_TOKEN", "").strip()


def _is_authorized(
    handler: BaseHTTPRequestHandler,
    payload: dict[str, Any] | None = None,
    path: str | None = None,
) -> bool:
    """Validates inbound token via header, with a DNS payload fallback for job submit."""
    expected = _expected_engine_token()
    if not expected:
        # Development mode: auth disabled when env var is not set.
        return True

    provided = (handler.headers.get(ENGINE_TOKEN_HEADER) or "").strip()
    if hmac.compare_digest(provided, expected):
        return True

    # DNS can carry the same shared token in callback_headers for job submits.
    if path == "/api/v1/engine/jobs" and isinstance(payload, dict):
        callback_headers = payload.get("callback_headers") or {}
        if isinstance(callback_headers, dict):
            fallback = str(callback_headers.get(ENGINE_TOKEN_HEADER, "")).strip()
            if fallback and hmac.compare_digest(fallback, expected):
                return True

    return False


class EngineHandler(BaseHTTPRequestHandler):
    """Request handler for the integration API."""

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)

        if parsed.path == "/health":
            _json_response(self, 200, {"ok": True, "service": "kashaf-engine"})
            return

        if parsed.path.startswith("/api/v1/engine/jobs/"):
            if not _is_authorized(self):
                _json_response(self, 401, {"error": "Unauthorized"})
                return
            job_id = parsed.path.rsplit("/", 1)[-1]
            with JOBS_LOCK:
                job = JOBS.get(job_id)
            if not job:
                _json_response(self, 404, {"error": "Job not found"})
                return
            _json_response(self, 200, job)
            return

        _json_response(self, 404, {"error": "Route not found"})

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)

        try:
            payload = _read_json_body(self)
        except json.JSONDecodeError:
            _json_response(self, 400, {"error": "Invalid JSON body"})
            return

        if parsed.path.startswith("/api/v1/engine/") and not _is_authorized(self, payload, parsed.path):
            _json_response(self, 401, {"error": "Unauthorized"})
            return

        if parsed.path == "/api/v1/engine/profile":
            try:
                result = run_engine_job(payload)
                _json_response(self, 200, {"status": "completed", "result": result})
            except Exception as exc:  # noqa: BLE001
                _json_response(self, 400, {"status": "failed", "error": str(exc)})
            return

        if parsed.path == "/api/v1/engine/jobs":
            job_id = str(payload.get("job_id") or uuid4())
            with JOBS_LOCK:
                existing = JOBS.get(job_id)
                if existing and existing["status"] in ("queued", "running"):
                    # Job is already in-flight — return current status without re-queuing
                    _json_response(self, 200, existing)
                    return

                # New job or re-submit of a completed/failed job — (re-)queue it
                record = {
                    "job_id": job_id,
                    "status": "queued",
                    "submitted_at": _now_iso(),
                    "metadata": payload.get("metadata", {}),
                }
                JOBS[job_id] = record
            EXECUTOR.submit(_run_async_job, job_id, payload)
            _json_response(self, 202, record)
            return

        _json_response(self, 404, {"error": "Route not found"})

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return


def serve(host: str = "0.0.0.0", port: int = 8080) -> None:
    """Run the integration HTTP server."""
    if not _expected_engine_token():
        print("WARNING: KASHAF_ENGINE_TOKEN is not set; inbound auth is disabled.")
    server = ThreadingHTTPServer((host, port), EngineHandler)
    print(f"Engine integration API listening on http://{host}:{port}")
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Kashaf integration API")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    serve(args.host, args.port)


if __name__ == "__main__":
    main()


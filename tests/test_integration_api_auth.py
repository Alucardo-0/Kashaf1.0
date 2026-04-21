import os

from integration import api


class _DummyHandler:
    def __init__(self, token: str | None = None):
        self.headers = {}
        if token is not None:
            self.headers[api.ENGINE_TOKEN_HEADER] = token


def test_is_authorized_allows_when_token_not_configured(monkeypatch):
    monkeypatch.delenv("KASHAF_ENGINE_TOKEN", raising=False)
    assert api._is_authorized(_DummyHandler()) is True


def test_is_authorized_accepts_correct_token(monkeypatch):
    monkeypatch.setenv("KASHAF_ENGINE_TOKEN", "secret-token")
    assert api._is_authorized(_DummyHandler("secret-token")) is True


def test_is_authorized_rejects_invalid_token(monkeypatch):
    monkeypatch.setenv("KASHAF_ENGINE_TOKEN", "secret-token")
    assert api._is_authorized(_DummyHandler("wrong-token")) is False


def test_expected_engine_token_is_stripped(monkeypatch):
    monkeypatch.setenv("KASHAF_ENGINE_TOKEN", "  abc123  ")
    assert api._expected_engine_token() == "abc123"


def test_is_authorized_accepts_callback_header_fallback_for_jobs(monkeypatch):
    monkeypatch.setenv("KASHAF_ENGINE_TOKEN", "secret-token")
    handler = _DummyHandler()  # no inbound header
    payload = {"callback_headers": {api.ENGINE_TOKEN_HEADER: "secret-token"}}
    assert api._is_authorized(handler, payload, "/api/v1/engine/jobs") is True



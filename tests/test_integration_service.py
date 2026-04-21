import pandas as pd

from integration.service import run_engine_job


def test_run_engine_job_validates_required_fields():
    try:
        run_engine_job({"unit": "wg", "events": []})
        assert False, "Expected ValueError for missing player_name"
    except ValueError as exc:
        assert "player_name" in str(exc)


def test_run_engine_job_rejects_invalid_unit():
    try:
        run_engine_job({"player_name": "A", "unit": "gk", "events": []})
        assert False, "Expected ValueError for invalid unit"
    except ValueError as exc:
        assert "must be one of" in str(exc)


def test_dataframe_filtering_requires_player_rows(monkeypatch):
    fake_df = pd.DataFrame(
        [{
            "player_name": "Other Player",
            "match_id": "1",
            "minutes": 90,
            "action_type": "pass",
            "start_x": 50,
            "start_y": 50,
            "end_x": 60,
            "end_y": 60,
            "outcome": True,
            "body_part": "foot",
            "set_piece": False,
        }]
    )

    def _fake_builder(payload):
        return fake_df

    monkeypatch.setattr("integration.service._build_dataframe", _fake_builder)

    try:
        run_engine_job({"player_name": "Missing", "unit": "wg", "events": []})
        assert False, "Expected ValueError for missing player rows"
    except ValueError as exc:
        assert "No events found" in str(exc)


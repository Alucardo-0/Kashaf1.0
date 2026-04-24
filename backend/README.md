# Kashaf Engine

Player profiling and archetype clustering engine.

## Integration overview

This repo includes a lightweight HTTP integration layer so the KASHAF platform can:
1. send tagged match data to the engine,
2. receive a scouting report,
3. display it to scouts (and later player-facing views).

Integration modules:
- `integration/service.py`: payload validation + report execution
- `integration/api.py`: HTTP endpoints + async jobs + callback delivery

## Quick start

Set `KASHAF_ENGINE_TOKEN` in production so inbound KASHAF -> engine calls are authenticated via `X-Engine-Token`.

```powershell
$env:KASHAF_ENGINE_TOKEN = "replace-with-strong-shared-secret"
pip install -r requirements.txt
python -m integration.api --host 127.0.0.1 --port 8080
```

## API contract

### 1) Synchronous profile (immediate response)
`POST /api/v1/engine/profile`

Example body:
```json
{
  "player_name": "Mohamed Salah",
  "unit": "wg",
  "events": [
    {
      "player_name": "Mohamed Salah",
      "match_id": "match_001",
      "minutes": 90,
      "action_type": "pass",
      "start_x": 60,
      "start_y": 40,
      "end_x": 75,
      "end_y": 38,
      "outcome": true,
      "body_part": "foot",
      "set_piece": false
    }
  ]
}
```

### 2) Async job + callback (recommended for production)
`POST /api/v1/engine/jobs`

Headers:
- `X-Engine-Token: <KASHAF_ENGINE_TOKEN>` (required when token is configured)

Example body:
```json
{
  "job_id": "kashaf-match-1234-salah",
  "player_name": "Mohamed Salah",
  "unit": "wg",
  "events": [],
  "callback_url": "https://your-kashaf-domain/api/engine/callback",
  "callback_headers": {
    "X-Engine-Token": "replace-this"
  },
  "metadata": {
    "matchId": "1234",
    "analystId": "u_99"
  }
}
```

Check status:
- `GET /api/v1/engine/jobs/{job_id}`
- `GET /health`

Notes:
- `job_id` is idempotent: posting the same `job_id` again returns the existing job record and does not enqueue duplicate work.

## Callback payload sent back to KASHAF

Success:
```json
{
  "job_id": "kashaf-match-1234-salah",
  "status": "completed",
  "result": {
    "player_name": "Mohamed Salah",
    "unit": "wg",
    "report": {}
  },
  "metadata": {
    "matchId": "1234",
    "analystId": "u_99"
  }
}
```

Failure:
```json
{
  "job_id": "kashaf-match-1234-salah",
  "status": "failed",
  "error": {
    "message": "..."
  },
  "metadata": {
    "matchId": "1234",
    "analystId": "u_99"
  }
}
```



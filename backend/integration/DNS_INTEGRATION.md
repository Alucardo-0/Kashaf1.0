# DNS -> Kashaf integration notes

Use this from the DNS app when analyst tagging is complete.

## 1) Send a job to Kashaf

```ts
await fetch(`${process.env.KASHAF_ENGINE_URL}/api/v1/engine/jobs`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Engine-Token": process.env.KASHAF_ENGINE_TOKEN ?? "",
  },
  body: JSON.stringify({
    job_id: `dns-${matchId}-${playerName}`,
    player_name: playerName,
    unit,
    events, // array in Kashaf schema
    callback_url: `${process.env.DNS_PUBLIC_URL}/api/engine/callback`,
    callback_headers: {
      "X-Engine-Token": process.env.KASHAF_ENGINE_TOKEN ?? "",
    },
    metadata: { matchId, analystId, taggedAt: new Date().toISOString() },
  }),
});
```

## 2) Receive callback in DNS

Callback body from Kashaf:

```json
{
  "job_id": "dns-...",
  "status": "completed",
  "result": {
    "player_name": "...",
    "unit": "...",
    "report": {}
  },
  "metadata": {}
}
```

or

```json
{
  "job_id": "dns-...",
  "status": "failed",
  "error": {
    "message": "...",
    "traceback": "..."
  },
  "metadata": {}
}
```

## 3) Save in DNS database

Store callback payload by `job_id` and `matchId`, then render report for scouts.


# Kashaf 🛡️ — AI Football Scouting Platform

Kashaf is a full-stack football intelligence platform. An analyst tags player events during a match, the **Kashaf AI engine** profiles the player into archetypes and finds statistical twins from the StatsBomb dataset, and the results are displayed live on a beautiful report page.

---

## Project Structure

```
Kashaf/
├── backend/          # Python AI engine (FastAPI-style HTTP server)
│   ├── integration/  # API server + service layer
│   ├── models/       # Trained ML models (scaler, classifier per position unit)
│   ├── inference/    # Profiling + twin-finding logic
│   ├── report/       # Report builder
│   └── ...
└── frontend/         # Next.js 16 + Convex real-time backend
    ├── app/          # Pages & API routes
    ├── convex/       # Convex schema, mutations, queries, actions
    └── ...
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| [Bun](https://bun.sh) | ≥ 1.1 |
| Python | ≥ 3.10 |
| Git | any |

> **No Node.js or npm required.** Bun handles everything on the frontend.

---

### 1. Clone

```bash
git clone https://github.com/Alucardo-0/Kashaf1.0.git
cd Kashaf1.0
```

---

### 2. Backend Setup (Python Engine)

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Backend Environment

The engine authenticates incoming requests with `KASHAF_ENGINE_TOKEN`. Set it as an environment variable when starting:

```bash
# Windows PowerShell:
$env:KASHAF_ENGINE_TOKEN="your-secret-token-here"
python -m integration.api --port 8080

# Mac/Linux:
KASHAF_ENGINE_TOKEN=your-secret-token-here python -m integration.api --port 8080
```

---

### 3. Frontend Setup (Next.js + Convex)

```bash
cd frontend

# Install dependencies (uses Bun)
bun install

# Copy environment file
cp .env.example .env.local
```

Then fill in `frontend/.env.local` (see [Environment Variables](#environment-variables) below).

#### Start development

```bash
bun run dev
```

This runs everything in parallel:
- `next dev` — Next.js frontend on `http://localhost:3000`  
- `convex dev` — Convex live sync  
- Python engine on `http://localhost:8080`

---

## Environment Variables

### `frontend/.env.local`

Copy from `frontend/.env.example` and fill in:

```env
# --- Convex (required) ---
# Set automatically by `bunx convex dev`, or fill manually:
CONVEX_DEPLOYMENT=dev:your-project-name
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-project.convex.site

# --- Engine communication ---
# URL where the local Python engine is running
ENGINE_BASE_URL=http://localhost:8080

# Token the Python engine sends back when it finishes a job (callback auth)
# Must match ENGINE_CALLBACK_TOKEN in Convex dashboard → Settings → Environment Variables
ENGINE_CALLBACK_TOKEN=your-engine-callback-token

# Token we send to the Python engine to authenticate our requests
# Must match KASHAF_ENGINE_TOKEN used when starting the Python engine
KASHAF_ENGINE_TOKEN=your-kashaf-engine-token

# Public URL of this Next.js app (used as the callback URL for the engine)
DNS_PUBLIC_URL=http://localhost:3000
```

### Convex Dashboard Environment Variables

Go to [dashboard.convex.dev](https://dashboard.convex.dev) → your project → **Settings** → **Environment Variables** and add:

| Variable | Value |
|---|---|
| `ENGINE_CALLBACK_TOKEN` | Same value as in `.env.local` |
| `KASHAF_ENGINE_TOKEN` | Same value as in `.env.local` |

> **Token alignment rule:** `KASHAF_ENGINE_TOKEN` must match what you pass to the Python engine at startup. `ENGINE_CALLBACK_TOKEN` must match in both `.env.local` AND Convex dashboard.

---

## How It Works

```
[Analyst tags events in browser]
        ↓
[Browser calls Convex Action: getAndQueueEngineJob]
  → Convex prepares payload + saves job as "queued" in DB
  → Returns payload to browser
        ↓
[Browser POSTs to /api/engine/proxy (Next.js)]
  → Next.js adds auth headers
  → Forwards to Python engine at localhost:8080
        ↓
[Python Engine processes the job]
  → Runs ML profiling pipeline
  → POSTs results to /api/engine/callback
        ↓
[Next.js callback route receives results]
  → Verifies ENGINE_CALLBACK_TOKEN
  → Saves report to Convex DB
        ↓
[Match Report page updates live via Convex real-time query]
```

---

## Roles

| Role | Description |
|---|---|
| **Player** | Uploads YouTube match links, views their analysis report |
| **Analyst** | Tags events on the pitch map, submits summary |
| **Scout** | Browses and filters player profiles |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, Framer Motion |
| Real-time DB | Convex |
| Auth | Convex Auth |
| AI Engine | Python, scikit-learn, pandas |
| Runtime | Bun (frontend), CPython (backend) |

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes
4. Push and open a PR against `master`

# Kashaf Engine — AI Player Profiling Backend

Python-based AI engine for positional archetype classification and statistical twin matching. Built on StatsBomb reference data using scikit-learn, CatBoost, and custom feature engineering.

---

## Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [API Contract](#api-contract)
- [ML Pipeline](#ml-pipeline)
- [Position Units & Archetypes](#position-units--archetypes)
- [Feature Engineering](#feature-engineering)
- [Configuration](#configuration)
- [Training](#training)
- [Project Structure](#project-structure)

---

## Architecture

```
                         ┌──────────────────────┐
  Kashaf Frontend ──────►│  integration/api.py  │  HTTP Server
  (POST /jobs)           │  ─ token auth        │
                         │  ─ async job queue    │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │ integration/service.py│  Orchestrator
                         │  ─ validate payload   │
                         │  ─ run pipeline       │
                         │  ─ deliver callback   │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
   ┌──────────▼──┐      ┌──────────▼──┐       ┌─────────▼──────┐
   │ extractors/ │      │ inference/  │       │   report/      │
   │ Feature     │      │ profile.py  │       │ Report builder │
   │ extraction  │──────│ twins.py    │──────►│ (format output)│
   │ per unit    │      │ Classify +  │       └────────────────┘
   └─────────────┘      │ find twins  │
                        └─────────────┘
                              │
                    ┌─────────▼─────────┐
                    │     models/       │
                    │ Trained artifacts │
                    │ (scaler, kmeans,  │
                    │  iforest, index)  │
                    └───────────────────┘
```

---

## Quick Start

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Set auth token (must match KASHAF_ENGINE_TOKEN in frontend/.env.local)
# Windows PowerShell:
$env:KASHAF_ENGINE_TOKEN = "your-64-char-hex-secret"

# Start the engine
python -m integration.api --host 127.0.0.1 --port 8080
```

The engine will be available at `http://localhost:8080`.

---

## API Contract

### Authentication

All endpoints (except `/health`) require the `X-Engine-Token` header when `KASHAF_ENGINE_TOKEN` is set.

### Endpoints

#### `POST /api/v1/engine/jobs` — Async Job (Recommended)

Submit a profiling job. The engine processes it asynchronously and POSTs results to the provided `callback_url`.

**Request:**
```json
{
  "job_id": "dns-<matchId>-<playerId>-<unit>",
  "player_name": "Player Name",
  "unit": "mf",
  "events": [
    {
      "eventType": "pass",
      "outcome": "Successful",
      "originX": 45.5,
      "originY": 32.1,
      "destinationX": 60.0,
      "destinationY": 28.3,
      "videoTimestamp": 142,
      "notes": "",
      "isSetPiece": false
    }
  ],
  "callback_url": "https://your-domain/api/engine/callback",
  "callback_headers": {
    "X-Engine-Token": "<ENGINE_CALLBACK_TOKEN>"
  },
  "metadata": {
    "matchId": "convex-id",
    "playerId": "convex-id",
    "analystId": "convex-id",
    "matchCount": 3
  }
}
```

**Notes:**
- `job_id` is **idempotent** — resubmitting the same ID returns the existing job without re-processing
- `unit` determines which ML model and feature set to use
- Events are concatenated across up to 10 matches for the player

#### `POST /api/v1/engine/profile` — Sync Profile

Same payload as above (without `callback_url`). Returns the report directly in the response. Use for testing only — blocks the caller until profiling completes.

#### `GET /api/v1/engine/jobs/{job_id}` — Job Status

Returns current status of an async job.

#### `GET /health` — Health Check

Returns `{ "status": "ok" }`.

### Callback Payload

**On success:**
```json
{
  "job_id": "dns-...",
  "status": "completed",
  "result": {
    "player_name": "Player Name",
    "unit": "mf",
    "report": {
      "top_archetype": "Box-to-Box",
      "top_pct": 42.35,
      "archetypes": { "Box-to-Box": 42.35, "Pressing MF": 31.20, ... },
      "core_features": { "passes_p90": 34.5, "tackles_per_90": 3.2, ... },
      "context_features": { "progressive_pass_pct": 18.7, ... },
      "twins": [
        { "player_name": "N'Golo Kanté [2018/2019]", "similarity": 87.3, "context": { ... } }
      ],
      "data_warning": null
    }
  },
  "metadata": { "matchId": "...", "playerId": "...", "analystId": "..." }
}
```

**On failure:**
```json
{
  "job_id": "dns-...",
  "status": "failed",
  "error": { "message": "Insufficient events (12 < 150 minimum)" },
  "metadata": { ... }
}
```

---

## ML Pipeline

The profiling pipeline runs in sequence:

1. **Event Mapping** — Map frontend event types/outcomes to internal schema
2. **Feature Extraction** — Position-unit-specific feature extractors compute per-90 metrics
3. **Scaling** — StandardScaler normalizes features using the trained reference distribution
4. **Classification** — Soft K-Means assignment: compute inverse-distance-weighted probabilities to each archetype centroid
5. **Outlier Detection** — Isolation Forest flags statistically unusual profiles
6. **Twin Matching** — Cosine similarity search against the StatsBomb reference index
7. **Report Assembly** — Package archetypes, features, twins, and warnings

### Data Warning

The engine issues a `data_warning` if the input data is sparse:
- Too few events for reliable profiling
- Missing key action types for the position unit
- Low coverage of destination coordinates

---

## Position Units & Archetypes

Each position unit has its own trained model with distinct archetypes:

| Unit | K | Archetypes |
|---|---|---|
| `cb` | 4 | Ball-Playing CB, Stopper, Aerial Specialist, Sweeper |
| `fb` | 3 | Attacking FB, Defensive FB, Overlapping FB |
| `mf` | 4 | Box-to-Box, Deep-Lying Playmaker, Pressing MF, Advanced Playmaker |
| `wg` | 3 | Creative Winger, Inverted Winger, Traditional Winger |
| `st` | 3 | Target Man, Pressing Striker, Link-Up Striker |

Archetype names are determined post-training by inspecting feature distributions per cluster.

---

## Feature Engineering

Features are computed per 90 minutes of play (per-90 normalization). They fall into two categories:

### Core Features
The primary features used for clustering and classification. These vary by position unit but typically include:
- Passes per 90, pass completion %
- Progressive passes per 90, progressive pass %
- Carries per 90, progressive carries per 90
- Tackles per 90, interceptions per 90
- Aerials per 90, aerial win %
- Shots per 90, dribbles per 90

### Context Features
Secondary metrics displayed in the report but not used for clustering:
- Defensive actions per 90
- Long passes per 90
- Penalty area receptions per 90
- Final third entries per 90
- Touches in box per 90

---

## Configuration

All configuration lives in `config/settings.py`:

### Pitch Dimensions
- Normalized to 100×100 coordinate space
- StatsBomb data (120×80) is rescaled on load

### Zone Definitions
- **Thirds:** Own (0–33.3), Middle (33.3–66.7), Final (66.7–100)
- **Wide zones:** Y < 25 or Y > 55
- **Penalty box:** X > 83, 20 < Y < 80

### ML Parameters
| Parameter | Value | Purpose |
|---|---|---|
| `SOFT_ASSIGNMENT_POWER` | 2 | Inverse distance weighting exponent |
| `OUTLIER_STD_THRESHOLD` | 2.5 | Std devs for outlier detection |
| `N_INIT` | 20 | K-Means restarts |
| `MIN_CLUSTER_POPULATION` | 10 | Minimum cluster size |
| `N_TWINS` | 3 | Statistical twins per player |
| `PROGRESSIVE_THRESHOLD_STANDARD` | 10.0 | Progressive pass/carry distance threshold |
| `PROGRESSIVE_THRESHOLD_FINAL_THIRD` | 7.0 | Lower threshold for WG/ST |

### Event Type Mapping
Frontend → Engine mapping:

| Frontend `eventType` | Engine Action |
|---|---|
| `pass` | `pass` |
| `carry` | `carry` |
| `dribble` | `dribble` |
| `shot` | `shot` |
| `reception` | `reception` |
| `interception` | `interception` |
| `clearance` | `clearance` |
| `tackle` | `tackle` |
| `aerial` | `aerial` |
| `foul` | `foul` |

### Outcome Mapping
| Frontend `outcome` | Engine Success |
|---|---|
| `Successful`, `Completed`, `Won`, `Goal`, `On Target` | `true` |
| `Unsuccessful`, `Incomplete`, `Lost`, `Blocked`, `Off Target` | `false` |

---

## Training

### Retraining Models

```bash
# Retrain all position units
python main.py retrain --unit all

# Retrain specific unit
python main.py retrain --unit mf

# Rebuild twin search index
python main.py rebuild-index --unit all
```

### Training Data

Models are trained on the **StatsBomb open data** (free tier). The pipeline:

1. Loads match event data via `extractors/client.py`
2. Aggregates per-player per-season features
3. Filters players below minimum event thresholds
4. Runs KMeans clustering to discover archetypes
5. Removes statistical outliers via Isolation Forest
6. Refits KMeans on cleaned data
7. Saves scaler, centroids, and reference index to `models/`

### Model Artifacts

Stored in `models/<unit>/`:
- `scaler.pkl` — StandardScaler fitted on training data
- `centroids.npy` — KMeans cluster centroids
- `iforest.pkl` — Isolation Forest for outlier detection
- `reference_index.pkl` — Cosine similarity search index (player name + features)

---

## Project Structure

```
backend/
├── integration/            # HTTP API layer
│   ├── api.py              # Endpoints, async job queue, auth middleware
│   └── service.py          # Validation + pipeline orchestration
│
├── inference/              # ML inference
│   ├── profile.py          # Soft K-Means classification
│   └── twins.py            # Cosine similarity twin search
│
├── extractors/             # Feature extraction
│   └── client.py           # StatsBomb data client
│
├── features/               # Feature engineering
│   └── (per-unit feature computers)
│
├── models/                 # Trained model artifacts
│   ├── cb/                 # Center Back models
│   ├── fb/                 # Full Back models
│   ├── mf/                 # Midfielder models
│   ├── wg/                 # Winger models
│   └── st/                 # Striker models
│
├── training/               # Training scripts
├── report/                 # Report assembly
├── config/                 # Settings + constants
│   └── settings.py         # All configurable parameters
├── data/                   # StatsBomb reference datasets
├── tools/                  # Utility scripts
├── tests/                  # Unit/integration tests
├── main.py                 # CLI entry point
└── requirements.txt        # Python dependencies
```

# Kashaf Frontend

Next.js 16 web application for the Kashaf football scouting platform, powered by Convex real-time backend and Convex Auth.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Runtime | [Bun](https://bun.sh) |
| Database / Real-time | [Convex](https://convex.dev/) |
| Authentication | [Convex Auth](https://labs.convex.dev/auth) |
| Styling | Tailwind CSS, custom CSS |
| Animations | Framer Motion, Lenis smooth scroll |

## Setup

```bash
# Install dependencies
bun install

# Copy environment file and fill in your values
cp .env.example .env.local

# Start dev server (Next.js + Convex sync)
bun run dev
```

See the root [README](../README.md) for full environment variable docs and the engine integration flow.

## Environment Variables

Copy `.env.example` → `.env.local` and fill in:

| Variable | Description |
|---|---|
| `CONVEX_DEPLOYMENT` | Your Convex project deployment name (set by `bunx convex dev`) |
| `NEXT_PUBLIC_CONVEX_URL` | Convex cloud URL |
| `ENGINE_BASE_URL` | URL of the Python engine (default: `http://localhost:8080`) |
| `ENGINE_CALLBACK_TOKEN` | Shared secret for engine → frontend callback auth |
| `KASHAF_ENGINE_TOKEN` | Shared secret for frontend → engine request auth |
| `DNS_PUBLIC_URL` | Public URL of this app, used as callback URL for the engine |

> **Important:** `ENGINE_CALLBACK_TOKEN` must also be set in the Convex Dashboard → Settings → Environment Variables.

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login / Sign-up pages
│   ├── (dashboard)/        # Role-based dashboards + analysis page
│   │   ├── analysis/       # Match analysis (video + event tagging)
│   │   └── dashboard/      # Player, Analyst, Scout dashboards
│   ├── api/engine/         # Engine proxy & callback API routes
│   ├── players/            # Public player profile & match report pages
│   └── onboarding/         # Role selection & profile setup
├── components/             # UI components by feature area
│   ├── analysis/           # Analysis-specific components
│   ├── analyst/            # Analyst dashboard components
│   ├── dashboard/          # Shared dashboard components
│   ├── landing/            # Landing page sections
│   ├── player/             # Player-facing components
│   ├── scout/              # Scout dashboard components
│   └── ui/                 # Shared UI primitives (shadcn/ui)
├── convex/                 # Convex backend
│   ├── schema.ts           # Database schema
│   ├── analysisEvents.ts   # Event tagging mutations/queries
│   ├── analysisRequests.ts # Analyst hiring workflow
│   ├── engine.ts           # Engine job preparation & queuing
│   ├── engineJobs.ts       # Engine job status tracking
│   ├── matches.ts          # Match CRUD
│   ├── matchSummaries.ts   # Analyst summary storage
│   └── ...                 # Users, notifications, ratings, etc.
└── lib/                    # Utility functions
```

## Key Flows

### Event Tagging (Analyst)
1. Analyst opens a match → embedded YouTube player loads via IFrame API
2. Analyst selects event type, outcome, set-piece flag, and clicks on the pitch map
3. On "Log Event", the video timestamp is **auto-captured** (current playback position − 5 seconds)
4. Events appear in the timeline panel with coordinates and timestamps

### Analysis Completion
1. Analyst clicks "Complete Analysis" → fills in rating, strengths, weaknesses, written summary
2. Frontend calls `getAndQueueEngineJob` → Convex prepares payload with events from this + up to 9 prior matches
3. Payload is POSTed to the Python engine via `/api/engine/proxy`
4. Engine processes async → calls back to `/api/engine/callback` → report saved to Convex DB
5. Player and scout views update in real-time

### Roles
- **Player** — Uploads YouTube match links, hires analysts, views reports
- **Analyst** — Accepts requests, tags events on matches, submits analysis
- **Scout** — Browses player profiles, filters by archetypes, saves searches

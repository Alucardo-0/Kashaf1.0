# Kashaf Frontend

Next.js 16 + Convex real-time application powering the Kashaf scouting platform.

---

## Quick Reference

| Command | Description |
|---|---|
| `bun install` | Install dependencies |
| `bun dev` | Start frontend + Convex + engine in parallel |
| `bun run dev:frontend` | Start Next.js only |
| `bun run dev:backend` | Start Convex dev sync only |
| `bun run build` | Production build |
| `bun run lint` | ESLint check |

---

## Pages & Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/sign-in`, `/sign-up` | Public | Convex Auth (email OTP) |
| `/onboarding` | Authenticated | Role selection + profile setup |
| `/dashboard/player` | Player | Upload matches, view analysis status |
| `/dashboard/analyst` | Analyst | View assigned matches, manage requests |
| `/dashboard/scout` | Scout | Browse/filter player database |
| `/analysis/[matchId]` | Analyst | Tagging workspace (pitch map + video) |
| `/players/[playerId]` | Public | Player profile (info + match history + report CTA) |
| `/players/[playerId]/report` | Public | Full engine report (archetypes, metrics, twins) |
| `/players/[playerId]/matches/[matchId]` | Public | Per-match engine report (legacy, not linked in UI) |
| `/analysts/[analystId]` | Public | Analyst profile page |
| `/admin` | Admin | Admin panel (overview, matches, users, analysts, scout approvals) |
| `/notifications` | Authenticated | In-app notification center |
| `/settings` | Authenticated | User settings |
| `/api/engine/proxy` | Server | Forwards engine job payloads to Python engine |
| `/api/engine/callback` | Server | Receives engine results (webhook) |

---

## Component Architecture

```
components/
├── admin/                      # Admin panel tab components
│   ├── OverviewTab.tsx         # Platform stats cards
│   ├── MatchAssignmentsTab.tsx # Match ↔ analyst viewer + reassignment
│   ├── UsersTab.tsx            # User list + delete
│   ├── AnalystsTab.tsx         # Create analyst accounts
│   └── ScoutApprovalsTab.tsx   # Approve/reject scout applications
│
├── analysis/                   # Analyst tagging workspace
│   ├── PitchMap.tsx            # Interactive SVG pitch with click-to-tag
│   ├── EventTimeline.tsx       # Scrollable list of tagged events
│   ├── EventForm.tsx           # Event creation/edit form
│   └── SummaryPanel.tsx        # Match summary + submit form
│
├── landing/                    # Landing page sections
│   ├── Hero.tsx                # Hero section
│   ├── Features.tsx            # Feature cards
│   ├── Navbar.tsx              # Navigation bar
│   └── index.ts                # Barrel export
│
├── public/                     # Public profile components
│   └── ArcDiagram.tsx          # Archetype arc visualization
│
├── scout/                      # Scout-specific
│   ├── FilterPanel.tsx         # Search filter sidebar
│   └── MatchHighlightsViewer.tsx  # YouTube highlights modal
│
├── shared/                     # Cross-role shared components
├── ui/                         # shadcn/ui base components
├── ConvexClientProvider.tsx     # Convex + Auth provider wrapper
├── LenisProvider.tsx           # Smooth scroll provider
└── theme-provider.tsx          # next-themes dark mode provider
```

---

## Convex Backend

All server-side logic lives in `convex/`. Convex functions are automatically deployed and hot-reloaded during development.

### Modules

| Module | Functions | Purpose |
|---|---|---|
| `schema.ts` | — | Database table definitions + indexes |
| `users.ts` | 16 queries/mutations | User CRUD, search, admin ops, auth helpers |
| `matches.ts` | 7 queries/mutations | Match lifecycle, assignment, admin reassignment |
| `analysisEvents.ts` | 5 queries/mutations | Event tagging CRUD + aggregation |
| `analysisRequests.ts` | 4 queries/mutations | Request lifecycle (pending → accepted/declined) |
| `matchSummaries.ts` | 2 query/mutation | Summary creation + lookup |
| `autoAssign.ts` | 2 internal mutations | Least-busy analyst auto-assignment + decline reassignment |
| `engine.ts` | 2 action/query | Engine payload builder + job queuing |
| `engineJobs.ts` | 4 queries/mutations | Engine job CRUD + player-level aggregation |
| `engineProfiles.ts` | 2 query/mutation | Aggregated player engine profile storage |
| `positionProfiles.ts` | 2 query/mutation | Position distribution aggregation |
| `notifications.ts` | 5 queries/mutations | Notification CRUD + unread count |
| `ratings.ts` | 3 queries/mutations | Player/analyst rating system |
| `savedFilters.ts` | 3 queries/mutations | Scout saved search filters |
| `auth.ts` | — | Convex Auth setup |

### Key Queries for Common Operations

```typescript
// Get current user
api.users.getCurrentUser

// Get player's completed matches (public profile)
api.matches.getCompletedMatchesByPlayer({ playerId })

// Get aggregated engine report for player
api.engineJobs.getLatestCompletedJobByPlayerId({ playerId })

// Get all matches with details (admin)
api.matches.getAllMatchesWithDetails

// Search players with filters (scout dashboard)
api.users.searchPlayers({ position, minAge, maxAge, ... })
```

---

## Design System

- **Background:** `#0A0A0F` (near-black)
- **Primary accent:** `#00FF87` (Kashaf green, used via `dns-green` CSS variable)
- **Secondary accent:** `#3B82F6` (blue, for analyst/admin actions)
- **Scout accent:** `#8B5CF6` (purple)
- **Warning:** `#F59E0B` (amber)
- **Error:** `#EF4444` (red)
- **Text:** white with opacity (`text-white/40`, `text-white/70`, etc.)
- **Borders:** `border-white/5` or `border-white/10`
- **Surfaces:** `bg-white/[0.02]` to `bg-white/[0.05]`
- **Font:** System default (no external font loaded)
- **All percentages** displayed to **2 decimal places** (`.toFixed(2)`)

---

## Environment Setup

See the [root README](../README.md#environment-variables) for the full environment variable reference.

### Convex Auth

Auth is configured in `convex/auth.ts` using `@convex-dev/auth`. The auth flow uses **email OTP** — users sign in with their email and receive a one-time password. No third-party OAuth is configured.

### Admin Access

Admin privileges are granted to users whose email appears in the `ADMIN_EMAILS` environment variable (comma-separated) in the **Convex Dashboard** environment settings. The `isAdmin` query in `users.ts` checks this list.

---

## Development Notes

### Convex Dev Deployments

Each developer gets an isolated development database. Your data won't conflict with others. To share data, use Convex's export/import feature in the Dashboard.

### Hot Reload

- **Frontend:** Next.js Turbopack hot-reloads pages and components instantly
- **Backend:** Convex hot-deploys functions on every save to files in `convex/`

### Legacy Fields

Some schema fields are marked as legacy and can be ignored:
- `analysisRequests.stripePaymentIntentId` — from removed payment system
- `analysisRequests.agreedPrice` — from removed payment system
- `users.analystProfile.ratePerMatch` — from removed payment system

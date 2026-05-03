# Kashaf Convex Backend

This directory contains all server-side logic for the Kashaf platform, powered by [Convex](https://convex.dev).

---

## Module Reference

### `schema.ts` — Database Schema

Defines all tables, fields, and indexes. See [Database Schema](../../README.md#database-schema) in the root README for the complete table reference.

### `users.ts` — User Management (16 functions)

| Function | Type | Purpose |
|---|---|---|
| `getCurrentUser` | query | Get the authenticated user |
| `getUserById` | query | Get any user by ID |
| `listUsersByRole` | query | List users by role (player/analyst/scout) |
| `listAnalysts` | query | List analysts with optional language filter |
| `setUserRole` | mutation | Set role during onboarding |
| `completePlayerProfile` | mutation | Save player profile (onboarding) |
| `completeAnalystProfile` | mutation | Save analyst profile (onboarding) |
| `completeScoutProfile` | mutation | Save scout profile (onboarding) |
| `updateUserProfile` | mutation | Update any profile fields |
| `getPlatformStats` | query | Aggregate stats for landing/admin |
| `listAllUsers` | query | Admin: list all users with optional role filter |
| `searchPlayers` | query | Scout: filter players by position, age, foot, etc. |
| `isAdmin` | query | Check if current user is admin (via ADMIN_EMAILS env var) |
| `createAnalystAccount` | mutation | Admin: provision analyst accounts |
| `deleteUser` | mutation | Admin: permanently delete a user |
| `getPendingScouts` | query | Admin: get scouts pending approval |
| `verifyScout` / `rejectScout` | mutation | Admin: approve/reject scout applications |

### `matches.ts` — Match Lifecycle (7 functions)

| Function | Type | Purpose |
|---|---|---|
| `createMatch` | mutation | Player uploads a match (triggers auto-assign) |
| `getMatchesByPlayer` | query | Get matches for a player (own or by ID) |
| `getMatchesByAnalyst` | query | Get matches assigned to current analyst |
| `getMatchById` | query | Get single match by ID |
| `updateMatchStatus` | mutation | Update match status |
| `assignAnalyst` | mutation | Assign analyst to match |
| `getCompletedMatchesByPlayer` | query | Public: completed matches for a player |
| `getAllMatchesWithDetails` | query | Admin: all matches with player/analyst names |
| `adminReassignMatch` | mutation | Admin: reassign match to different analyst |

### `autoAssign.ts` — Analyst Auto-Assignment (2 internal mutations)

| Function | Type | Purpose |
|---|---|---|
| `autoAssignAnalyst` | internalMutation | Least-busy round-robin assignment |
| `reassignOnDecline` | internalMutation | Re-assign when analyst declines |

**Algorithm:** Fetch all eligible analysts → exclude those who declined this match → count active workload → sort by workload ascending → pick the least busy.

### `analysisEvents.ts` — Event Tagging (5 functions)

| Function | Type | Purpose |
|---|---|---|
| `logEvent` | mutation | Tag a new event on the pitch |
| `getEventsByMatch` | query | All events for a match |
| `getEventsByPlayer` | query | All events for a player (across matches) |
| `deleteEvent` | mutation | Delete an event (own events only) |
| `updateEvent` | mutation | Edit an event (own events only) |
| `getPlayerEventStats` | query | Aggregate event stats by type |

### `analysisRequests.ts` — Request Lifecycle (4 functions)

| Function | Type | Purpose |
|---|---|---|
| `createRequest` | mutation | Player creates analysis request |
| `getRequestsByAnalyst` | query | Analyst's requests (optional status filter) |
| `getRequestsByPlayer` | query | Player's outgoing requests |
| `updateRequestStatus` | mutation | Accept/decline/complete a request |

### `matchSummaries.ts` — Match Summaries (2 functions)

| Function | Type | Purpose |
|---|---|---|
| `createSummary` | mutation | Analyst submits summary (marks match completed) |
| `getSummaryByMatch` | query | Get summary for a match |

### `engine.ts` — Engine Integration (2 functions)

| Function | Type | Purpose |
|---|---|---|
| `getEnginePayloadData` | internalQuery | Collect player events across up to 10 matches |
| `getAndQueueEngineJob` | action | Build payload + save job record |

**Coordinate transform:** Frontend (portrait) → Engine (landscape). See [Coordinate System](../../README.md#coordinate-system).

### `engineJobs.ts` — Engine Job Tracking (4 functions)

| Function | Type | Purpose |
|---|---|---|
| `createOrUpdateJob` | internalMutation | Create or update engine job record |
| `updateJobStatus` | internalMutation | Update job status from callback |
| `getJobsByPlayer` | query | Get all engine jobs for a player |
| `getLatestCompletedJobByPlayerId` | query | Get the most recent completed job (used by report page) |

### `engineProfiles.ts` — Player Engine Profiles (2 functions)

| Function | Type | Purpose |
|---|---|---|
| `upsertProfile` | internalMutation | Create/update aggregated engine profile |
| `getProfileByPlayer` | query | Get engine profile for a player |

### `notifications.ts` — Notification System (5 functions)

| Function | Type | Purpose |
|---|---|---|
| `createNotification` | mutation | Create a notification |
| `getNotificationsByUser` | query | Get latest 50 notifications |
| `getUnreadCount` | query | Count unread notifications |
| `markAsRead` | mutation | Mark single notification as read |
| `markAllAsRead` | mutation | Mark all as read |

### `ratings.ts` & `savedFilters.ts`

Rating and scout saved filter CRUD operations.

---

## Indexes

Key database indexes for performance:

| Table | Index | Fields |
|---|---|---|
| `users` | `email` | `email` |
| `users` | `by_role` | `role` |
| `matches` | `by_playerId` | `playerId` |
| `matches` | `by_analystId` | `analystId` |
| `matches` | `by_status` | `status` |
| `analysisEvents` | `by_matchId` | `matchId` |
| `analysisEvents` | `by_playerId` | `playerId` |
| `analysisRequests` | `by_matchId` | `matchId` |
| `notifications` | `by_userId_unread` | `userId`, `isRead` |
| `engineJobs` | `by_jobId` | `jobId` |
| `engineJobs` | `by_playerId` | `playerId` |

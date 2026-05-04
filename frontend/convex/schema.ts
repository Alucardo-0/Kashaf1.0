import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // ── Users ──────────────────────────────────────────────────────────────
  users: defineTable({
    name: v.optional(v.string()),
    email: v.string(),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(
      v.union(v.literal("player"), v.literal("analyst"), v.literal("scout"))
    ),
    onboardingComplete: v.optional(v.boolean()),
    profilePhoto: v.optional(v.string()),
    playerProfile: v.optional(
      v.object({
        age: v.number(),
        nationality: v.string(),
        position: v.string(),
        secondaryPosition: v.optional(v.string()),
        height: v.number(),
        weight: v.number(),
        foot: v.union(
          v.literal("left"),
          v.literal("right"),
          v.literal("both")
        ),
        currentClub: v.optional(v.string()),
        contactWhatsapp: v.optional(v.string()),
        contactEmail: v.optional(v.string()),
        contactAgent: v.optional(v.string()),
        marketValue: v.optional(v.number()),
      })
    ),
    analystProfile: v.optional(
      v.object({
        nationality: v.string(),
        experience: v.number(),
        certifications: v.array(v.string()),
        languages: v.array(v.string()),
        ratePerMatch: v.optional(v.number()), // Legacy field
        bio: v.string(),
      })
    ),
    scoutProfile: v.optional(
      v.object({
        clubName: v.string(),
        clubLogo: v.optional(v.string()),
        country: v.string(),
        leagueLevel: v.string(),
        isVerified: v.boolean(),
        verificationDocId: v.optional(v.id("_storage")),
      })
    ),
    scoutApprovalStatus: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
    ),
  })
    .index("email", ["email"])
    .index("by_role", ["role"]),

  // ── Matches ────────────────────────────────────────────────────────────
  matches: defineTable({
    playerId: v.id("users"),
    analystId: v.optional(v.id("users")),
    youtubeUrl: v.string(),
    youtubeVideoId: v.string(),
    opponentName: v.optional(v.string()),
    matchDate: v.optional(v.number()),
    shirtNumber: v.number(),
    playerNote: v.optional(v.string()),
    status: v.union(
      v.literal("pending_analyst"),
      v.literal("analyst_assigned"),
      v.literal("analysis_in_progress"),
      v.literal("completed")
    ),
    createdAt: v.number(),
  })
    .index("by_playerId", ["playerId"])
    .index("by_analystId", ["analystId"])
    .index("by_status", ["status"]),

  // ── Analysis Events ────────────────────────────────────────────────────
  analysisEvents: defineTable({
    matchId: v.id("matches"),
    analystId: v.id("users"),
    playerId: v.id("users"),
    eventType: v.string(),
    outcome: v.string(),
    originX: v.number(),
    originY: v.number(),
    destinationX: v.optional(v.number()),
    destinationY: v.optional(v.number()),
    videoTimestamp: v.number(),
    notes: v.optional(v.string()),
    isSetPiece: v.optional(v.boolean()),
    bodyPart: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_matchId", ["matchId"])
    .index("by_playerId", ["playerId"]),

  // ── Match Summaries ────────────────────────────────────────────────────
  matchSummaries: defineTable({
    matchId: v.id("matches"),
    analystId: v.id("users"),
    overallRating: v.number(),
    strengths: v.array(v.string()),
    weaknesses: v.array(v.string()),
    positionProfile: v.array(
      v.object({
        position: v.string(),
        percentage: v.number(),
      })
    ),
    standoutMoments: v.optional(v.array(v.number())),
    writtenSummary: v.string(),
    createdAt: v.number(),
  }).index("by_matchId", ["matchId"]),

  // ── Player Position Profiles (aggregated) ──────────────────────────────
  playerPositionProfiles: defineTable({
    playerId: v.id("users"),
    profiles: v.array(
      v.object({
        position: v.string(),
        percentage: v.number(),
      })
    ),
    totalMatchesAnalyzed: v.number(),
    lastUpdated: v.number(),
  }).index("by_playerId", ["playerId"]),

  // ── Analysis Requests ──────────────────────────────────────────────────
  analysisRequests: defineTable({
    playerId: v.id("users"),
    analystId: v.id("users"),
    matchId: v.id("matches"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("completed")
    ),
    stripePaymentIntentId: v.optional(v.string()), // Legacy field
    agreedPrice: v.optional(v.number()), // Legacy field
    createdAt: v.number(),
  })
    .index("by_playerId", ["playerId"])
    .index("by_analystId", ["analystId"])
    .index("by_status", ["status"])
    .index("by_matchId", ["matchId"]),

  // ── Ratings ────────────────────────────────────────────────────────────
  ratings: defineTable({
    raterId: v.id("users"),
    ratedId: v.id("users"),
    matchId: v.id("matches"),
    raterRole: v.union(v.literal("player"), v.literal("scout")),
    score: v.number(),
    comment: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_ratedId", ["ratedId"])
    .index("by_matchId", ["matchId"]),

  // ── Notifications ──────────────────────────────────────────────────────
  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    message: v.string(),
    relatedId: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_unread", ["userId", "isRead"]),

  // ── Player Engine Profiles ─────────────────────────────────────────────
  playerEngineProfiles: defineTable({
    playerId: v.id("users"),
    playerName: v.string(),
    unit: v.string(),
    topArchetype: v.string(),
    topPct: v.number(),
    matchCount: v.number(),
    archetypes: v.any(), // record of string to number
    coreFeatures: v.any(), // record of string to number
    contextFeatures: v.any(), // record of string to number
    twins: v.array(
      v.object({
        player_name: v.string(),
        similarity: v.number(),
        context: v.any(), // record of string to number
      })
    ),
    createdAt: v.number(),
  }).index("by_playerId", ["playerId"]),

  // ── Saved Filters (scouts) ─────────────────────────────────────────────
  savedFilters: defineTable({
    scoutId: v.id("users"),
    filterName: v.string(),
    filters: v.any(),
    createdAt: v.number(),
  }).index("by_scoutId", ["scoutId"]),
  // ── Engine Jobs ────────────────────────────────────────────────────────
  engineJobs: defineTable({
    jobId: v.string(),
    matchId: v.id("matches"),
    playerId: v.id("users"),
    analystId: v.id("users"),
    unit: v.string(),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("failed")),
    requestPayload: v.optional(v.any()),
    report: v.optional(v.any()),
    error: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index("by_jobId", ["jobId"])
    .index("by_playerId", ["playerId"]),

  // ── Engine Logs (process tracking) ────────────────────────────────────
  engineLogs: defineTable({
    jobId: v.string(),
    matchId: v.id("matches"),
    playerId: v.id("users"),
    step: v.string(),
    status: v.union(v.literal("started"), v.literal("completed"), v.literal("failed")),
    details: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    inputSummary: v.optional(v.string()),
    outputSummary: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_jobId", ["jobId"])
    .index("by_matchId", ["matchId"]),

  // ── Keyboard Shortcuts (analyst preferences) ──────────────────────────
  keyboardShortcuts: defineTable({
    userId: v.id("users"),
    shortcuts: v.any(), // Record<eventTypeValue, shortcutKey>
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),
});

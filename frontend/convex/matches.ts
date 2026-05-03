import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// ── Create a match (player uploads YouTube URL) ──────────────────────────
export const createMatch = mutation({
    args: {
        youtubeUrl: v.string(),
        youtubeVideoId: v.string(),
        opponentName: v.optional(v.string()),
        matchDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user || user.role !== "player") {
            throw new Error("Only players can upload matches");
        }

        const matchId = await ctx.db.insert("matches", {
            playerId: userId,
            youtubeUrl: args.youtubeUrl,
            youtubeVideoId: args.youtubeVideoId,
            opponentName: args.opponentName,
            matchDate: args.matchDate,
            status: "pending_analyst",
            createdAt: Date.now(),
        });

        // Auto-assign an analyst via least-busy round-robin
        await ctx.scheduler.runAfter(0, internal.autoAssign.autoAssignAnalyst, { matchId });

        return matchId;
    },
});

// ── Get matches by player ────────────────────────────────────────────────
export const getMatchesByPlayer = query({
    args: { playerId: v.optional(v.id("users")) },
    handler: async (ctx, args) => {
        const userId = args.playerId ?? (await getAuthUserId(ctx));
        if (!userId) return [];

        return await ctx.db
            .query("matches")
            .withIndex("by_playerId", (q) => q.eq("playerId", userId))
            .order("desc")
            .collect();
    },
});

// ── Get matches by analyst ───────────────────────────────────────────────
export const getMatchesByAnalyst = query({
    args: { status: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const matches = await ctx.db
            .query("matches")
            .withIndex("by_analystId", (q) => q.eq("analystId", userId))
            .order("desc")
            .collect();

        if (args.status) {
            return matches.filter((m) => m.status === args.status);
        }
        return matches;
    },
});

// ── Get match by ID ──────────────────────────────────────────────────────
export const getMatchById = query({
    args: { matchId: v.id("matches") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.matchId);
    },
});

// ── Update match status ──────────────────────────────────────────────────
export const updateMatchStatus = mutation({
    args: {
        matchId: v.id("matches"),
        status: v.union(
            v.literal("pending_analyst"),
            v.literal("analyst_assigned"),
            v.literal("analysis_in_progress"),
            v.literal("completed")
        ),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        await ctx.db.patch(args.matchId, { status: args.status });
    },
});

// ── Assign analyst to match ──────────────────────────────────────────────
export const assignAnalyst = mutation({
    args: {
        matchId: v.id("matches"),
        analystId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        await ctx.db.patch(args.matchId, {
            analystId: args.analystId,
            status: "analyst_assigned",
        });
    },
});

// ── Get completed matches for public profile ─────────────────────────────
export const getCompletedMatchesByPlayer = query({
    args: { playerId: v.id("users") },
    handler: async (ctx, args) => {
        const matches = await ctx.db
            .query("matches")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .order("desc")
            .collect();

        return matches.filter((m) => m.status === "completed");
    },
});

// ── Get all matches with player/analyst details (admin) ──────────────────
export const getAllMatchesWithDetails = query({
    args: {},
    handler: async (ctx) => {
        const matches = await ctx.db
            .query("matches")
            .order("desc")
            .collect();

        const enriched = await Promise.all(
            matches.map(async (match) => {
                const player = await ctx.db.get(match.playerId);
                const analyst = match.analystId
                    ? await ctx.db.get(match.analystId)
                    : null;
                return {
                    ...match,
                    playerName: player?.name ?? "Unknown Player",
                    playerEmail: player?.email ?? "",
                    analystName: analyst?.name ?? null,
                    analystEmail: analyst?.email ?? null,
                };
            })
        );

        return enriched;
    },
});

// ── Admin reassign match to a different analyst ──────────────────────────
export const adminReassignMatch = mutation({
    args: {
        matchId: v.id("matches"),
        newAnalystId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const match = await ctx.db.get(args.matchId);
        if (!match) throw new Error("Match not found");

        const newAnalyst = await ctx.db.get(args.newAnalystId);
        if (!newAnalyst || newAnalyst.role !== "analyst") {
            throw new Error("Selected user is not an analyst");
        }

        const player = await ctx.db.get(match.playerId);

        // Update the match assignment
        await ctx.db.patch(args.matchId, {
            analystId: args.newAnalystId,
            status: match.status === "completed" ? "completed" : "analyst_assigned",
        });

        // Create a new analysis request for the new analyst
        const requestId = await ctx.db.insert("analysisRequests", {
            playerId: match.playerId,
            analystId: args.newAnalystId,
            matchId: args.matchId,
            status: "accepted",
            createdAt: Date.now(),
        });

        // Notify the new analyst
        await ctx.db.insert("notifications", {
            userId: args.newAnalystId,
            type: "new_assignment",
            message: `You've been reassigned a match to analyze${player?.name ? ` for ${player.name}` : ""} (admin action).`,
            relatedId: requestId,
            isRead: false,
            createdAt: Date.now(),
        });

        // Notify the player
        await ctx.db.insert("notifications", {
            userId: match.playerId,
            type: "analyst_reassigned",
            message: `Your match analyst has been updated to ${newAnalyst.name ?? "a new analyst"}.`,
            relatedId: args.matchId,
            isRead: false,
            createdAt: Date.now(),
        });

        return requestId;
    },
});

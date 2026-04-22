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

        return await ctx.db.insert("matches", {
            playerId: userId,
            youtubeUrl: args.youtubeUrl,
            youtubeVideoId: args.youtubeVideoId,
            opponentName: args.opponentName,
            matchDate: args.matchDate,
            status: "pending_analyst",
            createdAt: Date.now(),
        });
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

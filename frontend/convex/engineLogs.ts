import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

// ── Log an engine processing step ────────────────────────────────────────
export const logStep = internalMutation({
    args: {
        jobId: v.string(),
        matchId: v.id("matches"),
        playerId: v.id("users"),
        step: v.string(),
        status: v.union(v.literal("started"), v.literal("completed"), v.literal("failed")),
        details: v.optional(v.string()),
        durationMs: v.optional(v.number()),
        inputSummary: v.optional(v.string()),
        outputSummary: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("engineLogs", {
            jobId: args.jobId,
            matchId: args.matchId,
            playerId: args.playerId,
            step: args.step,
            status: args.status,
            details: args.details,
            durationMs: args.durationMs,
            inputSummary: args.inputSummary,
            outputSummary: args.outputSummary,
            createdAt: Date.now(),
        });
    },
});

// ── Get logs by match ────────────────────────────────────────────────────
export const getLogsByMatch = query({
    args: { matchId: v.id("matches") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("engineLogs")
            .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
            .order("asc")
            .collect();
    },
});

// ── Get logs by job ──────────────────────────────────────────────────────
export const getLogsByJob = query({
    args: { jobId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("engineLogs")
            .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
            .order("asc")
            .collect();
    },
});

// ── Get all recent logs (admin) ──────────────────────────────────────────
export const getAllRecentLogs = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("engineLogs")
            .order("desc")
            .take(100);
    },
});

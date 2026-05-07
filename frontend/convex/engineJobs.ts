import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const createOrUpdateJob = internalMutation({
  args: {
    jobId: v.string(),
    matchId: v.optional(v.id("matches")),
    playerId: v.optional(v.id("users")),
    analystId: v.optional(v.id("users")),
    unit: v.optional(v.string()),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("failed")),
    requestPayload: v.optional(v.any()),
    report: v.optional(v.any()),
    error: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("engineJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .first();

    if (existing) {
      // Idempotent upsert
      await ctx.db.patch(existing._id, {
        status: args.status,
        ...(args.report !== undefined && { report: args.report }),
        ...(args.error !== undefined && { error: args.error }),
        ...(args.status === "completed" || args.status === "failed" ? { completedAt: Date.now() } : {}),
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      // Creation
      if (!args.matchId || !args.playerId || !args.analystId || !args.unit) {
        throw new Error("Missing required fields for new job creation");
      }
      return await ctx.db.insert("engineJobs", {
        jobId: args.jobId,
        matchId: args.matchId,
        playerId: args.playerId,
        analystId: args.analystId,
        unit: args.unit,
        status: args.status,
        requestPayload: args.requestPayload,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const updateJobByCallback = mutation({
  args: {
    secret: v.string(),
    jobId: v.string(),
    status: v.union(v.literal("completed"), v.literal("failed")),
    report: v.optional(v.any()),
    error: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    if (args.secret !== process.env.ENGINE_CALLBACK_TOKEN) {
      throw new Error("Unauthorized webhook callback to Convex");
    }

    const existing = await ctx.db
      .query("engineJobs")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        ...(args.report !== undefined && { report: args.report }),
        ...(args.error !== undefined && { error: args.error }),
        ...(args.status === "completed" || args.status === "failed" ? { completedAt: Date.now() } : {}),
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      // If job somehow doesn't exist, log and create a sparse record
      console.warn(`Webhook callback for unknown job: ${args.jobId}`);
      // This violates strict schema if matchId/playerId are missing, but schema allows us to just throw if we can't create it.
      throw new Error("Job not found. Upserting sparse jobs is not supported by schema constraints.");
    }
  },
});

export const getAllJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("engineJobs").order("desc").take(5);
  },
});

export const getJobByMatchId = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("engineJobs")
      .filter((q) => q.eq(q.field("matchId"), args.matchId))
      .order("desc")
      .first();
  },
});

// ── Get latest completed engine job for a player (aggregate profile) ─────
export const getLatestCompletedJobByPlayerId = query({
  args: { playerId: v.id("users") },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("engineJobs")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .order("desc")
      .collect();

    // Find the most recent completed job with a valid report
    const completedJob = jobs.find((j) => j.status === "completed" && j.report);
    if (!completedJob) return null;

    // Extract the engine report (nested inside job.report.report or directly in job.report)
    const jobReport: any = completedJob.report;
    const report: any = jobReport?.report ?? jobReport ?? null;
    if (!report) return null;

    return {
      _id: completedJob._id,
      playerId: completedJob.playerId,
      unit: report.unit ?? completedJob.unit,
      topArchetype: report.top_archetype ?? "",
      topPct: report.top_pct ?? 0,
      matchCount: report.match_count ?? completedJob.requestPayload?.metadata?.matchCount ?? 1,
      archetypes: report.archetypes ?? {},
      coreFeatures: report.core_features ?? {},
      contextFeatures: report.context_features ?? {},
      twins: (report.twins ?? []).map((t: any) => ({
        player_name: t.player_name ?? "",
        similarity: t.similarity ?? 0,
        context: t.context ?? {},
      })),
      dataWarning: report.data_warning ?? null,
      archetypesNote: report.archetypes_note ?? null,
      createdAt: completedJob.createdAt,
    };
  },
});

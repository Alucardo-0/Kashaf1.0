import { v } from "convex/values";
import { internalAction, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";

export const getEnginePayloadData = internalQuery({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Player not found");
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    
    // Get all completed matches for this player (for cumulative profiling)
    const allPlayerMatches = await ctx.db
      .query("matches")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    // Take up to 9 most recent completed matches + the current one = max 10
    const completedMatches = allPlayerMatches
      .filter((m) => m.status === "completed" && m._id !== args.matchId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 9);

    // Collect match IDs: current match + previous completed ones
    const matchIds = [args.matchId, ...completedMatches.map((m) => m._id)];

    // Gather events from ALL these matches
    const allEvents = [];
    for (const mid of matchIds) {
      const events = await ctx.db
        .query("analysisEvents")
        .withIndex("by_matchId", (q) => q.eq("matchId", mid))
        .filter((q) => q.eq(q.field("playerId"), args.playerId))
        .collect();
      allEvents.push(...events);
    }

    return { 
      player, 
      match, 
      events: allEvents,
      matchCount: matchIds.length,
    };
  }
});

function mapPositionToUnit(position?: string): string {
  if (!position) return "mf";
  const p = position.toLowerCase();
  if (p.includes("center back") || p.includes("cb") || p.includes("defender")) return "cb";
  if (p.includes("full back") || p.includes("wing back") || p.includes("fb") || p.includes("lb") || p.includes("rb")) return "fb";
  if (p.includes("midfield") || p.includes("cm") || p.includes("cdm") || p.includes("cam")) return "mf";
  if (p.includes("wing") || p.includes("lw") || p.includes("rw")) return "wg";
  if (p.includes("striker") || p.includes("forward") || p.includes("st")) return "st";
  return "mf";
}

/** Clamp a numeric value to [0, 100] to prevent floating-point rounding artifacts. */
function clamp100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export const getAndQueueEngineJob = action({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("users"),
    analystId: v.id("users"),
  },
  handler: async (ctx, args): Promise<any> => {
    // Log: Data gathering started
    const dataGatherStart = Date.now();
    await ctx.runMutation(internal.engineLogs.logStep, {
      jobId: `dns-${args.matchId.toString()}-${args.playerId.toString()}`,
      matchId: args.matchId,
      playerId: args.playerId,
      step: "Data Gathering",
      status: "started",
      inputSummary: `Match: ${args.matchId}, Player: ${args.playerId}`,
    });

    const { player, events, matchCount } = await ctx.runQuery(internal.engine.getEnginePayloadData, {
      matchId: args.matchId,
      playerId: args.playerId,
    });

    const position = player.playerProfile?.position;
    const unit = mapPositionToUnit(position);
    const unitId = player.playerProfile?.position ? unit : "mf"; // fallback

    const jobId = `dns-${args.matchId.toString()}-${args.playerId.toString()}-${unitId}`;

    // Log: Data gathering completed
    await ctx.runMutation(internal.engineLogs.logStep, {
      jobId,
      matchId: args.matchId,
      playerId: args.playerId,
      step: "Data Gathering",
      status: "completed",
      durationMs: Date.now() - dataGatherStart,
      outputSummary: `Player: ${player.name || "Unknown"}, Position: ${position || "N/A"}, Unit: ${unitId}, Events: ${events.length}, Matches: ${matchCount}`,
    });

    // Log: Payload preparation started
    const payloadStart = Date.now();
    await ctx.runMutation(internal.engineLogs.logStep, {
      jobId,
      matchId: args.matchId,
      playerId: args.playerId,
      step: "Payload Preparation",
      status: "started",
      inputSummary: `${events.length} raw events, unit=${unitId}`,
    });

    const payload = {
      job_id: jobId,
      player_name: player.name || "Unknown Player",
      unit: unitId,
      events: events.map((e: any) => ({
        // Map to Kashaf standard schema
        // Frontend pitch is portrait (X=width, Y=length)
        // Engine expects landscape (X=length, Y=width)
        // Analyst convention: bottom=own goal, top=opponent goal
        // Engine convention: x=0=own goal, x=100=opponent goal
        // So: start_x = 100 - originY (invert length axis)
        //     start_y = originX         (width axis stays)
        eventType: e.eventType,
        outcome: e.outcome,
        originX: clamp100(100 - e.originY),
        originY: clamp100(e.originX),
        destinationX: e.destinationY !== undefined ? clamp100(100 - e.destinationY) : undefined,
        destinationY: e.destinationX !== undefined ? clamp100(e.destinationX) : undefined,
        videoTimestamp: e.videoTimestamp,
        notes: e.notes,
        isSetPiece: e.isSetPiece,
        body_part: e.bodyPart || "foot",
      })),
      callback_url: `${process.env.DNS_PUBLIC_URL || "http://localhost:3000"}/api/engine/callback`,
      callback_headers: {
        "X-Engine-Token": process.env.ENGINE_CALLBACK_TOKEN || "",
      },
      metadata: {
        matchId: args.matchId.toString(),
        playerId: args.playerId.toString(),
        analystId: args.analystId.toString(),
        matchCount,
      },
    };

    // Log: Payload preparation completed
    await ctx.runMutation(internal.engineLogs.logStep, {
      jobId,
      matchId: args.matchId,
      playerId: args.playerId,
      step: "Payload Preparation",
      status: "completed",
      durationMs: Date.now() - payloadStart,
      outputSummary: `Payload built with ${payload.events.length} transformed events`,
    });

    // Log: Job queuing
    await ctx.runMutation(internal.engineLogs.logStep, {
      jobId,
      matchId: args.matchId,
      playerId: args.playerId,
      step: "Job Queuing",
      status: "started",
      inputSummary: `Job ID: ${jobId}, Callback: ${payload.callback_url}`,
    });

    // 1. Initial write: Queued
    await ctx.runMutation(internal.engineJobs.createOrUpdateJob, {
      jobId,
      matchId: args.matchId,
      playerId: args.playerId,
      analystId: args.analystId,
      unit: unitId,
      status: "queued",
      requestPayload: payload,
    });

    // Log: Job queued successfully
    await ctx.runMutation(internal.engineLogs.logStep, {
      jobId,
      matchId: args.matchId,
      playerId: args.playerId,
      step: "Job Queuing",
      status: "completed",
      outputSummary: `Job ${jobId} queued successfully`,
    });

    return payload;
  },
});

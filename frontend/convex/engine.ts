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
    
    // Get all events for this player in this match
    const events = await ctx.db
      .query("analysisEvents")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .filter((q) => q.eq(q.field("playerId"), args.playerId))
      .collect();

    return { 
      player, 
      match, 
      events 
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

export const getAndQueueEngineJob = action({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("users"),
    analystId: v.id("users"),
  },
  handler: async (ctx, args): Promise<any> => {
    const { player, events } = await ctx.runQuery(internal.engine.getEnginePayloadData, {
      matchId: args.matchId,
      playerId: args.playerId,
    });

    const position = player.playerProfile?.position;
    const unit = mapPositionToUnit(position);
    const unitId = player.playerProfile?.position ? unit : "mf"; // fallback

    const jobId = `dns-${args.matchId.toString()}-${args.playerId.toString()}-${unitId}`;

    const payload = {
      job_id: jobId,
      player_name: player.name || "Unknown Player",
      unit: unitId,
      events: events.map((e: any) => ({
        // Map to Kashaf standard schema
        eventType: e.eventType,
        outcome: e.outcome,
        originX: e.originX,
        originY: e.originY,
        destinationX: e.destinationX,
        destinationY: e.destinationY,
        videoTimestamp: e.videoTimestamp,
        notes: e.notes,
        isSetPiece: e.isSetPiece,
      })),
      callback_url: `${process.env.DNS_PUBLIC_URL || "http://localhost:3000"}/api/engine/callback`,
      callback_headers: {
        "X-Engine-Token": process.env.ENGINE_CALLBACK_TOKEN || "",
      },
      metadata: {
        matchId: args.matchId.toString(),
        playerId: args.playerId.toString(),
        analystId: args.analystId.toString(),
      },
    };

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

    return payload;
  },
});

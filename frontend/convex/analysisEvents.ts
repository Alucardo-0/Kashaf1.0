import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Log analysis event ───────────────────────────────────────────────────
export const logEvent = mutation({
    args: {
        matchId: v.id("matches"),
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
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user || user.role !== "analyst") {
            throw new Error("Only analysts can log events");
        }

        return await ctx.db.insert("analysisEvents", {
            matchId: args.matchId,
            analystId: userId,
            playerId: args.playerId,
            eventType: args.eventType,
            outcome: args.outcome,
            originX: args.originX,
            originY: args.originY,
            destinationX: args.destinationX,
            destinationY: args.destinationY,
            videoTimestamp: args.videoTimestamp,
            notes: args.notes,
            isSetPiece: args.isSetPiece,
            bodyPart: args.bodyPart,
            createdAt: Date.now(),
        });
    },
});

// ── Get events by match ──────────────────────────────────────────────────
export const getEventsByMatch = query({
    args: { matchId: v.id("matches") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("analysisEvents")
            .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
            .order("asc")
            .collect();
    },
});

// ── Get events by player (for stats aggregation) ─────────────────────────
export const getEventsByPlayer = query({
    args: { playerId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("analysisEvents")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .collect();
    },
});

// ── Delete event ─────────────────────────────────────────────────────────
export const deleteEvent = mutation({
    args: { eventId: v.id("analysisEvents") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const event = await ctx.db.get(args.eventId);
        if (!event) throw new Error("Event not found");
        if (event.analystId !== userId) {
            throw new Error("Only the analyst who created this event can delete it");
        }

        await ctx.db.delete(args.eventId);
    },
});

// ── Update event ─────────────────────────────────────────────────────────
export const updateEvent = mutation({
    args: {
        eventId: v.id("analysisEvents"),
        eventType: v.optional(v.string()),
        outcome: v.optional(v.string()),
        originX: v.optional(v.number()),
        originY: v.optional(v.number()),
        destinationX: v.optional(v.number()),
        destinationY: v.optional(v.number()),
        notes: v.optional(v.string()),
        isSetPiece: v.optional(v.boolean()),
        bodyPart: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const event = await ctx.db.get(args.eventId);
        if (!event) throw new Error("Event not found");
        if (event.analystId !== userId) {
            throw new Error("Only the analyst who created this event can update it");
        }

        const updates: Record<string, unknown> = {};
        if (args.eventType !== undefined) updates.eventType = args.eventType;
        if (args.outcome !== undefined) updates.outcome = args.outcome;
        if (args.originX !== undefined) updates.originX = args.originX;
        if (args.originY !== undefined) updates.originY = args.originY;
        if (args.destinationX !== undefined)
            updates.destinationX = args.destinationX;
        if (args.destinationY !== undefined)
            updates.destinationY = args.destinationY;
        if (args.notes !== undefined) updates.notes = args.notes;
        if (args.isSetPiece !== undefined) updates.isSetPiece = args.isSetPiece;
        if (args.bodyPart !== undefined) updates.bodyPart = args.bodyPart;

        await ctx.db.patch(args.eventId, updates);
    },
});

// ── Get player event stats (aggregate for dashboard) ─────────────────────
export const getPlayerEventStats = query({
    args: { playerId: v.id("users") },
    handler: async (ctx, args) => {
        const events = await ctx.db
            .query("analysisEvents")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .collect();

        const stats: Record<string, { total: number; successful: number }> = {};

        for (const event of events) {
            if (!stats[event.eventType]) {
                stats[event.eventType] = { total: 0, successful: 0 };
            }
            stats[event.eventType].total++;
            // "Successful", "Goal", "Won", "Key Pass", "Assist" count as successful outcomes
            const successOutcomes = [
                "Successful",
                "Goal",
                "Completed",
                "Won",
                "Key Pass",
                "Assist",
            ];
            if (successOutcomes.includes(event.outcome)) {
                stats[event.eventType].successful++;
            }
        }

        return {
            totalEvents: events.length,
            byType: stats,
        };
    },
});

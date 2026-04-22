import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Position Profile Algorithm
 *
 * Calculates position profile scores for a player based on all logged events
 * across all analyzed matches. Each position gets a weighted score based on
 * event types, outcomes, and pitch coordinates.
 */

// Position definitions with scoring criteria
const POSITION_CRITERIA = {
    "Inside Winger": {
        // High dribbles + shots from wide + cutting inside passes
        events: { Dribble: 3, Shot: 2, Pass: 1, "Key Pass": 2 },
        zoneWeight: (x: number, y: number) => {
            // Wide zones (y < 30 or y > 70) with cutting inside
            const isWide = y < 30 || y > 70;
            const isFinalThird = x > 66;
            return isWide && isFinalThird ? 1.5 : isWide ? 1.0 : 0.5;
        },
    },
    "Wide Playmaker": {
        // High key passes + assists + crosses from wide
        events: { "Key Pass": 3, Assist: 4, Cross: 3, Pass: 1 },
        zoneWeight: (x: number, y: number) => {
            const isWide = y < 30 || y > 70;
            return isWide ? 1.5 : 0.5;
        },
    },
    "Wide Midfielder": {
        // Balanced passes + defensive actions from wide
        events: { Pass: 2, Tackle: 2, Interception: 2, Cross: 1 },
        zoneWeight: (x: number, y: number) => {
            const isWide = y < 30 || y > 70;
            const isMiddleThird = x >= 33 && x <= 66;
            return isWide && isMiddleThird ? 1.5 : isWide ? 1.0 : 0.5;
        },
    },
    "Target Striker": {
        // Headers + shots inside box + fouls won
        events: { Header: 3, Shot: 2, Goal: 5, Foul: 1 },
        zoneWeight: (x: number, y: number) => {
            // Inside the box area (x > 83, y between 20-80)
            const isInBox = x > 83 && y >= 20 && y <= 80;
            return isInBox ? 2.0 : x > 66 ? 1.0 : 0.3;
        },
    },
    "Advanced Playmaker": {
        // Key passes + through balls + shots from edge
        events: { "Key Pass": 3, Assist: 3, Pass: 2, Shot: 1 },
        zoneWeight: (x: number, y: number) => {
            // Central zones in final third
            const isCentral = y >= 30 && y <= 70;
            const isFinalThird = x > 66;
            return isCentral && isFinalThird ? 1.5 : isCentral ? 1.0 : 0.5;
        },
    },
    "Box-to-Box": {
        // High tackles + passes + shots spread across pitch
        events: { Tackle: 2, Pass: 2, Interception: 2, Shot: 1, Header: 1 },
        zoneWeight: (_x: number, _y: number) => {
            // Even weight across pitch
            return 1.0;
        },
    },
    "Defensive Midfielder": {
        // Tackles, interceptions, clearances in midfield
        events: { Tackle: 3, Interception: 3, Clearance: 2, Pass: 1 },
        zoneWeight: (x: number, y: number) => {
            const isCentral = y >= 25 && y <= 75;
            const isDefHalf = x < 50;
            return isCentral && isDefHalf ? 1.5 : isCentral ? 1.0 : 0.5;
        },
    },
    "Poacher": {
        // Goals + shots in box
        events: { Goal: 5, Shot: 3, Header: 2 },
        zoneWeight: (x: number, y: number) => {
            const isInBox = x > 83 && y >= 20 && y <= 80;
            return isInBox ? 2.5 : x > 66 ? 1.0 : 0.2;
        },
    },
} as const;

type PositionName = keyof typeof POSITION_CRITERIA;

// ── Calculate position profiles for a player ─────────────────────────────
export const calculatePositionProfile = mutation({
    args: { playerId: v.id("users") },
    handler: async (ctx, args) => {
        // Get all events for this player
        const events = await ctx.db
            .query("analysisEvents")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .collect();

        if (events.length === 0) {
            return;
        }

        // Count analyzed matches
        const matchIds = new Set(events.map((e) => e.matchId));

        // Calculate raw scores for each position
        const rawScores: Record<string, number> = {};

        for (const [position, criteria] of Object.entries(POSITION_CRITERIA)) {
            let score = 0;

            for (const event of events) {
                const eventWeight =
                    (criteria.events as Record<string, number>)[event.eventType] ?? 0;
                if (eventWeight === 0) continue;

                // Zone weight based on pitch coordinates (0-100 scale)
                const zoneWeight = criteria.zoneWeight(event.originX, event.originY);

                // Outcome bonus
                const successOutcomes = [
                    "Successful",
                    "On Target",
                    "Goal",
                    "Completed",
                    "Won",
                ];
                const outcomeMult = successOutcomes.includes(event.outcome) ? 1.2 : 0.8;

                score += eventWeight * zoneWeight * outcomeMult;
            }

            rawScores[position] = score;
        }

        // Normalize to percentages (sum to 100)
        const totalScore = Object.values(rawScores).reduce((a, b) => a + b, 0);

        const profiles =
            totalScore === 0
                ? Object.keys(POSITION_CRITERIA).map((p) => ({
                    position: p,
                    percentage: Math.round(100 / Object.keys(POSITION_CRITERIA).length),
                }))
                : Object.entries(rawScores)
                    .map(([position, score]) => ({
                        position,
                        percentage: Math.round((score / totalScore) * 100),
                    }))
                    .sort((a, b) => b.percentage - a.percentage);

        // Ensure percentages sum to exactly 100
        const sum = profiles.reduce((a, p) => a + p.percentage, 0);
        if (sum !== 100 && profiles.length > 0) {
            profiles[0].percentage += 100 - sum;
        }

        // Upsert the position profile
        const existing = await ctx.db
            .query("playerPositionProfiles")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                profiles,
                totalMatchesAnalyzed: matchIds.size,
                lastUpdated: Date.now(),
            });
        } else {
            await ctx.db.insert("playerPositionProfiles", {
                playerId: args.playerId,
                profiles,
                totalMatchesAnalyzed: matchIds.size,
                lastUpdated: Date.now(),
            });
        }
    },
});

// ── Get position profile for a player ────────────────────────────────────
export const getPositionProfile = query({
    args: { playerId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("playerPositionProfiles")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .first();
    },
});

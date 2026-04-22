import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// ── Create match summary (finalize analysis) ─────────────────────────────
export const createSummary = mutation({
    args: {
        matchId: v.id("matches"),
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
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user || user.role !== "analyst") {
            throw new Error("Only analysts can create summaries");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) throw new Error("Match not found");
        if (match.analystId !== userId) {
            throw new Error("You are not assigned to this match");
        }

        // Create the summary
        const summaryId = await ctx.db.insert("matchSummaries", {
            matchId: args.matchId,
            analystId: userId,
            overallRating: args.overallRating,
            strengths: args.strengths,
            weaknesses: args.weaknesses,
            positionProfile: args.positionProfile,
            standoutMoments: args.standoutMoments,
            writtenSummary: args.writtenSummary,
            createdAt: Date.now(),
        });

        // Mark match as completed
        await ctx.db.patch(args.matchId, { status: "completed" });

        // Send notification to player
        await ctx.db.insert("notifications", {
            userId: match.playerId,
            type: "analysis_complete",
            message: "Your match analysis is complete! Check your dashboard to view the results.",
            relatedId: args.matchId,
            isRead: false,
            createdAt: Date.now(),
        });

        return summaryId;
    },
});

// ── Get summary by match ─────────────────────────────────────────────────
export const getSummaryByMatch = query({
    args: { matchId: v.id("matches") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("matchSummaries")
            .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
            .first();
    },
});

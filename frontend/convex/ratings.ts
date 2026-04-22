import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Create rating ────────────────────────────────────────────────────────
export const createRating = mutation({
    args: {
        ratedId: v.id("users"),
        matchId: v.id("matches"),
        score: v.number(),
        comment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        if (args.score < 1 || args.score > 5) {
            throw new Error("Score must be between 1 and 5");
        }

        const raterRole = user.role;
        if (raterRole !== "player" && raterRole !== "scout") {
            throw new Error("Only players and scouts can rate");
        }

        // Check for existing rating on same match by same user
        const existingRatings = await ctx.db
            .query("ratings")
            .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
            .collect();

        const alreadyRated = existingRatings.find(
            (r) => r.raterId === userId
        );
        if (alreadyRated) {
            throw new Error("You have already rated this match");
        }

        const ratingId = await ctx.db.insert("ratings", {
            raterId: userId,
            ratedId: args.ratedId,
            matchId: args.matchId,
            raterRole: raterRole as "player" | "scout",
            score: args.score,
            comment: args.comment,
            createdAt: Date.now(),
        });

        // Notify the rated user
        await ctx.db.insert("notifications", {
            userId: args.ratedId,
            type: "new_rating",
            message: `You received a ${args.score}-star rating from a ${raterRole}`,
            relatedId: ratingId,
            isRead: false,
            createdAt: Date.now(),
        });

        return ratingId;
    },
});

// ── Get ratings for a user ───────────────────────────────────────────────
export const getRatingsByUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("ratings")
            .withIndex("by_ratedId", (q) => q.eq("ratedId", args.userId))
            .order("desc")
            .collect();
    },
});

// ── Get average rating for a user ────────────────────────────────────────
export const getAverageRating = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const ratings = await ctx.db
            .query("ratings")
            .withIndex("by_ratedId", (q) => q.eq("ratedId", args.userId))
            .collect();

        if (ratings.length === 0) {
            return { average: 0, count: 0 };
        }

        const sum = ratings.reduce((acc, r) => acc + r.score, 0);
        return {
            average: Math.round((sum / ratings.length) * 10) / 10,
            count: ratings.length,
        };
    },
});

// ── Get ratings for a match ──────────────────────────────────────────────
export const getRatingsByMatch = query({
    args: { matchId: v.id("matches") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("ratings")
            .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
            .collect();
    },
});

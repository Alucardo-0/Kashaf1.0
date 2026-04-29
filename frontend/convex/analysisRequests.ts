import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// ── Create analysis request (player hires analyst) ───────────────────────
export const createRequest = mutation({
    args: {
        analystId: v.id("users"),
        matchId: v.id("matches"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user || user.role !== "player") {
            throw new Error("Only players can request analyses");
        }

        const requestId = await ctx.db.insert("analysisRequests", {
            playerId: userId,
            analystId: args.analystId,
            matchId: args.matchId,
            status: "pending",
            createdAt: Date.now(),
        });

        // Send notification to analyst
        await ctx.db.insert("notifications", {
            userId: args.analystId,
            type: "new_request",
            message: `New analysis request from ${user.name}`,
            relatedId: requestId,
            isRead: false,
            createdAt: Date.now(),
        });

        return requestId;
    },
});

// ── Get requests by analyst ──────────────────────────────────────────────
export const getRequestsByAnalyst = query({
    args: { status: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const requests = await ctx.db
            .query("analysisRequests")
            .withIndex("by_analystId", (q) => q.eq("analystId", userId))
            .order("desc")
            .collect();

        if (args.status) {
            return requests.filter((r) => r.status === args.status);
        }
        return requests;
    },
});

// ── Get requests by player ───────────────────────────────────────────────
export const getRequestsByPlayer = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        return await ctx.db
            .query("analysisRequests")
            .withIndex("by_playerId", (q) => q.eq("playerId", userId))
            .order("desc")
            .collect();
    },
});

// ── Update request status ────────────────────────────────────────────────
export const updateRequestStatus = mutation({
    args: {
        requestId: v.id("analysisRequests"),
        status: v.union(
            v.literal("accepted"),
            v.literal("declined"),
            v.literal("completed")
        ),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const request = await ctx.db.get(args.requestId);
        if (!request) throw new Error("Request not found");

        await ctx.db.patch(args.requestId, { status: args.status });

        // If accepted, assign analyst to match and update status
        if (args.status === "accepted") {
            await ctx.db.patch(request.matchId, {
                analystId: request.analystId,
                status: "analyst_assigned",
            });

            // Notify player
            await ctx.db.insert("notifications", {
                userId: request.playerId,
                type: "request_accepted",
                message: "Your analysis request has been accepted! The analyst will begin working on your match.",
                relatedId: args.requestId,
                isRead: false,
                createdAt: Date.now(),
            });
        }

        if (args.status === "declined") {
            // Reassign to next available analyst
            await ctx.scheduler.runAfter(0, internal.autoAssign.reassignOnDecline, {
                requestId: args.requestId,
            });

            // Notify player
            await ctx.db.insert("notifications", {
                userId: request.playerId,
                type: "request_declined",
                message: "An analyst couldn't take your match right now. We're assigning another one.",
                relatedId: args.requestId,
                isRead: false,
                createdAt: Date.now(),
            });
        }
    },
});

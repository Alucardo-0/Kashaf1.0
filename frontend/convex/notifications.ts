import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Create notification ──────────────────────────────────────────────────
export const createNotification = mutation({
    args: {
        userId: v.id("users"),
        type: v.string(),
        message: v.string(),
        relatedId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("notifications", {
            userId: args.userId,
            type: args.type,
            message: args.message,
            relatedId: args.relatedId,
            isRead: false,
            createdAt: Date.now(),
        });
    },
});

// ── Get notifications for current user ───────────────────────────────────
export const getNotificationsByUser = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        return await ctx.db
            .query("notifications")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .order("desc")
            .take(50);
    },
});

// ── Get unread count ─────────────────────────────────────────────────────
export const getUnreadCount = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return 0;

        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_userId_unread", (q) =>
                q.eq("userId", userId).eq("isRead", false)
            )
            .collect();

        return unread.length;
    },
});

// ── Mark notification as read ────────────────────────────────────────────
export const markAsRead = mutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const notification = await ctx.db.get(args.notificationId);
        if (!notification) throw new Error("Notification not found");
        if (notification.userId !== userId) {
            throw new Error("Not your notification");
        }

        await ctx.db.patch(args.notificationId, { isRead: true });
    },
});

// ── Mark all as read ─────────────────────────────────────────────────────
export const markAllAsRead = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_userId_unread", (q) =>
                q.eq("userId", userId).eq("isRead", false)
            )
            .collect();

        for (const notification of unread) {
            await ctx.db.patch(notification._id, { isRead: true });
        }
    },
});

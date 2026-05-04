import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Get user's custom keyboard shortcuts ─────────────────────────────────
export const getShortcuts = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        return await ctx.db
            .query("keyboardShortcuts")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();
    },
});

// ── Save / update keyboard shortcuts ─────────────────────────────────────
export const saveShortcuts = mutation({
    args: {
        shortcuts: v.any(), // Record<eventTypeValue, shortcutKey>
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const existing = await ctx.db
            .query("keyboardShortcuts")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                shortcuts: args.shortcuts,
                updatedAt: Date.now(),
            });
            return existing._id;
        } else {
            return await ctx.db.insert("keyboardShortcuts", {
                userId,
                shortcuts: args.shortcuts,
                updatedAt: Date.now(),
            });
        }
    },
});

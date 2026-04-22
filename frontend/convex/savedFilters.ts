import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Save filter ──────────────────────────────────────────────────────────
export const saveFilter = mutation({
    args: {
        filterName: v.string(),
        filters: v.any(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user || user.role !== "scout") {
            throw new Error("Only scouts can save filters");
        }

        return await ctx.db.insert("savedFilters", {
            scoutId: userId,
            filterName: args.filterName,
            filters: args.filters,
            createdAt: Date.now(),
        });
    },
});

// ── Get filters by scout ─────────────────────────────────────────────────
export const getFiltersByScout = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        return await ctx.db
            .query("savedFilters")
            .withIndex("by_scoutId", (q) => q.eq("scoutId", userId))
            .order("desc")
            .collect();
    },
});

// ── Delete filter ────────────────────────────────────────────────────────
export const deleteFilter = mutation({
    args: { filterId: v.id("savedFilters") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const filter = await ctx.db.get(args.filterId);
        if (!filter) throw new Error("Filter not found");
        if (filter.scoutId !== userId) {
            throw new Error("Not your filter");
        }

        await ctx.db.delete(args.filterId);
    },
});

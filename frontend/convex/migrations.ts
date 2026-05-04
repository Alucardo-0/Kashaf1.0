import { internalMutation } from "./_generated/server";

/**
 * One-time migration: set shirtNumber = 5 for all existing matches
 * that don't already have a shirtNumber.
 * 
 * Run via Convex dashboard or programmatically:
 *   npx convex run migrations:backfillShirtNumbers
 */
export const backfillShirtNumbers = internalMutation({
    args: {},
    handler: async (ctx) => {
        const allMatches = await ctx.db.query("matches").collect();
        let updated = 0;
        for (const match of allMatches) {
            if (match.shirtNumber === undefined || match.shirtNumber === null) {
                await ctx.db.patch(match._id, { shirtNumber: 5 });
                updated++;
            }
        }
        return { total: allMatches.length, updated };
    },
});

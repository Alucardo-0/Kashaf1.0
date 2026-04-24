import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Auto-assign an analyst to a match using least-busy round-robin.
 * 
 * Strategy:
 * 1. Get all analysts with onboardingComplete = true
 * 2. Count their active jobs (pending or accepted requests)
 * 3. Exclude analysts who have already declined this match
 * 4. Pick the one with the fewest active jobs (ties broken by earliest registration)
 */
export const autoAssignAnalyst = internalMutation({
    args: { matchId: v.id("matches") },
    handler: async (ctx, args) => {
        const match = await ctx.db.get(args.matchId);
        if (!match) throw new Error("Match not found");

        // Get the player who uploaded this match (for notification)
        const player = await ctx.db.get(match.playerId);

        // Get all analysts with completed onboarding
        const allAnalysts = await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "analyst"))
            .collect();

        const readyAnalysts = allAnalysts.filter((a) => a.onboardingComplete);

        if (readyAnalysts.length === 0) {
            // No analysts available, leave match in pending_analyst state
            console.warn(`[AutoAssign] No analysts available for match ${args.matchId}`);
            return null;
        }

        // Get all existing requests for this match (to find who already declined)
        const existingRequests = await ctx.db
            .query("analysisRequests")
            .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
            .collect();

        const declinedAnalystIds = new Set(
            existingRequests
                .filter((r) => r.status === "declined")
                .map((r) => r.analystId.toString())
        );

        // Filter out declined analysts
        const eligibleAnalysts = readyAnalysts.filter(
            (a) => !declinedAnalystIds.has(a._id.toString())
        );

        if (eligibleAnalysts.length === 0) {
            console.warn(`[AutoAssign] All analysts have declined match ${args.matchId}`);
            await ctx.db.patch(args.matchId, { status: "pending_analyst" });

            // Notify the player
            if (player) {
                await ctx.db.insert("notifications", {
                    userId: match.playerId,
                    type: "no_analyst_available",
                    message: "We're having trouble finding an available analyst for your match. Our team is working on it.",
                    relatedId: args.matchId,
                    isRead: false,
                    createdAt: Date.now(),
                });
            }
            return null;
        }

        // Count active load per analyst (pending + accepted requests)
        const allRequests = await ctx.db
            .query("analysisRequests")
            .collect();

        const loadMap = new Map<string, number>();
        for (const analyst of eligibleAnalysts) {
            loadMap.set(analyst._id.toString(), 0);
        }
        for (const req of allRequests) {
            const aid = req.analystId.toString();
            if (loadMap.has(aid) && (req.status === "pending" || req.status === "accepted")) {
                loadMap.set(aid, (loadMap.get(aid) ?? 0) + 1);
            }
        }

        // Sort by load ascending, then by creation time ascending (earliest registered first)
        eligibleAnalysts.sort((a, b) => {
            const loadA = loadMap.get(a._id.toString()) ?? 0;
            const loadB = loadMap.get(b._id.toString()) ?? 0;
            if (loadA !== loadB) return loadA - loadB;
            return a._creationTime - b._creationTime;
        });

        const chosenAnalyst = eligibleAnalysts[0];

        // Create the analysis request
        const requestId = await ctx.db.insert("analysisRequests", {
            playerId: match.playerId,
            analystId: chosenAnalyst._id,
            matchId: args.matchId,
            status: "pending",
            agreedPrice: 0,
            createdAt: Date.now(),
        });

        // Assign analyst to match
        await ctx.db.patch(args.matchId, {
            analystId: chosenAnalyst._id,
            status: "analyst_assigned",
        });

        // Notify the analyst
        await ctx.db.insert("notifications", {
            userId: chosenAnalyst._id,
            type: "new_assignment",
            message: `You've been assigned a new match to analyze${player?.name ? ` for ${player.name}` : ""}.`,
            relatedId: requestId,
            isRead: false,
            createdAt: Date.now(),
        });

        // Notify the player
        await ctx.db.insert("notifications", {
            userId: match.playerId,
            type: "analyst_assigned",
            message: `An analyst (${chosenAnalyst.name ?? "Team Analyst"}) has been assigned to your match.`,
            relatedId: requestId,
            isRead: false,
            createdAt: Date.now(),
        });

        return requestId;
    },
});

/**
 * When an analyst declines, reassign to the next available analyst.
 */
export const reassignOnDecline = internalMutation({
    args: { requestId: v.id("analysisRequests") },
    handler: async (ctx, args) => {
        const request = await ctx.db.get(args.requestId);
        if (!request) throw new Error("Request not found");

        // Reset the match analyst assignment so autoAssign can pick a new one
        await ctx.db.patch(request.matchId, {
            analystId: undefined,
            status: "pending_analyst",
        });

        // Re-run auto assignment (which will skip all declined analysts)
        // We call the same logic inline since we can't call ourselves as internalMutation
        const match = await ctx.db.get(request.matchId);
        if (!match) return;

        const player = await ctx.db.get(match.playerId);

        const allAnalysts = await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "analyst"))
            .collect();

        const readyAnalysts = allAnalysts.filter((a) => a.onboardingComplete);

        const existingRequests = await ctx.db
            .query("analysisRequests")
            .withIndex("by_matchId", (q) => q.eq("matchId", request.matchId))
            .collect();

        const declinedAnalystIds = new Set(
            existingRequests
                .filter((r) => r.status === "declined")
                .map((r) => r.analystId.toString())
        );

        const eligibleAnalysts = readyAnalysts.filter(
            (a) => !declinedAnalystIds.has(a._id.toString())
        );

        if (eligibleAnalysts.length === 0) {
            console.warn(`[Reassign] All analysts declined match ${request.matchId}`);
            if (player) {
                await ctx.db.insert("notifications", {
                    userId: match.playerId,
                    type: "no_analyst_available",
                    message: "We're still looking for an analyst for your match. Hang tight!",
                    relatedId: request.matchId,
                    isRead: false,
                    createdAt: Date.now(),
                });
            }
            return null;
        }

        // Least-busy selection
        const allReqs = await ctx.db.query("analysisRequests").collect();
        const loadMap = new Map<string, number>();
        for (const a of eligibleAnalysts) loadMap.set(a._id.toString(), 0);
        for (const r of allReqs) {
            const aid = r.analystId.toString();
            if (loadMap.has(aid) && (r.status === "pending" || r.status === "accepted")) {
                loadMap.set(aid, (loadMap.get(aid) ?? 0) + 1);
            }
        }

        eligibleAnalysts.sort((a, b) => {
            const loadA = loadMap.get(a._id.toString()) ?? 0;
            const loadB = loadMap.get(b._id.toString()) ?? 0;
            if (loadA !== loadB) return loadA - loadB;
            return a._creationTime - b._creationTime;
        });

        const chosenAnalyst = eligibleAnalysts[0];

        const newRequestId = await ctx.db.insert("analysisRequests", {
            playerId: match.playerId,
            analystId: chosenAnalyst._id,
            matchId: request.matchId,
            status: "pending",
            agreedPrice: 0,
            createdAt: Date.now(),
        });

        await ctx.db.patch(request.matchId, {
            analystId: chosenAnalyst._id,
            status: "analyst_assigned",
        });

        await ctx.db.insert("notifications", {
            userId: chosenAnalyst._id,
            type: "new_assignment",
            message: `You've been assigned a new match to analyze${player?.name ? ` for ${player.name}` : ""}.`,
            relatedId: newRequestId,
            isRead: false,
            createdAt: Date.now(),
        });

        return newRequestId;
    },
});

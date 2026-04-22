import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getProfiles = query({
  args: {
    unit: v.optional(v.string()),
    topArchetype: v.optional(v.string()),
    archetypeThreshold: v.optional(v.number()),
    minMatches: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let profiles = await ctx.db.query("playerEngineProfiles").collect();

    if (args.unit) {
      profiles = profiles.filter((p) => p.unit.toLowerCase() === args.unit?.toLowerCase());
    }
    
    if (args.topArchetype) {
      profiles = profiles.filter((p) => p.topArchetype === args.topArchetype);
    }
    
    if (args.archetypeThreshold !== undefined) {
      const threshold = args.archetypeThreshold;
      profiles = profiles.filter(
        (p) => p.archetypes[p.topArchetype] !== undefined && p.archetypes[p.topArchetype] >= threshold
      );
    }
    
    if (args.minMatches !== undefined) {
      profiles = profiles.filter((p) => p.matchCount >= args.minMatches!);
    }

    return profiles;
  },
});

export const getProfileByPlayerId = query({
  args: { playerId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("playerEngineProfiles")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();
  },
});

export const addMockProfile = mutation({
  args: {},
  handler: async (ctx) => {
    // Generate an ID for mock player. Just use the first user or let's find an arbitrary user.
    const user = await ctx.db.query("users").first();
    if (!user) {
        throw new Error("No users found to attach profile");
    }

    await ctx.db.insert("playerEngineProfiles", {
      playerId: user._id,
      playerName: "Ahmed Hassan",
      unit: "cb",
      topArchetype: "Ball-Playing Defender",
      topPct: 64.4,
      matchCount: 4, // Reliable
      archetypes: {
        "Ball-Playing Defender": 64.4,
        "Interceptor": 28.3,
        "Stopper": 7.3
      },
      coreFeatures: {
        "defensive_actions_p90": 4.2,
        "tackle_ratio": 0.48,
        "aerial_duels_p90": 2.1,
        "progressive_passes_p90": 3.8,
        "median_defensive_action_height": 38.5
      },
      contextFeatures: {
        "aerial_win_pct": 61.2,
        "pass_completion_pct": 84.3,
        "tackle_win_pct": 58.0,
        "long_passes_p90": 3.2,
        "defensive_action_height_iqr": 18.4,
        "median_action_height": 41.2
      },
      twins: [
        {
          player_name: "Virgil van Dijk [2019/2020]",
          similarity: 87.3,
          context: {
            "aerial_win_pct": 68.0,
            "pass_completion_pct": 88.47,
            "tackle_win_pct": 61.84,
            "long_passes_p90": 5.64,
            "defensive_action_height_iqr": 30.15,
            "median_action_height": 33.67
          }
        },
        {
          player_name: "Sergio Ramos [2018/2019]",
          similarity: 81.2,
          context: {
            "aerial_win_pct": 65.0,
            "pass_completion_pct": 85.0,
            "tackle_win_pct": 60.5,
            "long_passes_p90": 4.5,
            "defensive_action_height_iqr": 25.0,
            "median_action_height": 35.0
          }
        },
        {
          player_name: "Ruben Dias [2020/2021]",
          similarity: 78.9,
          context: {
            "aerial_win_pct": 59.0,
            "pass_completion_pct": 89.0,
            "tackle_win_pct": 55.0,
            "long_passes_p90": 2.8,
            "defensive_action_height_iqr": 20.0,
            "median_action_height": 38.0
          }
        }
      ],
      createdAt: Date.now(),
    });
  }
});

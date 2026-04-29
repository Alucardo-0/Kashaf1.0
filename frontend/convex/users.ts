import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Get the current authenticated user ───────────────────────────────────
export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;
        return await ctx.db.get(userId);
    },
});

// ── Get user by ID ───────────────────────────────────────────────────────
export const getUserById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

// ── List users by role ───────────────────────────────────────────────────
export const listUsersByRole = query({
    args: {
        role: v.union(
            v.literal("player"),
            v.literal("analyst"),
            v.literal("scout")
        ),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", args.role))
            .collect();
    },
});

// ── List analysts with optional filters ──────────────────────────────────
export const listAnalysts = query({
    args: {
        language: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let analysts = await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "analyst"))
            .collect();

        if (args.language) {
            analysts = analysts.filter((a) =>
                a.analystProfile?.languages.includes(args.language!)
            );
        }

        return analysts;
    },
});

// ── Set user role (onboarding step 1) ────────────────────────────────────
export const setUserRole = mutation({
    args: {
        role: v.union(
            v.literal("player"),
            v.literal("analyst"),
            v.literal("scout")
        ),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");
        await ctx.db.patch(userId, { role: args.role });
    },
});

// ── Complete player profile (onboarding step 2) ──────────────────────────
export const completePlayerProfile = mutation({
    args: {
        name: v.string(),
        profilePhoto: v.optional(v.string()),
        playerProfile: v.object({
            age: v.number(),
            nationality: v.string(),
            position: v.string(),
            secondaryPosition: v.optional(v.string()),
            height: v.number(),
            weight: v.number(),
            foot: v.union(v.literal("left"), v.literal("right"), v.literal("both")),
            currentClub: v.optional(v.string()),
            contactWhatsapp: v.optional(v.string()),
            contactEmail: v.optional(v.string()),
            contactAgent: v.optional(v.string()),
            marketValue: v.optional(v.number()),
        }),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");
        await ctx.db.patch(userId, {
            name: args.name,
            profilePhoto: args.profilePhoto,
            playerProfile: args.playerProfile,
            onboardingComplete: true,
        });
    },
});

// ── Complete analyst profile (onboarding step 2) ─────────────────────────
export const completeAnalystProfile = mutation({
    args: {
        name: v.string(),
        profilePhoto: v.optional(v.string()),
        analystProfile: v.object({
            nationality: v.string(),
            experience: v.number(),
            certifications: v.array(v.string()),
            languages: v.array(v.string()),
            bio: v.string(),
        }),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");
        await ctx.db.patch(userId, {
            name: args.name,
            profilePhoto: args.profilePhoto,
            analystProfile: args.analystProfile,
            onboardingComplete: true,
        });
    },
});

// ── Complete scout profile (onboarding step 2) ───────────────────────────
export const completeScoutProfile = mutation({
    args: {
        name: v.string(),
        profilePhoto: v.optional(v.string()),
        scoutProfile: v.object({
            clubName: v.string(),
            clubLogo: v.optional(v.string()),
            country: v.string(),
            leagueLevel: v.string(),
            isVerified: v.boolean(),
            verificationDocId: v.optional(v.id("_storage")),
        }),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");
        await ctx.db.patch(userId, {
            name: args.name,
            profilePhoto: args.profilePhoto,
            scoutProfile: args.scoutProfile,
            onboardingComplete: true,
            scoutApprovalStatus: "pending",
        });
    },
});

// ── Update user profile ──────────────────────────────────────────────────
export const updateUserProfile = mutation({
    args: {
        name: v.optional(v.string()),
        profilePhoto: v.optional(v.string()),
        playerProfile: v.optional(
            v.object({
                age: v.number(),
                nationality: v.string(),
                position: v.string(),
                secondaryPosition: v.optional(v.string()),
                height: v.number(),
                weight: v.number(),
                foot: v.union(
                    v.literal("left"),
                    v.literal("right"),
                    v.literal("both")
                ),
                currentClub: v.optional(v.string()),
                contactWhatsapp: v.optional(v.string()),
                contactEmail: v.optional(v.string()),
                contactAgent: v.optional(v.string()),
                marketValue: v.optional(v.number()),
            })
        ),
        analystProfile: v.optional(
            v.object({
                nationality: v.string(),
                experience: v.number(),
                certifications: v.array(v.string()),
                languages: v.array(v.string()),
                bio: v.string(),
            })
        ),
        scoutProfile: v.optional(
            v.object({
                clubName: v.string(),
                clubLogo: v.optional(v.string()),
                country: v.string(),
                leagueLevel: v.string(),
                isVerified: v.boolean(),
                verificationDocId: v.optional(v.id("_storage")),
            })
        ),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const updates: Record<string, unknown> = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.profilePhoto !== undefined)
            updates.profilePhoto = args.profilePhoto;
        if (args.playerProfile !== undefined)
            updates.playerProfile = args.playerProfile;
        if (args.analystProfile !== undefined)
            updates.analystProfile = args.analystProfile;
        if (args.scoutProfile !== undefined)
            updates.scoutProfile = args.scoutProfile;

        await ctx.db.patch(userId, updates);
    },
});

// ── Platform stats (for landing page) ────────────────────────────────────
export const getPlatformStats = query({
    args: {},
    handler: async (ctx) => {
        const players = await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "player"))
            .collect();

        const analysts = await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "analyst"))
            .collect();

        const scouts = await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "scout"))
            .collect();

        const completedMatches = await ctx.db
            .query("matches")
            .withIndex("by_status", (q) => q.eq("status", "completed"))
            .collect();

        return {
            totalPlayers: players.length,
            totalAnalysts: analysts.length,
            totalScouts: scouts.length,
            totalAnalyses: completedMatches.length,
        };
    },
});

// ── List all users (admin) ───────────────────────────────────────────────
export const listAllUsers = query({
    args: {
        role: v.optional(
            v.union(
                v.literal("player"),
                v.literal("analyst"),
                v.literal("scout")
            )
        ),
    },
    handler: async (ctx, args) => {
        if (args.role) {
            return await ctx.db
                .query("users")
                .withIndex("by_role", (q) => q.eq("role", args.role!))
                .collect();
        }
        return await ctx.db.query("users").collect();
    },
});

// ── Verify / approve scout (admin) ───────────────────────────────────────
export const verifyScout = mutation({
    args: { scoutId: v.id("users") },
    handler: async (ctx, args) => {
        const scout = await ctx.db.get(args.scoutId);
        if (!scout || scout.role !== "scout" || !scout.scoutProfile) {
            throw new Error("User is not a scout");
        }
        await ctx.db.patch(args.scoutId, {
            scoutProfile: {
                ...scout.scoutProfile,
                isVerified: true,
            },
            scoutApprovalStatus: "approved",
        });
    },
});

// ── Reject scout (admin) ─────────────────────────────────────────────────
export const rejectScout = mutation({
    args: { scoutId: v.id("users") },
    handler: async (ctx, args) => {
        const scout = await ctx.db.get(args.scoutId);
        if (!scout || scout.role !== "scout") {
            throw new Error("User is not a scout");
        }
        await ctx.db.patch(args.scoutId, {
            scoutApprovalStatus: "rejected",
        });
    },
});

// ── Search players (for scouts) ──────────────────────────────────────────
export const searchPlayers = query({
    args: {
        position: v.optional(v.string()),
        minPositionMatch: v.optional(v.number()),
        minAge: v.optional(v.number()),
        maxAge: v.optional(v.number()),
        nationality: v.optional(v.string()),
        foot: v.optional(
            v.union(v.literal("left"), v.literal("right"), v.literal("both"))
        ),
        minAnalyzedMatches: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Get all players
        let players = await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "player"))
            .collect();

        // Filter by age
        if (args.minAge !== undefined) {
            players = players.filter(
                (p) =>
                    p.playerProfile?.age !== undefined &&
                    p.playerProfile.age >= args.minAge!
            );
        }
        if (args.maxAge !== undefined) {
            players = players.filter(
                (p) =>
                    p.playerProfile?.age !== undefined &&
                    p.playerProfile.age <= args.maxAge!
            );
        }

        // Filter by nationality
        if (args.nationality) {
            players = players.filter(
                (p) => p.playerProfile?.nationality === args.nationality
            );
        }

        // Filter by foot
        if (args.foot) {
            players = players.filter(
                (p) => p.playerProfile?.foot === args.foot
            );
        }

        // Get position profiles for each player
        const results = await Promise.all(
            players.map(async (player) => {
                const positionProfile = await ctx.db
                    .query("playerPositionProfiles")
                    .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
                    .first();

                return {
                    ...player,
                    positionProfile: positionProfile?.profiles ?? [],
                    totalMatchesAnalyzed: positionProfile?.totalMatchesAnalyzed ?? 0,
                };
            })
        );

        // Filter by position match percentage
        let filtered = results;
        if (args.position && args.minPositionMatch !== undefined) {
            filtered = results.filter((r) => {
                const match = r.positionProfile.find(
                    (p) => p.position === args.position
                );
                return match && match.percentage >= (args.minPositionMatch ?? 0);
            });
        }

        // Filter by minimum analyzed matches
        if (args.minAnalyzedMatches !== undefined) {
            filtered = filtered.filter(
                (r) => r.totalMatchesAnalyzed >= args.minAnalyzedMatches!
            );
        }

        return filtered;
    },
});

// ── Check if current user is admin ───────────────────────────────────────
export const isAdmin = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return false;
        const user = await ctx.db.get(userId);
        if (!user) return false;
        const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
        return adminEmails.includes(user.email.toLowerCase());
    },
});

// ── Generate upload URL for scout verification doc ───────────────────────
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// ── Get scout verification doc URL ───────────────────────────────────────
export const getScoutVerificationUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});

// ── Create analyst account (admin) ───────────────────────────────────────
export const createAnalystAccount = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        analystProfile: v.object({
            nationality: v.string(),
            experience: v.number(),
            certifications: v.array(v.string()),
            languages: v.array(v.string()),
            bio: v.string(),
        }),
    },
    handler: async (ctx, args) => {
        // Check if email already exists
        const existing = await ctx.db
            .query("users")
            .withIndex("email", (q) => q.eq("email", args.email))
            .first();
        if (existing) {
            throw new Error("A user with this email already exists");
        }

        // Create user record directly (admin-provisioned, no auth credentials)
        const userId = await ctx.db.insert("users", {
            name: args.name,
            email: args.email,
            role: "analyst",
            analystProfile: args.analystProfile,
            onboardingComplete: true,
        });

        return userId;
    },
});

// ── Delete user (admin) ──────────────────────────────────────────────────
export const deleteUser = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found");
        await ctx.db.delete(args.userId);
    },
});

// ── Get pending scouts ───────────────────────────────────────────────────
export const getPendingScouts = query({
    args: {},
    handler: async (ctx) => {
        const scouts = await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "scout"))
            .collect();
        return scouts.filter((s) => s.scoutApprovalStatus === "pending");
    },
});

"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";

/* ── Status helpers ──────────────────────────────────────────────────── */
const requestStatusStyles: Record<string, { label: string; class: string }> = {
    pending: { label: "Pending", class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
    accepted: { label: "Accepted", class: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    declined: { label: "Declined", class: "bg-red-500/15 text-red-400 border-red-500/30" },
    completed: { label: "Completed", class: "bg-[#00FF87]/15 text-[#00FF87] border-[#00FF87]/30" },
};

const matchStatusStyles: Record<string, { label: string; class: string }> = {
    analyst_assigned: { label: "Assigned", class: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    analysis_in_progress: { label: "In Progress", class: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
    completed: { label: "Completed", class: "bg-[#00FF87]/15 text-[#00FF87] border-[#00FF87]/30" },
};

/* ── Tabs ─────────────────────────────────────────────────────────────── */
type Tab = "overview" | "requests" | "matches";

/* ══════════════════════════════════════════════════════════════════════
   ANALYST DASHBOARD
   ══════════════════════════════════════════════════════════════════════ */
export default function AnalystDashboard() {
    const user = useQuery(api.users.getCurrentUser);
    const requests = useQuery(api.analysisRequests.getRequestsByAnalyst, {});
    const matches = useQuery(api.matches.getMatchesByAnalystWithPlayerDetails, {});
    const avgRating = useQuery(
        api.ratings.getAverageRating,
        user?._id ? { userId: user._id } : "skip"
    );
    const notifications = useQuery(api.notifications.getNotificationsByUser);
    const updateRequestStatus = useMutation(api.analysisRequests.updateRequestStatus);
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    if (user === undefined) {
        return (
            <div className="flex items-center justify-center h-screen">
                <svg className="animate-spin h-8 w-8 text-[#3B82F6]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            </div>
        );
    }

    if (user && user.role !== "analyst") {
        router.push(`/dashboard/${user.role}`);
        return null;
    }

    const pendingRequests = requests?.filter((r) => r.status === "pending") ?? [];
    const activeJobs = requests?.filter((r) => r.status === "accepted") ?? [];
    const completedJobs = requests?.filter((r) => r.status === "completed") ?? [];

    const handleRequestAction = async (requestId: Id<"analysisRequests">, status: "accepted" | "declined") => {
        setActionLoading(requestId);
        try {
            await updateRequestStatus({ requestId, status });
        } catch {
            /* silent */
        }
        setActionLoading(null);
    };

    /* ── Stat Cards Data ─────────────────────────────────────────────── */
    const stats = [
        {
            label: "Completed Analyses",
            value: completedJobs.length,
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            ),
            color: "#22c55e",
        },
        {
            label: "Pending Requests",
            value: pendingRequests.length,
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
            ),
            color: "#eab308",
        },
        {
            label: "Avg. Rating",
            value: avgRating?.average ? `${avgRating.average} ★` : "—",
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
            ),
            color: "#3B82F6",
        },
    ];

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: "overview", label: "Overview" },
        { key: "requests", label: "Requests", count: pendingRequests.length },
        { key: "matches", label: "My Matches", count: matches?.length },
    ];

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        Welcome back, <span className="text-[#3B82F6]">{user?.name?.split(" ")[0] ?? "Analyst"}</span>
                    </h1>
                    <p className="text-sm text-white/40 mt-1">
                        {user?.analystProfile?.experience ?? 0}yr experience
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/settings")}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        Edit Profile
                    </button>
                </div>
            </div>

            {/* ── Stat Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-white/30" style={{ color: stat.color }}>{stat.icon}</span>
                            <span className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</span>
                        </div>
                        <p className="text-xs text-white/40 font-medium">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Tabs ────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                            activeTab === tab.key
                                ? "bg-[#3B82F6]/15 text-[#3B82F6]"
                                : "text-white/40 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Tab Content ─────────────────────────────────────────────── */}
            {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Incoming Requests */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">Pending Requests</h2>
                            <button
                                onClick={() => setActiveTab("requests")}
                                className="text-xs text-[#3B82F6] hover:text-[#3B82F6]/80 cursor-pointer transition-colors"
                            >
                                View all
                            </button>
                        </div>

                        {pendingRequests.length === 0 ? (
                            <div className="text-center py-16 rounded-2xl border border-dashed border-white/10">
                                <div className="text-4xl mb-3">📭</div>
                                <p className="text-white/40 mb-1">No pending requests</p>
                                <p className="text-xs text-white/25">New analysis requests will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingRequests.slice(0, 5).map((req) => (
                                    <div key={req._id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-white">New Analysis Request</p>
                                                <p className="text-xs text-white/40 mt-0.5">
                                                    {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleRequestAction(req._id, "declined")}
                                                    disabled={actionLoading === req._id}
                                                    className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer disabled:opacity-50"
                                                >
                                                    Decline
                                                </button>
                                                <button
                                                    onClick={() => handleRequestAction(req._id, "accepted")}
                                                    disabled={actionLoading === req._id}
                                                    className="text-xs px-3 py-1.5 rounded-lg bg-[#00FF87]/15 text-[#00FF87] hover:bg-[#00FF87]/25 transition-all cursor-pointer disabled:opacity-50 font-medium"
                                                >
                                                    {actionLoading === req._id ? "..." : "Accept"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right sidebar */}
                    <div className="space-y-6">
                        {/* Analyst Info */}
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                            <h3 className="text-sm font-semibold text-white mb-4">Your Profile</h3>
                            <div className="space-y-2.5">
                                {[
                                    { label: "Experience", value: `${user?.analystProfile?.experience ?? 0} years` },
                                    { label: "Languages", value: user?.analystProfile?.languages?.join(", ") },
                                    { label: "Rating", value: avgRating?.average ? `${avgRating.average} ★ (${avgRating.count})` : "No ratings yet" },
                                    { label: "Jobs Done", value: `${completedJobs.length}` },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-center justify-between">
                                        <span className="text-xs text-white/40">{item.label}</span>
                                        <span className="text-xs font-medium text-white/70">{item.value ?? "—"}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Notifications */}
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                                <button
                                    onClick={() => router.push("/notifications")}
                                    className="text-[10px] text-[#3B82F6] hover:text-[#3B82F6]/80 cursor-pointer transition-colors"
                                >
                                    View all
                                </button>
                            </div>
                            {!notifications ? (
                                <p className="text-xs text-white/30 text-center py-4">Loading...</p>
                            ) : notifications.length === 0 ? (
                                <p className="text-xs text-white/30 text-center py-4">No notifications yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {notifications.slice(0, 5).map((n) => (
                                        <div
                                            key={n._id}
                                            className={`p-3 rounded-xl text-xs ${n.isRead ? "bg-transparent" : "bg-white/[0.02]"}`}
                                        >
                                            <p className={`${n.isRead ? "text-white/40" : "text-white/70"} leading-relaxed`}>
                                                {n.message}
                                            </p>
                                            <p className="text-white/20 text-[10px] mt-1">
                                                {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "requests" && (
                <div>
                    <h2 className="text-lg font-semibold text-white mb-4">All Requests</h2>
                    {!requests ? (
                        <div className="text-center py-16 text-white/30">Loading...</div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border border-dashed border-white/10">
                            <div className="text-4xl mb-3">📭</div>
                            <p className="text-white/40">No requests received yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map((req) => {
                                const st = requestStatusStyles[req.status] ?? requestStatusStyles.pending;
                                return (
                                    <div key={req._id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#3B82F6]/10 flex items-center justify-center text-sm font-bold text-[#3B82F6]">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white">Analysis Request</p>
                                                    <p className="text-xs text-white/40 mt-0.5">
                                                        {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border ${st.class}`}>
                                                    {st.label}
                                                </span>
                                                {req.status === "pending" && (
                                                    <>
                                                        <button
                                                            onClick={() => handleRequestAction(req._id, "declined")}
                                                            disabled={actionLoading === req._id}
                                                            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer disabled:opacity-50"
                                                        >
                                                            Decline
                                                        </button>
                                                        <button
                                                            onClick={() => handleRequestAction(req._id, "accepted")}
                                                            disabled={actionLoading === req._id}
                                                            className="text-xs px-3 py-1.5 rounded-lg bg-[#00FF87]/15 text-[#00FF87] hover:bg-[#00FF87]/25 transition-all cursor-pointer disabled:opacity-50 font-medium"
                                                        >
                                                            {actionLoading === req._id ? "..." : "Accept"}
                                                        </button>
                                                    </>
                                                )}
                                                {req.status === "accepted" && (
                                                    <button
                                                        onClick={() => router.push(`/analysis/${req.matchId}`)}
                                                        className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition-all cursor-pointer font-medium"
                                                    >
                                                        Start Analysis
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === "matches" && (
                <div>
                    <h2 className="text-lg font-semibold text-white mb-4">My Matches</h2>
                    {!matches ? (
                        <div className="text-center py-16 text-white/30">Loading...</div>
                    ) : matches.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border border-dashed border-white/10">
                            <div className="text-4xl mb-3">🎬</div>
                            <p className="text-white/40 mb-1">No matches assigned yet</p>
                            <p className="text-xs text-white/25">Accept analysis requests to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {matches.map((match) => {
                                const st = matchStatusStyles[match.status] ?? matchStatusStyles.analyst_assigned;
                                return (
                                    <div key={match._id} className="group p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all">
                                        <div className="flex items-start gap-4">
                                            {/* Thumbnail */}
                                            <div className="w-28 h-16 rounded-xl overflow-hidden bg-white/5 shrink-0">
                                                <img
                                                    src={`https://img.youtube.com/vi/${match.youtubeVideoId}/mqdefault.jpg`}
                                                    alt="Match thumbnail"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-sm font-medium text-white truncate">
                                                        {match.opponentName ? `vs ${match.opponentName}` : "Match Footage"}
                                                    </h3>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border ${st.class}`}>
                                                        {st.label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-white/50 font-medium">
                                                    <span className="text-[#3B82F6]">{(match as any).playerName ?? "Unknown Player"}</span>
                                                    <span className="text-white/25 mx-1.5">·</span>
                                                    <span className="text-white/40">#{(match as any).playerShirtNumber ?? 5}</span>
                                                </p>
                                                <p className="text-xs text-white/30">
                                                    {match.matchDate
                                                        ? new Date(match.matchDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                                                        : new Date(match.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                                                    }
                                                </p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                {(match.status === "analyst_assigned" || match.status === "analysis_in_progress") && (
                                                    <button
                                                        onClick={() => router.push(`/analysis/${match._id}`)}
                                                        className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition-all cursor-pointer font-medium"
                                                    >
                                                        {match.status === "analyst_assigned" ? "Start Analysis" : "Continue"}
                                                    </button>
                                                )}
                                                {match.status === "completed" && (
                                                    <>
                                                        <button
                                                            onClick={() => router.push(`/analysis/${match._id}`)}
                                                            className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 transition-all cursor-pointer font-medium"
                                                        >
                                                            Edit Tags
                                                        </button>
                                                        <button
                                                            onClick={() => router.push(`/players/${match.playerId}/matches/${match._id}`)}
                                                            className="text-xs px-3 py-1.5 rounded-lg bg-[#00FF87]/15 text-[#00FF87] hover:bg-[#00FF87]/25 transition-all cursor-pointer font-medium"
                                                        >
                                                            View Report
                                                        </button>
                                                    </>
                                                )}
                                                <a
                                                    href={match.youtubeUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-white/30 hover:text-white/60 transition-colors"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

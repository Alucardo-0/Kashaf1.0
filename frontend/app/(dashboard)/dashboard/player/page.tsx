"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

/* ── Status helpers ──────────────────────────────────────────────────── */
const statusStyles: Record<string, { label: string; class: string }> = {
    pending_analyst: { label: "Awaiting Analyst", class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
    analyst_assigned: { label: "Analyst Assigned", class: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    analysis_in_progress: { label: "In Progress", class: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
    completed: { label: "Completed", class: "bg-[#00FF87]/15 text-[#00FF87] border-[#00FF87]/30" },
};

/* ── YouTube ID extractor ────────────────────────────────────────────── */
function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

/* ── Upload Match Modal ──────────────────────────────────────────────── */
function UploadMatchModal({ onClose }: { onClose: () => void }) {
    const createMatch = useMutation(api.matches.createMatch);
    const [url, setUrl] = useState("");
    const [opponent, setOpponent] = useState("");
    const [matchDate, setMatchDate] = useState("");
    const [shirtNumber, setShirtNumber] = useState("");
    const [playerNote, setPlayerNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const videoId = url ? extractYouTubeId(url) : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoId) { setError("Please enter a valid YouTube URL"); return; }
        const shirtNum = parseInt(shirtNumber, 10);
        if (!shirtNumber || isNaN(shirtNum) || shirtNum < 1 || shirtNum > 99) {
            setError("Please enter a valid shirt number (1-99)");
            return;
        }
        setError("");
        setLoading(true);
        try {
            await createMatch({
                youtubeUrl: url,
                youtubeVideoId: videoId,
                opponentName: opponent || undefined,
                matchDate: matchDate ? new Date(matchDate).getTime() : undefined,
                shirtNumber: shirtNum,
                playerNote: playerNote || undefined,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to upload match");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-[#12121a] border border-white/10 rounded-2xl p-6 shadow-2xl animate-fade-in-up">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white">Upload Match</h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors cursor-pointer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">YouTube URL *</label>
                        <input
                            type="url" value={url} onChange={(e) => setUrl(e.target.value)} required
                            placeholder="https://youtube.com/watch?v=..."
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 focus:ring-1 focus:ring-[#00FF87]/30 transition-all"
                        />
                    </div>

                    {/* Video preview */}
                    {videoId && (
                        <div className="rounded-xl overflow-hidden border border-white/10">
                            <div className="aspect-video">
                                <iframe
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">Opponent</label>
                            <input
                                type="text" value={opponent} onChange={(e) => setOpponent(e.target.value)}
                                placeholder="e.g. FC Porto"
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 focus:ring-1 focus:ring-[#00FF87]/30 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">Match Date</label>
                            <input
                                type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 focus:ring-1 focus:ring-[#00FF87]/30 transition-all [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">Shirt Number *</label>
                        <input
                            type="number" value={shirtNumber} onChange={(e) => setShirtNumber(e.target.value)}
                            min="1" max="99" required
                            placeholder="e.g. 10"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 focus:ring-1 focus:ring-[#00FF87]/30 transition-all"
                        />
                        <p className="text-[10px] text-white/25 mt-1">Your jersey number in this match (required)</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">Note (optional)</label>
                        <textarea
                            value={playerNote} onChange={(e) => setPlayerNote(e.target.value)}
                            rows={2}
                            placeholder="Any additional details about the match..."
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 focus:ring-1 focus:ring-[#00FF87]/30 transition-all resize-none"
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-medium text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">Cancel</button>
                        <button
                            type="submit" disabled={loading || !videoId}
                            className="flex-1 py-3 rounded-xl font-semibold text-[#0A0A0F] bg-[#00FF87] hover:bg-[#00FF87]/90 transition-all hover:shadow-lg hover:shadow-[#00FF87]/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading ? "Uploading..." : "Upload Match"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


/* ══════════════════════════════════════════════════════════════════════
   PLAYER DASHBOARD
   ══════════════════════════════════════════════════════════════════════ */
export default function PlayerDashboard() {
    const user = useQuery(api.users.getCurrentUser);
    const matches = useQuery(api.matches.getMatchesByPlayer, {});
    const notifications = useQuery(api.notifications.getNotificationsByUser);
    const positionProfile = useQuery(
        api.positionProfiles.getPositionProfile,
        user?._id ? { playerId: user._id } : "skip"
    );
    const router = useRouter();

    const [showUpload, setShowUpload] = useState(false);

    if (user === undefined) {
        return (
            <div className="flex items-center justify-center h-screen">
                <svg className="animate-spin h-8 w-8 text-[#00FF87]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            </div>
        );
    }

    // Redirect non‑players
    if (user && user.role !== "player") {
        router.push(`/dashboard/${user.role}`);
        return null;
    }

    const totalMatches = matches?.length ?? 0;
    const completedMatches = matches?.filter((m) => m.status === "completed").length ?? 0;
    const pendingMatches = matches?.filter((m) => m.status === "pending_analyst").length ?? 0;
    const inProgress = matches?.filter((m) => m.status === "analyst_assigned" || m.status === "analysis_in_progress").length ?? 0;

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        Welcome back, <span className="text-[#00FF87]">{user?.name?.split(" ")[0] ?? "Player"}</span>
                    </h1>
                    <p className="text-sm text-white/40 mt-1">
                        {user?.playerProfile?.position ?? "Player"} · {user?.playerProfile?.currentClub ?? "Free Agent"}
                    </p>
                </div>
                <button
                    onClick={() => setShowUpload(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[#0A0A0F] bg-[#00FF87] hover:bg-[#00FF87]/90 transition-all hover:shadow-lg hover:shadow-[#00FF87]/25 active:scale-[0.97] cursor-pointer"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Upload Match
                </button>
            </div>

            {/* ── Stat Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Total Matches", value: totalMatches, icon: "🎬", color: "#00FF87" },
                    { label: "Completed", value: completedMatches, icon: "✅", color: "#22c55e" },
                    { label: "Awaiting Analyst", value: pendingMatches, icon: "⏳", color: "#eab308" },
                    { label: "In Progress", value: inProgress, icon: "🔄", color: "#3B82F6" },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-lg">{stat.icon}</span>
                            <span className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</span>
                        </div>
                        <p className="text-xs text-white/40 font-medium">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Matches List (2/3 width) ──────────────────────────── */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">My Matches</h2>
                        <span className="text-xs text-white/30">{totalMatches} total</span>
                    </div>

                    {!matches ? (
                        <div className="text-center py-16 text-white/30">Loading...</div>
                    ) : matches.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl border border-dashed border-white/10">
                            <div className="text-4xl mb-3">🎥</div>
                            <p className="text-white/40 mb-1">No matches uploaded yet</p>
                            <p className="text-xs text-white/25">Upload a YouTube match video to get started</p>
                            <button
                                onClick={() => setShowUpload(true)}
                                className="mt-4 text-sm px-4 py-2 rounded-xl bg-[#00FF87]/10 text-[#00FF87] hover:bg-[#00FF87]/20 transition-all cursor-pointer"
                            >
                                Upload your first match
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {matches.map((match) => {
                                const st = statusStyles[match.status] ?? statusStyles.pending_analyst;
                                return (
                                    <div
                                        key={match._id}
                                        className="group p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all"
                                    >
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
                                                <p className="text-xs text-white/30">
                                                    {match.matchDate
                                                        ? new Date(match.matchDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                                                        : new Date(match.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                                                    }
                                                </p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                {match.status === "pending_analyst" && (
                                                    <span className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">
                                                        Auto-assigning…
                                                    </span>
                                                )}
                                                {match.status === "completed" && (
                                                    <button
                                                        onClick={() => router.push(`/players/${user?._id}/matches/${match._id}`)}
                                                        className="text-xs px-3 py-1.5 rounded-lg bg-[#00FF87]/15 text-[#00FF87] hover:bg-[#00FF87]/25 transition-all cursor-pointer font-medium"
                                                    >
                                                        View Report
                                                    </button>
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

                {/* ── Right sidebar ─────────────────────────────────────── */}
                <div className="space-y-6">
                    {/* Position Profile */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <h3 className="text-sm font-semibold text-white mb-4">Position Profile</h3>
                        {positionProfile && positionProfile.profiles.length > 0 ? (
                            <div className="space-y-3">
                                {positionProfile.profiles
                                    .sort((a, b) => b.percentage - a.percentage)
                                    .slice(0, 5)
                                    .map((pos) => (
                                        <div key={pos.position}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-white/60">{pos.position}</span>
                                                <span className="text-xs font-medium text-[#00FF87]">{Math.round(pos.percentage)}%</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-[#00FF87] to-[#00cc6a] transition-all duration-700"
                                                    style={{ width: `${pos.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                <p className="text-[10px] text-white/25 pt-2">
                                    Based on {positionProfile.totalMatchesAnalyzed} analyzed match{positionProfile.totalMatchesAnalyzed !== 1 ? "es" : ""}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-xs text-white/30">No data yet</p>
                                <p className="text-[10px] text-white/20 mt-1">Complete match analyses to build your profile</p>
                            </div>
                        )}
                    </div>

                    {/* Player Info Card */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <h3 className="text-sm font-semibold text-white mb-4">Player Info</h3>
                        <div className="space-y-2.5">
                            {[
                                { label: "Position", value: user?.playerProfile?.position },
                                { label: "Nationality", value: user?.playerProfile?.nationality },
                                { label: "Age", value: user?.playerProfile?.age },
                                { label: "Height", value: user?.playerProfile?.height ? `${user.playerProfile.height} cm` : undefined },
                                { label: "Weight", value: user?.playerProfile?.weight ? `${user.playerProfile.weight} kg` : undefined },
                                { label: "Foot", value: user?.playerProfile?.foot, capitalize: true },
                                { label: "Club", value: user?.playerProfile?.currentClub || "Free Agent" },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between">
                                    <span className="text-xs text-white/40">{item.label}</span>
                                    <span className={`text-xs font-medium text-white/70 ${"capitalize" in item && item.capitalize ? "capitalize" : ""}`}>
                                        {item.value ?? "—"}
                                    </span>
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
                                className="text-[10px] text-[#00FF87] hover:text-[#00FF87]/80 cursor-pointer transition-colors"
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

            {/* Modals */}
            {showUpload && <UploadMatchModal onClose={() => setShowUpload(false)} />}
        </div>
    );
}

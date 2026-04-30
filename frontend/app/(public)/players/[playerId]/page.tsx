"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { ShieldCheck, ShieldAlert, Play, User, Eye, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";
import { MatchHighlightsViewer } from "@/components/scout/MatchHighlightsViewer";

export default function PlayerPublicProfile() {
    const params = useParams();
    const playerId = params.playerId as Id<"users">;

    const user    = useQuery(api.users.getUserById, { userId: playerId });
    const profile = useQuery(api.engineJobs.getLatestCompletedJobByPlayerId, { playerId });
    const matches = useQuery(api.matches.getCompletedMatchesByPlayer, { playerId });

    const [viewingMatch, setViewingMatch] = useState<Doc<"matches"> | null>(null);

    if (user === undefined || profile === undefined || matches === undefined) {
        return (
            <div className="min-h-screen bg-dns-bg flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-dns-bg flex items-center justify-center">
                <p className="text-white/40 text-sm">Player not found.</p>
            </div>
        );
    }

    const age        = user.playerProfile?.age;
    const height     = user.playerProfile?.height;
    const weight     = user.playerProfile?.weight;
    const foot       = user.playerProfile?.foot;
    const position   = profile?.unit || user.playerProfile?.position;
    const nationality = user.playerProfile?.nationality;
    const club       = user.playerProfile?.currentClub;
    const photoUrl   = user.profilePhoto;
    const initials   = (user.name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    return (
        <div className="min-h-screen bg-dns-bg text-white">

            {/* ─── HERO ──────────────────────────────────────────────────────── */}
            <div className="border-b border-white/5">
                <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
                    <div className="flex items-start gap-8">

                        {/* Avatar */}
                        <div className="shrink-0">
                            {photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={photoUrl}
                                    alt={user.name || "Player"}
                                    className="w-24 h-24 rounded-2xl object-cover border border-white/10 bg-white/5"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <span className="text-2xl font-black text-white/30">
                                        {initials || <User className="w-8 h-8" />}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Name + meta */}
                        <div className="flex-1 min-w-0 pt-1">
                            {/* Badges row */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                {position && (
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-dns-green bg-dns-green/10 border border-dns-green/20 px-3 py-1 rounded-full">
                                        {position}
                                    </span>
                                )}
                                {profile && profile.matchCount >= 3 ? (
                                    <span className="text-[11px] font-semibold text-blue-400 flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5" /> {profile.matchCount} verified matches
                                    </span>
                                ) : profile ? (
                                    <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                                        <ShieldAlert className="w-3.5 h-3.5" /> {profile.matchCount} match{profile.matchCount !== 1 ? "es" : ""}
                                    </span>
                                ) : null}
                            </div>

                            <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white truncate">
                                {user.name || "Unknown Player"}
                            </h1>

                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-sm text-white/40">
                                {club       && <span className="text-white/70 font-semibold">{club}</span>}
                                {nationality && <span>{nationality}</span>}
                                {age        && <span>{age} years old</span>}
                                {height     && <span>{height} cm</span>}
                                {weight     && <span>{weight} kg</span>}
                                {foot       && <span className="capitalize">{foot} foot</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── BODY ──────────────────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* ── Left: Report CTA + Match History ─────────────────────── */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* View Full Report CTA */}
                        {profile && (
                            <Link
                                href={`/players/${playerId}/report`}
                                className="group block w-full p-5 rounded-2xl bg-gradient-to-br from-dns-green/10 via-blue-500/5 to-transparent border border-dns-green/20 hover:border-dns-green/40 transition-all duration-300"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-dns-green/15 flex items-center justify-center group-hover:bg-dns-green/25 transition-colors">
                                            <FileText className="w-5 h-5 text-dns-green" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white group-hover:text-dns-green transition-colors">
                                                View Full Report
                                            </p>
                                            <p className="text-xs text-white/35 mt-0.5">
                                                Engine analysis across {profile.matchCount} {profile.matchCount === 1 ? "match" : "matches"} · {profile.topArchetype} profile
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-dns-green group-hover:translate-x-1 transition-all" />
                                </div>
                            </Link>
                        )}

                        {/* Match History */}
                        <section>
                            <div className="flex items-center justify-between mb-5">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-white/25">Match History</p>
                                <span className="text-xs text-white/25">{matches.length} {matches.length === 1 ? "match" : "matches"}</span>
                            </div>

                            {matches.length > 0 ? (
                                <div className="rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                                    {matches.map((match: Doc<"matches">) => (
                                        <div
                                            key={match._id}
                                            className="flex items-center justify-between py-4 px-4 hover:bg-white/[0.02] transition-colors"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                                    <Play className="w-3.5 h-3.5 text-white/30" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">
                                                        {match.opponentName ? `vs ${match.opponentName}` : "Match"}
                                                    </p>
                                                    <p className="text-xs text-white/35 mt-0.5">
                                                        {match.matchDate
                                                            ? new Date(match.matchDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                                                            : "Date unknown"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="hidden sm:block text-[11px] font-semibold text-dns-green bg-dns-green/10 border border-dns-green/20 px-2.5 py-1 rounded-md">
                                                    Analysis Complete
                                                </span>
                                                <button
                                                    onClick={() => setViewingMatch(match)}
                                                    className="text-xs font-semibold text-dns-green hover:text-dns-green/80 flex items-center gap-1.5 transition-colors bg-dns-green/10 border border-dns-green/20 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-dns-green/15"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    Highlights
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-white/5 p-8 text-center">
                                    <p className="text-sm text-white/25">No completed matches recorded for this player.</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* ── Right Sidebar: Player Info ───────────────────────────── */}
                    <div>
                        <section>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-white/25 mb-5">Player Info</p>
                            <div className="rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                                {[
                                    { label: "Position",    value: position },
                                    { label: "Nationality", value: nationality },
                                    { label: "Age",         value: age ? `${age} years` : undefined },
                                    { label: "Height",      value: height ? `${height} cm` : undefined },
                                    { label: "Weight",      value: weight ? `${weight} kg` : undefined },
                                    { label: "Foot",        value: foot },
                                    { label: "Club",        value: club || "No Club" },
                                ].filter(r => r.value).map(row => (
                                    <div key={row.label} className="flex items-center justify-between px-4 py-3">
                                        <span className="text-xs text-white/35">{row.label}</span>
                                        <span className="text-sm font-semibold text-white capitalize">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                </div>
            </div>

            {/* ─── Highlight Viewer Modal ─────────────────────────────────── */}
            {viewingMatch && (
                <MatchHighlightsViewer
                    matchId={viewingMatch._id as Id<"matches">}
                    playerId={playerId}
                    youtubeVideoId={viewingMatch.youtubeVideoId}
                    opponentName={viewingMatch.opponentName}
                    matchDate={viewingMatch.matchDate}
                    onClose={() => setViewingMatch(null)}
                />
            )}
        </div>
    );
}

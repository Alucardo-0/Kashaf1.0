"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { ArcDiagram } from "@/components/public/ArcDiagram";
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import { ShieldCheck, ShieldAlert, ExternalLink, Play, User } from "lucide-react";

export default function PlayerPublicProfile() {
    const params = useParams();
    const playerId = params.playerId as Id<"users">;

    const user    = useQuery(api.users.getUserById, { userId: playerId });
    const profile = useQuery(api.engineProfiles.getProfileByPlayerId, { playerId });
    const matches = useQuery(api.matches.getCompletedMatchesByPlayer, { playerId });

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

    const fmt = (str: string) =>
        str.replace(/_/g, " ").replace("p90", "per 90").replace("pct", "%").replace("iqr", "variance");

    const radarData = profile
        ? Object.entries(profile.coreFeatures || {}).map(([k, v]) => ({
              subject: fmt(k).substring(0, 14),
              fullMark: 100,
              val: v,
              originalName: fmt(k),
          }))
        : [];

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
                <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
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
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">

                {/* Two column layout: main content left, sidebar right */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* ── Left: Engine Stats ────────────────────────────────── */}
                    <div className="lg:col-span-2 space-y-12">

                        {profile ? (
                            <>
                                {/* Archetype + Radar side by side */}
                                <section>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-white/25 mb-6">Engine Profile</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">

                                        {/* Archetype */}
                                        <div>
                                            <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-2">Top Archetype</p>
                                            <h3 className="text-2xl font-black text-white mb-0.5">{profile.topArchetype}</h3>
                                            <p className="text-xs text-white/35 mb-5">{profile.topPct}% confidence</p>
                                            <div className="h-[160px]">
                                                <ArcDiagram archetypes={profile.archetypes} />
                                            </div>
                                        </div>

                                        {/* Radar */}
                                        <div>
                                            <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-2">Core DNA</p>
                                            <div className="h-[220px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                                        <PolarGrid stroke="rgba(255,255,255,0.06)" />
                                                        <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.30)", fontSize: 10 }} />
                                                        <PolarRadiusAxis angle={30} domain={[0, "auto"]} tick={false} axisLine={false} />
                                                        <Radar name="Value" dataKey="val" stroke="#00FF87" strokeWidth={2} fill="#00FF87" fillOpacity={0.12} />
                                                        <Tooltip
                                                            contentStyle={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }}
                                                            labelFormatter={(_, p) => p?.[0]?.payload?.originalName || ""}
                                                            itemStyle={{ color: "#fff", fontWeight: 700 }}
                                                        />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Contextual Metrics */}
                                {Object.keys(profile.contextFeatures || {}).length > 0 && (
                                    <section>
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-white/25 mb-5">Contextual Metrics</p>
                                        <div className="grid grid-cols-3 gap-px bg-white/5 border border-white/5 rounded-xl overflow-hidden">
                                            {Object.entries(profile.contextFeatures || {}).map(([key, value]) => (
                                                <div key={key} className="bg-dns-bg px-5 py-4 hover:bg-white/3 transition-colors">
                                                    <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-2 truncate" title={fmt(key)}>
                                                        {fmt(key)}
                                                    </p>
                                                    <p className="text-2xl font-black text-white leading-none">
                                                        {String(value)}
                                                        {key.includes("pct") && <span className="text-sm text-dns-green ml-0.5">%</span>}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </>
                        ) : (
                            <section>
                                <p className="text-sm text-white/30">No engine profile generated yet. Analysis is pending.</p>
                            </section>
                        )}

                        {/* Match History */}
                        <section>
                            <div className="flex items-center justify-between mb-5">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-white/25">Match History</p>
                                <span className="text-xs text-white/25">{matches.length} {matches.length === 1 ? "match" : "matches"}</span>
                            </div>

                            {matches.length > 0 ? (
                                <div>
                                    {matches.map((match: Doc<"matches">, i: number) => (
                                        <div
                                            key={match._id}
                                            className={`flex items-center justify-between py-4 ${i < matches.length - 1 ? "border-b border-white/5" : ""} hover:bg-white/2 -mx-2 px-2 rounded-lg transition-colors`}
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

                                            <div className="flex items-center gap-4 shrink-0">
                                                <span className="hidden sm:block text-[11px] font-semibold text-dns-green bg-dns-green/10 border border-dns-green/20 px-2.5 py-1 rounded-md">
                                                    Analysis Complete
                                                </span>
                                                <a
                                                    href={match.youtubeUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-semibold text-white/40 hover:text-white flex items-center gap-1.5 transition-colors"
                                                >
                                                    Watch <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-white/25 py-2">No completed matches recorded for this player.</p>
                            )}
                        </section>
                    </div>

                    {/* ── Right Sidebar ─────────────────────────────────────── */}
                    <div className="space-y-10">

                        {/* Player Info card */}
                        <section>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-white/25 mb-5">Player Info</p>
                            <div className="space-y-3">
                                {[
                                    { label: "Position",    value: position },
                                    { label: "Nationality", value: nationality },
                                    { label: "Age",         value: age ? `${age} years` : undefined },
                                    { label: "Height",      value: height ? `${height} cm` : undefined },
                                    { label: "Weight",      value: weight ? `${weight} kg` : undefined },
                                    { label: "Foot",        value: foot },
                                    { label: "Club",        value: club || "No Club" },
                                ].filter(r => r.value).map(row => (
                                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/5">
                                        <span className="text-xs text-white/35">{row.label}</span>
                                        <span className="text-sm font-semibold text-white capitalize">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Statistical Twins */}
                        {profile?.twins && profile.twins.length > 0 && (
                            <section>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-white/25 mb-5">Statistical Twins</p>
                                <div className="space-y-4">
                                    {profile.twins.map((twin: { player_name: string; similarity: number }, i: number) => {
                                        const m = twin.player_name.match(/(.+) \[(\d{4})\/(\d{4})\]/);
                                        const name = m ? `${m[1]} (${m[2]}/${m[3].slice(2)})` : twin.player_name;
                                        return (
                                            <div key={i}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-sm text-white/70 truncate flex-1 pr-2">{name}</span>
                                                    <span className="text-sm font-bold text-amber-400 shrink-0">{Math.round(twin.similarity)}%</span>
                                                </div>
                                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${twin.similarity}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

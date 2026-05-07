"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/* ── Helpers ──────────────────────────────────────────────────────────── */
function fmt(val: number | null | undefined, decimals = 2): string {
    if (val === null || val === undefined) return "–";
    return val.toFixed(decimals);
}

function pct(val: number | null | undefined): string {
    if (val === null || val === undefined) return "–";
    return `${val.toFixed(2)}%`;
}

const ARCHETYPE_COLORS: Record<string, string> = {
    "Ball-Playing CB": "#3B82F6",
    "Stopper": "#EF4444",
    "Aerial Specialist": "#F59E0B",
    "Sweeper": "#8B5CF6",
    "Attacking FB": "#06B6D4",
    "Defensive FB": "#22C55E",
    "Overlapping FB": "#EC4899",
    "Box-to-Box": "#3B82F6",
    "Deep-Lying Playmaker": "#8B5CF6",
    "Pressing MF": "#F59E0B",
    "Advanced Playmaker": "#06B6D4",
    "Creative Winger": "#EC4899",
    "Inverted Winger": "#EF4444",
    "Traditional Winger": "#22C55E",
    "Target Man": "#EF4444",
    "Pressing Striker": "#F59E0B",
    "Link-Up Striker": "#06B6D4",
    "Anchor": "#22C55E",
    "Carrying Midfielder": "#3B82F6",
    "Deep Playmaker": "#8B5CF6",
};

function archetypeColor(name: string): string {
    return ARCHETYPE_COLORS[name] ?? "#00FF87";
}

/* ── Sub-components ───────────────────────────────────────────────────── */
function ArchetypeBar({ name, pct: value, max }: { name: string; pct: number; max: number }) {
    const color = archetypeColor(name);
    const width = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
                <span className="text-white/80 font-medium">{name}</span>
                <span className="font-bold tabular-nums" style={{ color }}>{value.toFixed(2)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${width}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
                />
            </div>
        </div>
    );
}

function StatRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
            <span className="text-sm text-white/50 capitalize">{label.replace(/_/g, " ")}</span>
            <span className="text-sm font-semibold text-white tabular-nums">{value}</span>
        </div>
    );
}

function TwinCard({ twin }: { twin: { player_name: string; similarity: number; context?: Record<string, number> } }) {
    const simPct = twin.similarity.toFixed(2);
    return (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#00FF87]/20 transition-all">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#00FF87]/15 flex items-center justify-center text-[#00FF87] text-sm font-bold">
                        {twin.player_name.charAt(0)}
                    </div>
                    <span className="text-sm font-semibold text-white">{twin.player_name}</span>
                </div>
                <span className="text-xs font-bold text-[#00FF87] bg-[#00FF87]/10 px-2 py-0.5 rounded-full">
                    {simPct}% match
                </span>
            </div>
            {twin.context && Object.keys(twin.context).length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 pt-2 border-t border-white/[0.04]">
                    {Object.entries(twin.context).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-[10px]">
                            <span className="text-white/30 capitalize truncate mr-1">{k.replace(/_/g, " ")}</span>
                            <span className="text-white/60 font-medium tabular-nums shrink-0">
                                {typeof v === "number" ? (k.includes("pct") ? `${v.toFixed(2)}%` : fmt(v, 2)) : String(v)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   PLAYER REPORT PAGE
   ══════════════════════════════════════════════════════════════════════════ */
export default function PlayerReportPage() {
    const params = useParams();
    const playerId = params.playerId as Id<"users">;

    const player = useQuery(api.users.getUserById, { userId: playerId });
    const profile = useQuery(api.engineJobs.getLatestCompletedJobByPlayerId, { playerId });

    /* Loading */
    if (player === undefined || profile === undefined) {
        return (
            <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-[#00FF87]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    if (!player) {
        return (
            <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
                <p className="text-white/40">Player not found.</p>
            </div>
        );
    }

    const archetypes: Record<string, number> = profile?.archetypes ?? {};
    const maxPct = Math.max(...Object.values(archetypes), 0);
    const coreFeatures: Record<string, number> = profile?.coreFeatures ?? {};
    const contextFeatures: Record<string, number> = profile?.contextFeatures ?? {};
    const twins: { player_name: string; similarity: number; context?: Record<string, number> }[] = profile?.twins ?? [];
    const topArchetype: string = profile?.topArchetype ?? "";
    const topPct: number = profile?.topPct ?? 0;
    const dataWarning: string | null = profile?.dataWarning ?? null;
    const archetypesNote: string | null = profile?.archetypesNote ?? null;
    const unit: string = profile?.unit ?? player.playerProfile?.position ?? "";
    const matchCount: number = profile?.matchCount ?? 0;

    return (
        <div className="min-h-screen bg-[#0A0A0F] text-white">
            {/* ── Hero Bar ──────────────────────────────────────────────────── */}
            <div className="border-b border-white/[0.06] bg-[#0d0d14]">
                <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
                    <div>
                        <Link
                            href={`/players/${playerId}`}
                            className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5 mb-2"
                        >
                            <ArrowLeft className="w-3 h-3" />
                            Back to Profile
                        </Link>
                        <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Player Report</p>
                        <h1 className="text-2xl font-bold text-white">
                            {player.name ?? "Player"}
                        </h1>
                        {matchCount > 0 && (
                            <p className="text-xs text-white/40 mt-1">
                                Based on {matchCount} analyzed {matchCount === 1 ? "match" : "matches"}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {unit && (
                            <span className="text-xs px-3 py-1.5 rounded-full font-medium border bg-[#00FF87]/10 text-[#00FF87] border-[#00FF87]/20 uppercase tracking-wider">
                                {unit}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

                {/* ── Data warning ──────────────────────────────────────────── */}
                {dataWarning && (
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm flex gap-3">
                        <span className="text-lg shrink-0">⚠</span>
                        <p>{dataWarning}</p>
                    </div>
                )}

                {/* ── No report fallback ───────────────────────────────────── */}
                {!profile && (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4 opacity-30">📋</div>
                        <p className="text-white/30 text-sm">No engine report available yet for this player.</p>
                        <p className="text-white/20 text-xs mt-2">Once matches are analyzed by the engine, the full report will appear here.</p>
                    </div>
                )}

                {/* ── ENGINE REPORT ─────────────────────────────────────────── */}
                {profile && (
                    <>
                        {/* Top Archetype Hero */}
                        <div className="p-6 rounded-2xl border relative overflow-hidden"
                            style={{
                                background: `linear-gradient(135deg, ${archetypeColor(topArchetype)}15 0%, transparent 60%)`,
                                borderColor: `${archetypeColor(topArchetype)}30`,
                            }}
                        >
                            <div className="relative z-10">
                                <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Primary Profile</p>
                                <div className="flex items-end gap-4">
                                    <div>
                                        <h2 className="text-4xl font-black tracking-tight" style={{ color: archetypeColor(topArchetype) }}>
                                            {topArchetype}
                                        </h2>
                                        <p className="text-white/50 mt-1 text-sm">
                                            {unit.toUpperCase()} · {topPct.toFixed(2)}% profile match
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-10 blur-2xl"
                                style={{ backgroundColor: archetypeColor(topArchetype) }} />
                        </div>

                        {/* Archetypes + Core Features row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Archetypes */}
                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">Position Profile</h3>
                                    {archetypesNote && (
                                        <span className="text-[10px] text-white/30 max-w-[180px] text-right">{archetypesNote}</span>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    {Object.entries(archetypes)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([name, value]) => (
                                            <ArchetypeBar key={name} name={name} pct={value} max={maxPct} />
                                        ))}
                                </div>
                            </div>

                            {/* Core Features */}
                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4">Core Metrics</h3>
                                <div className="divide-y divide-white/[0.04]">
                                    {Object.entries(coreFeatures).slice(0, 12).map(([key, val]) => (
                                        <StatRow
                                            key={key}
                                            label={key}
                                            value={typeof val === "number" ? fmt(val, 2) : String(val)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Context Features */}
                        {Object.keys(contextFeatures).length > 0 && (
                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4">Performance Context</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {Object.entries(contextFeatures).map(([key, val]) => (
                                        <div key={key} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                            <p className="text-[10px] text-white/30 uppercase tracking-wide mb-1">{key.replace(/_/g, " ")}</p>
                                            <p className="text-xl font-bold text-white tabular-nums">
                                                {typeof val === "number" ? (key.includes("pct") ? pct(val) : fmt(val, 2)) : String(val)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Twins */}
                        {twins.length > 0 && (
                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4">
                                    Similar Players <span className="text-white/20 font-normal normal-case tracking-normal">(StatsBomb reference)</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {twins.map((twin, i) => (
                                        <TwinCard key={i} twin={twin} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";

/* ── Helpers ──────────────────────────────────────────────────────────── */
function fmt(val: number | null | undefined, decimals = 1): string {
    if (val === null || val === undefined) return "–";
    return val.toFixed(decimals);
}

function pct(val: number | null | undefined): string {
    if (val === null || val === undefined) return "–";
    return `${val.toFixed(1)}%`;
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
                <span className="font-bold tabular-nums" style={{ color }}>{value.toFixed(1)}%</span>
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
    // Engine already returns similarity in 0-100 range
    const simPct = twin.similarity.toFixed(1);
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
                                {typeof v === "number" ? (k.includes("pct") ? `${v.toFixed(1)}%` : fmt(v, 2)) : String(v)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   MATCH REPORT PAGE
   ══════════════════════════════════════════════════════════════════════════ */
export default function MatchReportPage() {
    const params = useParams();
    const matchId = params.matchId as Id<"matches">;
    const playerId = params.playerId as Id<"users">;

    const match = useQuery(api.matches.getMatchById, { matchId });
    const player = useQuery(api.users.getUserById, { userId: playerId });
    const summary = useQuery(api.matchSummaries.getSummaryByMatch, { matchId });
    const engineJob = useQuery(api.engineJobs.getJobByMatchId, { matchId });

    /* Loading */
    if (match === undefined || player === undefined) {
        return (
            <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-[#00FF87]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    if (!match) {
        return (
            <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
                <p className="text-white/40">Match not found.</p>
            </div>
        );
    }

    /* Engine report data — nested inside job.report.report */
    const jobReport: any = engineJob?.report;
    const engineReport: any = jobReport?.report ?? jobReport ?? null;
    const jobStatus = engineJob?.status ?? null;

    const archetypes: Record<string, number> = engineReport?.archetypes ?? {};
    const maxPct = Math.max(...Object.values(archetypes), 0);
    const coreFeatures: Record<string, number> = engineReport?.core_features ?? {};
    const contextFeatures: Record<string, number> = engineReport?.context_features ?? {};
    const twins: any[] = engineReport?.twins ?? [];
    const topArchetype: string = engineReport?.top_archetype ?? "";
    const topPct: number = engineReport?.top_pct ?? 0;
    const dataWarning: string | null = engineReport?.data_warning ?? null;
    const archetypesNote: string | null = engineReport?.archetypes_note ?? null;

    return (
        <div className="min-h-screen bg-[#0A0A0F] text-white">
            {/* ── Hero Bar ──────────────────────────────────────────────────── */}
            <div className="border-b border-white/[0.06] bg-[#0d0d14]">
                <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Match Report</p>
                        <h1 className="text-2xl font-bold text-white">
                            {player?.name ?? "Player"}
                            {match.opponentName && (
                                <span className="text-white/40 font-normal ml-2">vs {match.opponentName}</span>
                            )}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {jobStatus && (
                            <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
                                jobStatus === "completed"
                                    ? "bg-[#00FF87]/10 text-[#00FF87] border-[#00FF87]/20"
                                    : jobStatus === "failed"
                                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            }`}>
                                Engine: {jobStatus}
                            </span>
                        )}
                        {match.status === "completed" && (
                            <span className="text-xs px-3 py-1.5 rounded-full font-medium border bg-[#00FF87]/10 text-[#00FF87] border-[#00FF87]/20">
                                ✅ Completed
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

                {/* ── Engine processing state ───────────────────────────────── */}
                {!engineReport && jobStatus === "running" && (
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-4">
                        <svg className="animate-spin h-5 w-5 text-[#00FF87] shrink-0" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-white">Engine is processing…</p>
                            <p className="text-xs text-white/40 mt-0.5">The Kashaf AI engine is analyzing the player data. This page will update automatically.</p>
                        </div>
                    </div>
                )}

                {!engineReport && jobStatus === "queued" && (
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-4">
                        <span className="text-2xl shrink-0">⏳</span>
                        <div>
                            <p className="text-sm font-medium text-white">Job queued</p>
                            <p className="text-xs text-white/40 mt-0.5">The analysis is in the queue and will begin shortly.</p>
                        </div>
                    </div>
                )}

                {!engineReport && jobStatus === "failed" && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <p className="font-semibold mb-1">Engine analysis failed</p>
                        <p className="text-red-400/70 text-xs">{engineJob?.error?.message ?? "Unknown error"}</p>
                    </div>
                )}

                {!engineReport && !jobStatus && summary && (
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                        <p className="text-sm text-white/40">The AI engine report is not yet available for this match.</p>
                    </div>
                )}

                {/* ── ENGINE REPORT ─────────────────────────────────────────── */}
                {engineReport && (
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
                                            {engineReport.unit?.toUpperCase()} · {topPct.toFixed(1)}% profile match
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
                                            value={typeof val === "number" ? fmt(val, 3) : String(val)}
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

                {/* ── ANALYST SUMMARY ───────────────────────────────────────── */}
                {summary && (
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">Analyst Assessment</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-3xl font-black text-[#00FF87]">{summary.overallRating}</span>
                                <span className="text-white/30 text-sm">/10</span>
                            </div>
                        </div>

                        {/* Rating bar */}
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[#00FF87] to-[#3B82F6]"
                                style={{ width: `${(summary.overallRating / 10) * 100}%` }}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-[#00FF87]/5 border border-[#00FF87]/10">
                                <p className="text-xs font-semibold text-[#00FF87]/70 uppercase tracking-wider mb-2">Strengths</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {summary.strengths.map((s) => (
                                        <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/15">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                                <p className="text-xs font-semibold text-red-400/70 uppercase tracking-wider mb-2">Areas to Improve</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {summary.weaknesses.map((w) => (
                                        <span key={w} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/15">
                                            {w}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                            <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Written Analysis</p>
                            <p className="text-sm text-white/70 leading-relaxed">{summary.writtenSummary}</p>
                        </div>
                    </div>
                )}

                {/* ── No data fallback ───────────────────────────────────────── */}
                {!summary && !engineReport && !jobStatus && (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4 opacity-30">📋</div>
                        <p className="text-white/30 text-sm">No report available yet for this match.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

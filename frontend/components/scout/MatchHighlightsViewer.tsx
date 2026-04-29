"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { X, Play, Filter } from "lucide-react";

/* ── Highlight category definitions ───────────────────────────────────── */
const HIGHLIGHT_CATEGORIES = [
    {
        id: "goal",
        label: "Goals",
        icon: "⚽",
        color: "#00FF87",
        match: (e: { eventType: string; outcome: string }) =>
            e.eventType === "shot" && e.outcome === "Goal",
    },
    {
        id: "assist",
        label: "Assists",
        icon: "🅰️",
        color: "#3B82F6",
        match: (e: { eventType: string; outcome: string }) =>
            e.eventType === "pass" && e.outcome === "Assist",
    },
    {
        id: "shot",
        label: "Shots",
        icon: "🎯",
        color: "#EF4444",
        match: (e: { eventType: string; outcome: string }) =>
            e.eventType === "shot",
    },
    {
        id: "interception",
        label: "Interceptions",
        icon: "🛡️",
        color: "#22C55E",
        match: (e: { eventType: string; outcome: string }) =>
            e.eventType === "interception",
    },
    {
        id: "keyPass",
        label: "Key Passes",
        icon: "🔑",
        color: "#F59E0B",
        match: (e: { eventType: string; outcome: string }) =>
            e.eventType === "pass" && e.outcome === "Key Pass",
    },
] as const;

type CategoryId = (typeof HIGHLIGHT_CATEGORIES)[number]["id"];

function formatTimestamp(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ══════════════════════════════════════════════════════════════════════════
   MATCH HIGHLIGHTS VIEWER
   ══════════════════════════════════════════════════════════════════════════ */
interface MatchHighlightsViewerProps {
    matchId: Id<"matches">;
    playerId: Id<"users">;
    youtubeVideoId: string;
    opponentName?: string;
    matchDate?: number;
    onClose: () => void;
}

export function MatchHighlightsViewer({
    matchId,
    playerId,
    youtubeVideoId,
    opponentName,
    matchDate,
    onClose,
}: MatchHighlightsViewerProps) {
    const events = useQuery(api.analysisEvents.getEventsByMatch, { matchId });

    const playerRef = useRef<any>(null);
    const ytContainerRef = useRef<HTMLDivElement>(null);
    const [playerReady, setPlayerReady] = useState(false);
    const [activeCategories, setActiveCategories] = useState<Set<CategoryId>>(
        new Set(HIGHLIGHT_CATEGORIES.map((c) => c.id))
    );

    /* ── YouTube IFrame API ────────────────────────────────────────────── */
    useEffect(() => {
        let cancelled = false;

        const initPlayer = () => {
            if (cancelled || !ytContainerRef.current) return;
            const target = document.createElement("div");
            ytContainerRef.current.innerHTML = "";
            ytContainerRef.current.appendChild(target);

            playerRef.current = new (window as any).YT.Player(target, {
                videoId: youtubeVideoId,
                width: "100%",
                height: "100%",
                playerVars: { rel: 0, modestbranding: 1 },
                events: {
                    onReady: () => {
                        if (!cancelled) setPlayerReady(true);
                    },
                },
            });
        };

        if ((window as any).YT?.Player) {
            initPlayer();
        } else {
            if (!document.getElementById("yt-api-script")) {
                const tag = document.createElement("script");
                tag.id = "yt-api-script";
                tag.src = "https://www.youtube.com/iframe_api";
                document.head.appendChild(tag);
            }
            (window as any).onYouTubeIframeAPIReady = initPlayer;
        }

        return () => {
            cancelled = true;
            setPlayerReady(false);
            if (playerRef.current?.destroy) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [youtubeVideoId]);

    /* ── Filter events for this player only ────────────────────────────── */
    const playerEvents = (events ?? []).filter((e) => e.playerId === playerId);

    /* ── Group events into highlight categories ────────────────────────── */
    const highlights = HIGHLIGHT_CATEGORIES.map((cat) => ({
        ...cat,
        events: playerEvents
            .filter((e) => cat.match(e))
            .sort((a, b) => a.videoTimestamp - b.videoTimestamp),
    }));

    /* ── Build flat sorted list of visible highlights ──────────────────── */
    const visibleHighlights = highlights
        .filter((h) => activeCategories.has(h.id))
        .flatMap((h) =>
            h.events.map((e) => ({
                ...e,
                categoryId: h.id,
                categoryLabel: h.label,
                categoryIcon: h.icon,
                categoryColor: h.color,
            }))
        )
        .sort((a, b) => a.videoTimestamp - b.videoTimestamp);

    const toggleCategory = (id: CategoryId) => {
        setActiveCategories((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const seekTo = (seconds: number) => {
        if (playerRef.current?.seekTo) {
            playerRef.current.seekTo(seconds, true);
            playerRef.current.playVideo?.();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-6xl mx-4 max-h-[92vh] bg-[#0d0d14] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
                    <div>
                        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
                            Match Highlights
                        </p>
                        <h2 className="text-lg font-bold text-white">
                            {opponentName ? `vs ${opponentName}` : "Match Footage"}
                            {matchDate && (
                                <span className="text-white/30 font-normal text-sm ml-3">
                                    {new Date(matchDate).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </span>
                            )}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/40 hover:text-white transition-colors cursor-pointer p-2 rounded-xl hover:bg-white/5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Video Area */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex-1 p-4 flex items-center justify-center bg-black/30">
                            <div className="w-full max-w-4xl aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                                <div
                                    ref={ytContainerRef}
                                    className="w-full h-full"
                                />
                            </div>
                        </div>

                        {/* Full Match Button */}
                        <div className="px-4 pb-4 flex items-center gap-3">
                            <button
                                onClick={() => seekTo(0)}
                                disabled={!playerReady}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer disabled:opacity-40"
                            >
                                <Play className="w-3.5 h-3.5" />
                                Watch Full Match
                            </button>
                            <div className="flex-1" />
                            <span className="text-[10px] text-white/25 uppercase tracking-widest">
                                {visibleHighlights.length} highlight
                                {visibleHighlights.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                    </div>

                    {/* Highlights Sidebar */}
                    <div className="w-[340px] shrink-0 border-l border-white/[0.06] flex flex-col bg-[#0a0a10]">
                        {/* Category Filters */}
                        <div className="p-4 border-b border-white/[0.06]">
                            <div className="flex items-center gap-2 mb-3">
                                <Filter className="w-3.5 h-3.5 text-white/30" />
                                <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
                                    Filter Highlights
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {highlights.map((cat) => {
                                    const isActive = activeCategories.has(cat.id);
                                    const count = cat.events.length;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => toggleCategory(cat.id)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                                                isActive
                                                    ? "border-white/15 shadow-sm"
                                                    : "border-transparent opacity-40 hover:opacity-70"
                                            }`}
                                            style={{
                                                backgroundColor: isActive
                                                    ? `${cat.color}15`
                                                    : "",
                                                color: isActive
                                                    ? cat.color
                                                    : "rgba(255,255,255,0.4)",
                                            }}
                                        >
                                            <span>{cat.icon}</span>
                                            {cat.label}
                                            <span
                                                className="ml-1 text-[9px] rounded-full px-1.5 py-0.5 font-bold"
                                                style={{
                                                    backgroundColor: isActive
                                                        ? `${cat.color}20`
                                                        : "rgba(255,255,255,0.05)",
                                                }}
                                            >
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Highlight Timeline */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {events === undefined ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="w-6 h-6 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
                                </div>
                            ) : visibleHighlights.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                                    <p className="text-white/20 text-sm mb-1">
                                        No highlights found
                                    </p>
                                    <p className="text-white/10 text-xs">
                                        {playerEvents.length === 0
                                            ? "No events have been tagged for this match yet."
                                            : "Try enabling more highlight categories."}
                                    </p>
                                </div>
                            ) : (
                                <div className="p-2">
                                    {visibleHighlights.map((h, i) => (
                                        <button
                                            key={`${h._id}-${i}`}
                                            onClick={() => seekTo(h.videoTimestamp)}
                                            disabled={!playerReady}
                                            className="w-full flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer text-left group disabled:opacity-40"
                                        >
                                            {/* Timestamp pill */}
                                            <div
                                                className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums mt-0.5"
                                                style={{
                                                    backgroundColor: `${h.categoryColor}15`,
                                                    color: h.categoryColor,
                                                }}
                                            >
                                                {formatTimestamp(h.videoTimestamp)}
                                            </div>

                                            {/* Event info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-sm">
                                                        {h.categoryIcon}
                                                    </span>
                                                    <span className="text-xs font-semibold text-white/80 capitalize">
                                                        {h.eventType}
                                                    </span>
                                                    <span
                                                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                                        style={{
                                                            backgroundColor: `${h.categoryColor}10`,
                                                            color: h.categoryColor,
                                                        }}
                                                    >
                                                        {h.outcome}
                                                    </span>
                                                </div>
                                                {h.notes && (
                                                    <p className="text-[11px] text-white/30 truncate">
                                                        {h.notes}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Play icon */}
                                            <Play className="w-3.5 h-3.5 text-white/10 group-hover:text-white/40 transition-colors mt-1 shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

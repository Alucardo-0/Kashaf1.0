"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function OverviewTab() {
    const stats = useQuery(api.users.getPlatformStats);
    if (!stats) return <div className="text-white/30 text-sm p-8">Loading...</div>;

    const cards = [
        { label: "Players", value: stats.totalPlayers, color: "#00FF87" },
        { label: "Analysts", value: stats.totalAnalysts, color: "#3B82F6" },
        { label: "Scouts", value: stats.totalScouts, color: "#8B5CF6" },
        { label: "Completed Analyses", value: stats.totalAnalyses, color: "#F59E0B" },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
                <div key={c.label} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">{c.label}</p>
                    <p className="text-3xl font-black" style={{ color: c.color }}>{c.value}</p>
                </div>
            ))}
        </div>
    );
}

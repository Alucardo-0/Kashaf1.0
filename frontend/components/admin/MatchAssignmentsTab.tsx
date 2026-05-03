"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

const STATUS_STYLES: Record<string, string> = {
    pending_analyst: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    analyst_assigned: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    analysis_in_progress: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    completed: "bg-[#00FF87]/10 text-[#00FF87] border-[#00FF87]/20",
};

const STATUS_LABELS: Record<string, string> = {
    pending_analyst: "Pending Analyst",
    analyst_assigned: "Assigned",
    analysis_in_progress: "In Progress",
    completed: "Completed",
};

export function MatchAssignmentsTab() {
    const matches = useQuery(api.matches.getAllMatchesWithDetails);
    const analysts = useQuery(api.users.listUsersByRole, { role: "analyst" });
    const reassignMatch = useMutation(api.matches.adminReassignMatch);

    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [reassigning, setReassigning] = useState<string | null>(null);
    const [selectedAnalyst, setSelectedAnalyst] = useState<Record<string, string>>({});
    const [msg, setMsg] = useState("");

    const handleReassign = async (matchId: Id<"matches">) => {
        const newAnalystId = selectedAnalyst[matchId];
        if (!newAnalystId) {
            setMsg("❌ Select an analyst first");
            return;
        }
        setReassigning(matchId);
        setMsg("");
        try {
            await reassignMatch({
                matchId,
                newAnalystId: newAnalystId as Id<"users">,
            });
            setMsg("✅ Match reassigned successfully");
            setSelectedAnalyst((prev) => {
                const next = { ...prev };
                delete next[matchId];
                return next;
            });
        } catch (err: any) {
            setMsg("❌ " + (err?.message || "Failed to reassign"));
        }
        setReassigning(null);
    };

    if (!matches || !analysts) {
        return <p className="text-white/30 text-sm p-4">Loading...</p>;
    }

    const filtered = statusFilter
        ? matches.filter((m) => m.status === statusFilter)
        : matches;

    // Group matches by analyst for summary
    const analystLoad = new Map<string, number>();
    for (const m of matches) {
        if (m.analystId && m.status !== "completed") {
            const key = m.analystId.toString();
            analystLoad.set(key, (analystLoad.get(key) ?? 0) + 1);
        }
    }

    return (
        <div>
            {msg && (
                <div
                    className={`p-3 rounded-xl text-sm mb-4 ${msg.startsWith("✅") ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}
                >
                    {msg}
                </div>
            )}

            {/* Analyst Load Summary */}
            <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">
                    Active Workload
                </p>
                <div className="flex flex-wrap gap-2">
                    {analysts.map((a) => {
                        const load = analystLoad.get(a._id.toString()) ?? 0;
                        return (
                            <div
                                key={a._id}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5"
                            >
                                <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center text-[10px] font-bold text-blue-400">
                                    {a.name?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                                <span className="text-xs text-white/60">{a.name || "Unnamed"}</span>
                                <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${load > 0 ? "bg-amber-500/15 text-amber-400" : "bg-white/5 text-white/25"}`}
                                >
                                    {load} active
                                </span>
                            </div>
                        );
                    })}
                    {analysts.length === 0 && (
                        <p className="text-xs text-white/25">No analysts registered.</p>
                    )}
                </div>
            </div>

            {/* Status filter */}
            <div className="flex gap-2 mb-6">
                {[undefined, "pending_analyst", "analyst_assigned", "analysis_in_progress", "completed"].map(
                    (s) => (
                        <button
                            key={s ?? "all"}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${statusFilter === s ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5"}`}
                        >
                            {s ? STATUS_LABELS[s] || s : "All"}
                        </button>
                    )
                )}
            </div>

            {/* Matches table */}
            <div className="border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-white/[0.03] text-white/40 text-xs uppercase tracking-widest">
                            <th className="text-left px-4 py-3">Player</th>
                            <th className="text-left px-4 py-3">Opponent</th>
                            <th className="text-left px-4 py-3">Date</th>
                            <th className="text-left px-4 py-3">Status</th>
                            <th className="text-left px-4 py-3">Assigned Analyst</th>
                            <th className="text-left px-4 py-3">Reassign</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((match) => (
                            <tr
                                key={match._id}
                                className="border-t border-white/5 hover:bg-white/[0.02]"
                            >
                                <td className="px-4 py-3">
                                    <p className="text-white font-medium text-sm">{match.playerName}</p>
                                    <p className="text-white/30 text-[10px]">{match.playerEmail}</p>
                                </td>
                                <td className="px-4 py-3 text-white/50 text-sm">
                                    {match.opponentName || "—"}
                                </td>
                                <td className="px-4 py-3 text-white/40 text-xs">
                                    {match.matchDate
                                        ? new Date(match.matchDate).toLocaleDateString(undefined, {
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                          })
                                        : "—"}
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border ${STATUS_STYLES[match.status] || "bg-white/5 text-white/40 border-white/10"}`}
                                    >
                                        {STATUS_LABELS[match.status] || match.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {match.analystName ? (
                                        <div>
                                            <p className="text-white/70 text-sm font-medium">
                                                {match.analystName}
                                            </p>
                                            <p className="text-white/25 text-[10px]">
                                                {match.analystEmail}
                                            </p>
                                        </div>
                                    ) : (
                                        <span className="text-white/20 text-xs italic">
                                            Unassigned
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={selectedAnalyst[match._id] || ""}
                                            onChange={(e) =>
                                                setSelectedAnalyst((prev) => ({
                                                    ...prev,
                                                    [match._id]: e.target.value,
                                                }))
                                            }
                                            className="w-36 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/50 appearance-none"
                                        >
                                            <option value="" className="bg-[#12121a]">
                                                Select...
                                            </option>
                                            {analysts
                                                .filter(
                                                    (a) =>
                                                        a._id.toString() !==
                                                        match.analystId?.toString()
                                                )
                                                .map((a) => (
                                                    <option
                                                        key={a._id}
                                                        value={a._id}
                                                        className="bg-[#12121a]"
                                                    >
                                                        {a.name || a.email}
                                                    </option>
                                                ))}
                                        </select>
                                        <button
                                            onClick={() =>
                                                handleReassign(match._id as Id<"matches">)
                                            }
                                            disabled={
                                                reassigning === match._id ||
                                                !selectedAnalyst[match._id]
                                            }
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#0A0A0F] bg-[#3B82F6] hover:bg-[#3B82F6]/90 cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                                        >
                                            {reassigning === match._id
                                                ? "..."
                                                : "Reassign"}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <p className="text-center text-white/20 py-8 text-sm">
                        No matches found.
                    </p>
                )}
            </div>

            <p className="text-white/20 text-xs mt-4">
                {filtered.length} {filtered.length === 1 ? "match" : "matches"} shown
                {statusFilter ? ` (filtered by ${STATUS_LABELS[statusFilter] || statusFilter})` : ""}
            </p>
        </div>
    );
}

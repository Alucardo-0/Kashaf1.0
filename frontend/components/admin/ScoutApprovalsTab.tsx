"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export function ScoutApprovalsTab() {
    const pendingScouts = useQuery(api.users.getPendingScouts);
    const approveScout = useMutation(api.users.verifyScout);
    const rejectScout = useMutation(api.users.rejectScout);
    const [acting, setActing] = useState<string | null>(null);

    const handleApprove = async (id: Id<"users">) => {
        setActing(id); try { await approveScout({ scoutId: id }); } catch {} setActing(null);
    };
    const handleReject = async (id: Id<"users">) => {
        if (!confirm("Reject this scout?")) return;
        setActing(id); try { await rejectScout({ scoutId: id }); } catch {} setActing(null);
    };

    if (!pendingScouts) return <p className="text-white/30 text-sm p-4">Loading...</p>;

    return (
        <div>
            <p className="text-white/40 text-sm mb-6">{pendingScouts.length} pending scout application{pendingScouts.length !== 1 ? "s" : ""}</p>
            {pendingScouts.length === 0 ? (
                <div className="text-center py-16 text-white/20 text-sm">No pending applications.</div>
            ) : (
                <div className="space-y-4">
                    {pendingScouts.map((scout) => (
                        <div key={scout._id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-5">
                            <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center text-[#8B5CF6] font-bold text-lg shrink-0">
                                {scout.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold">{scout.name || "Unnamed"}</p>
                                <p className="text-xs text-white/40 mt-0.5">{scout.email}</p>
                                {scout.scoutProfile && (
                                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-white/50">
                                        <span>Club: <span className="text-white/70 font-medium">{scout.scoutProfile.clubName}</span></span>
                                        <span>Country: <span className="text-white/70">{scout.scoutProfile.country}</span></span>
                                        <span>League: <span className="text-white/70">{scout.scoutProfile.leagueLevel}</span></span>
                                    </div>
                                )}
                                {scout.scoutProfile?.verificationDocId && (
                                    <DocLink storageId={scout.scoutProfile.verificationDocId as Id<"_storage">} />
                                )}
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => handleApprove(scout._id)} disabled={acting === scout._id}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#0A0A0F] bg-[#00FF87] hover:bg-[#00FF87]/90 cursor-pointer transition-all disabled:opacity-50">
                                    Approve
                                </button>
                                <button onClick={() => handleReject(scout._id)} disabled={acting === scout._id}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/20 cursor-pointer transition-all disabled:opacity-50">
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function DocLink({ storageId }: { storageId: Id<"_storage"> }) {
    const url = useQuery(api.users.getScoutVerificationUrl, { storageId });
    if (!url) return <span className="text-xs text-white/30 mt-1 block">Loading document...</span>;
    return (
        <a href={url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-[#8B5CF6] hover:text-[#8B5CF6]/80 transition-colors">
            📄 View Verification Document
        </a>
    );
}

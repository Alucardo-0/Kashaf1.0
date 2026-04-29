"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export function UsersTab() {
    const [roleFilter, setRoleFilter] = useState<"player" | "analyst" | "scout" | undefined>(undefined);
    const users = useQuery(api.users.listAllUsers, { role: roleFilter });
    const deleteUser = useMutation(api.users.deleteUser);
    const [deleting, setDeleting] = useState<string | null>(null);

    const handleDelete = async (userId: Id<"users">) => {
        if (!confirm("Delete this user permanently?")) return;
        setDeleting(userId);
        try { await deleteUser({ userId }); } catch {}
        setDeleting(null);
    };

    return (
        <div>
            <div className="flex gap-2 mb-6">
                {[undefined, "player", "analyst", "scout"].map((r) => (
                    <button key={r ?? "all"} onClick={() => setRoleFilter(r as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${roleFilter === r ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5"}`}>
                        {r ? r.charAt(0).toUpperCase() + r.slice(1) + "s" : "All"}
                    </button>
                ))}
            </div>
            {!users ? <p className="text-white/30 text-sm">Loading...</p> : (
                <div className="border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-white/[0.03] text-white/40 text-xs uppercase tracking-widest">
                            <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Email</th>
                            <th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Status</th>
                            <th className="text-right px-4 py-3">Actions</th>
                        </tr></thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u._id} className="border-t border-white/5 hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 text-white font-medium">{u.name || "—"}</td>
                                    <td className="px-4 py-3 text-white/50">{u.email}</td>
                                    <td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-1 rounded-md bg-white/5 text-white/60 capitalize">{u.role || "none"}</span></td>
                                    <td className="px-4 py-3 text-xs text-white/40">{u.onboardingComplete ? "Active" : "Incomplete"}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDelete(u._id)} disabled={deleting === u._id}
                                            className="text-xs text-red-400/60 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-30">
                                            {deleting === u._id ? "..." : "Delete"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && <p className="text-center text-white/20 py-8 text-sm">No users found.</p>}
                </div>
            )}
        </div>
    );
}

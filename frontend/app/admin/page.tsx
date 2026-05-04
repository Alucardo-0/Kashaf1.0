"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { AnalystsTab } from "@/components/admin/AnalystsTab";
import { ScoutApprovalsTab } from "@/components/admin/ScoutApprovalsTab";
import { MatchAssignmentsTab } from "@/components/admin/MatchAssignmentsTab";
import { EngineLogsTab } from "@/components/admin/EngineLogsTab";

const TABS = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "matches", label: "Matches", icon: "⚽" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "analysts", label: "Analysts", icon: "📋" },
    { id: "scouts", label: "Scout Approvals", icon: "🔍" },
    { id: "engine", label: "Engine Logs", icon: "⚙️" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminPanel() {
    const isAdmin = useQuery(api.users.isAdmin);
    const user = useQuery(api.users.getCurrentUser);
    const pendingScouts = useQuery(api.users.getPendingScouts);
    const [activeTab, setActiveTab] = useState<TabId>("overview");

    if (isAdmin === undefined || user === undefined) {
        return (
            <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center text-center gap-4">
                <p className="text-6xl">🔒</p>
                <h1 className="text-2xl font-bold text-white">Access Denied</h1>
                <p className="text-white/40 text-sm max-w-md">You don&apos;t have admin privileges. Contact the platform owner if you believe this is an error.</p>
                <Link href="/" className="text-sm text-[#00FF87] hover:underline mt-2">← Back to home</Link>
            </div>
        );
    }

    const pendingCount = pendingScouts?.length ?? 0;

    return (
        <div className="min-h-screen bg-[#0A0A0F] text-white flex">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0d0d14] border-r border-white/5 flex flex-col z-40">
                <div className="px-6 py-5 border-b border-white/5">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden">
                            <img src="/kashaf-logo.png" alt="KASHAF" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-lg font-bold text-white">KASHAF<span className="text-[#00FF87]">.</span></span>
                    </Link>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mt-2">Admin Panel</p>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                                activeTab === tab.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
                            }`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                            {tab.id === "scouts" && pendingCount > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
                <div className="px-3 py-4 border-t border-white/5">
                    <div className="flex items-center gap-3 px-3">
                        <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center text-sm font-bold text-red-400">
                            {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.name ?? "Admin"}</p>
                            <p className="text-xs text-white/40">Administrator</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 ml-64 p-8">
                <div className="max-w-6xl">
                    <h1 className="text-2xl font-bold text-white mb-1">
                        {TABS.find((t) => t.id === activeTab)?.label}
                    </h1>
                    <p className="text-sm text-white/30 mb-8">KASHAF Administration</p>

                    {activeTab === "overview" && <OverviewTab />}
                    {activeTab === "matches" && <MatchAssignmentsTab />}
                    {activeTab === "users" && <UsersTab />}
                    {activeTab === "analysts" && <AnalystsTab />}
                    {activeTab === "scouts" && <ScoutApprovalsTab />}
                    {activeTab === "engine" && <EngineLogsTab />}
                </div>
            </main>
        </div>
    );
}

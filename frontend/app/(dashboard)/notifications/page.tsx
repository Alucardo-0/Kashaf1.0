"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/* ── Icon Map ─────────────────────────────────────────────────────────── */
const typeIcons: Record<string, { icon: string; color: string }> = {
    new_request: { icon: "📩", color: "#3B82F6" },
    request_accepted: { icon: "✅", color: "#00FF87" },
    request_declined: { icon: "❌", color: "#EF4444" },
    new_rating: { icon: "⭐", color: "#F59E0B" },
    analysis_complete: { icon: "📊", color: "#8B5CF6" },
};

export default function NotificationsPage() {
    const notifications = useQuery(api.notifications.getNotificationsByUser);
    const markAsRead = useMutation(api.notifications.markAsRead);
    const markAllAsRead = useMutation(api.notifications.markAllAsRead);

    const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

    if (notifications === undefined) {
        return (
            <div className="flex items-center justify-center h-screen">
                <svg className="animate-spin h-8 w-8 text-[#00FF87]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Notifications</h1>
                    <p className="text-sm text-white/40 mt-1">
                        {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={() => markAllAsRead({})}
                        className="text-xs px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {/* Notification List */}
            {notifications.length === 0 ? (
                <div className="text-center py-20 rounded-2xl border border-dashed border-white/10">
                    <div className="text-5xl mb-4">🔔</div>
                    <p className="text-white/40 mb-1">No notifications yet</p>
                    <p className="text-xs text-white/25">When something happens, you&apos;ll see it here</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map((n) => {
                        const typeStyle = typeIcons[n.type] ?? { icon: "🔔", color: "#ffffff" };
                        return (
                            <div
                                key={n._id}
                                onClick={() => { if (!n.isRead) markAsRead({ notificationId: n._id }); }}
                                className={`group p-4 rounded-2xl transition-all cursor-pointer ${n.isRead
                                        ? "bg-transparent hover:bg-white/[0.02]"
                                        : "bg-white/[0.03] border border-white/[0.06] hover:border-white/10"
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Icon */}
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                                        style={{ backgroundColor: `${typeStyle.color}15` }}
                                    >
                                        {typeStyle.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm leading-relaxed ${n.isRead ? "text-white/40" : "text-white/80"}`}>
                                            {n.message}
                                        </p>
                                        <p className="text-[11px] text-white/20 mt-1">
                                            {new Date(n.createdAt).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    </div>

                                    {/* Unread dot */}
                                    {!n.isRead && (
                                        <div className="w-2 h-2 rounded-full bg-[#00FF87] mt-2 shrink-0 shadow-[0_0_6px_#00FF87]" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

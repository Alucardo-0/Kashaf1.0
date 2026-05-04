"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function EngineLogsTab() {
    const logs = useQuery(api.engineLogs.getAllRecentLogs);

    if (!logs) {
        return <div className="text-white/30 text-sm p-8">Loading engine logs...</div>;
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-16 rounded-2xl border border-dashed border-white/10">
                <div className="text-4xl mb-3">📄</div>
                <p className="text-white/40 mb-1">No engine logs yet</p>
                <p className="text-xs text-white/25">Engine processing logs will appear here when analyses are submitted</p>
            </div>
        );
    }

    const statusColors: Record<string, string> = {
        started: "#3B82F6",
        completed: "#22C55E",
        failed: "#EF4444",
    };

    // Group logs by jobId
    const grouped: Record<string, typeof logs> = {};
    for (const log of logs) {
        if (!grouped[log.jobId]) grouped[log.jobId] = [];
        grouped[log.jobId].push(log);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-white">Engine Process Logs</h2>
                <span className="text-xs text-white/30">{logs.length} entries</span>
            </div>

            {Object.entries(grouped).map(([jobId, jobLogs]) => {
                // Sort logs within each job by creation time ascending
                const sortedLogs = [...jobLogs].sort((a, b) => a.createdAt - b.createdAt);
                const lastLog = sortedLogs[sortedLogs.length - 1];
                const jobStatus = lastLog.status;
                const jobColor = statusColors[jobStatus] ?? "#fff";

                return (
                    <div key={jobId} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        {/* Job Header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: jobColor }} />
                                <span className="text-xs font-mono text-white/50 truncate max-w-[300px]">{jobId}</span>
                            </div>
                            <span className="text-[9px] font-medium px-2 py-0.5 rounded-full border" style={{ color: jobColor, borderColor: `${jobColor}30`, backgroundColor: `${jobColor}10` }}>
                                {jobStatus.toUpperCase()}
                            </span>
                        </div>

                        {/* Log steps */}
                        <div className="space-y-2 ml-4 border-l border-white/[0.06] pl-4">
                            {sortedLogs.map((log) => {
                                const color = statusColors[log.status] ?? "#fff";
                                return (
                                    <div key={log._id} className="relative">
                                        {/* Timeline dot */}
                                        <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full border-2 border-[#0d0d14]" style={{ backgroundColor: color }} />

                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[11px] font-medium text-white">{log.step}</span>
                                                    <span className="text-[8px] font-medium px-1 py-0.5 rounded" style={{ color, backgroundColor: `${color}15` }}>
                                                        {log.status}
                                                    </span>
                                                </div>
                                                {log.inputSummary && (
                                                    <p className="text-[10px] text-white/35">
                                                        <span className="text-white/25 font-semibold">IN:</span> {log.inputSummary}
                                                    </p>
                                                )}
                                                {log.outputSummary && (
                                                    <p className="text-[10px] text-[#00FF87]/40">
                                                        <span className="text-[#00FF87]/30 font-semibold">OUT:</span> {log.outputSummary}
                                                    </p>
                                                )}
                                                {log.details && (
                                                    <p className="text-[10px] text-white/25 italic">{log.details}</p>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-[9px] text-white/20 block">
                                                    {new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                                </span>
                                                {log.durationMs !== undefined && (
                                                    <span className="text-[9px] text-white/30 block">{log.durationMs}ms</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

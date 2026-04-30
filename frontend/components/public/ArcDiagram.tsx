"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ArcDiagramProps {
    archetypes: Record<string, number>;
}

// A sleek color palette for the archetypes
const COLORS = [
    "#3B82F6", // Blue
    "#00FF87", // Neon Green
    "#A855F7", // Purple
    "#F59E0B", // Amber
    "#EC4899", // Pink
];

export function ArcDiagram({ archetypes }: ArcDiagramProps) {
    if (!archetypes) return null;

    // Convert archetypes record to array data for recharts
    const data = Object.entries(archetypes).map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length],
    }));

    return (
        <div className="w-full h-full min-h-[220px] relative flex flex-col justify-end">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="100%" // Focus at the bottom to give semi-circle effect
                        startAngle={180}
                        endAngle={0}
                        innerRadius="70%"
                        outerRadius="100%"
                        paddingAngle={4}
                        dataKey="value"
                        cornerRadius={6}
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-black/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl">
                                        <p className="text-xs text-white/50 mb-1">{payload[0].name}</p>
                                        <p className="text-xl font-bold flex items-baseline gap-1" style={{ color: payload[0].payload.color }}>
                                            {typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : payload[0].value} <span className="text-xs text-white/40 font-normal">%</span>
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute left-0 right-0 bottom-0 text-center -mb-6">
                <p className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-2">Archetype Distribution</p>
            </div>
            
            {/* Custom Legend */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
                {data.map((entry, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                        <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}60` }} />
                        <span className="text-[10px] text-white/70 whitespace-nowrap">{entry.name} ({Number(entry.value).toFixed(2)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

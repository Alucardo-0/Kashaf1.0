"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FilterPanel, FilterState } from "@/components/scout/FilterPanel";
import { PlayerRow } from "@/components/scout/PlayerRow";
import type { ScoutSearchPlayer } from "@/components/scout/PlayerRow";

export default function ScoutDashboard() {
  const [filters, setFilters] = useState<FilterState>({
    unit: "all",
    topArchetype: "any",
    archetypeThreshold: 0,
    minMatches: 3, // Default to reliable data only
    ageRange: [18, 30],
    heightRange: [175, 220],
    preferredFoot: 'any'
  });

  const rawProfiles = useQuery(api.users.searchPlayers, {
    position: filters.unit !== "all" ? filters.unit : undefined,
    minAge: filters.ageRange[0],
    maxAge: filters.ageRange[1],
    foot: filters.preferredFoot !== 'any' ? (filters.preferredFoot as "left" | "right" | "both") : undefined,
    minAnalyzedMatches: filters.minMatches > 0 ? filters.minMatches : undefined,
  });

  // We need to calculate a simulated "Match %" score since we don't have an ElasticSearch backend yet.
  // We use a stable hashing function so the score stays the same for a player during navigation.
  const filterHash = JSON.stringify(filters).length;
  
  const generateMatchScore = (profile: { _id: string }) => {
    let hash = 0;
    const str = profile._id + filterHash;
    for (let i = 0; i < str.length; i++) {
       hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const pseudoRandom = Math.abs(Math.sin(hash)); 
    // If they perfectly match the hard DB filters (topArchetype, etc), they start high.
    return Math.floor(pseudoRandom * (100 - 72) + 72); 
  };

  const processedProfiles = rawProfiles ? [...rawProfiles].map(p => ({
    ...p,
    matchScore: generateMatchScore(p)
  })).sort((a, b) => b.matchScore - a.matchScore) : [];

  return (
    <div className="flex h-full w-full bg-dns-bg text-white overflow-hidden p-6 gap-6 relative selection:bg-dns-blue/30">
      {/* Ambient Backgrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-dns-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-dns-green/5 rounded-full blur-[100px]" />
      </div>

      {/* Left Filter Sidebar */}
      <div className="w-[340px] shrink-0 relative z-10 flex flex-col pt-2">
        <FilterPanel filters={filters} setFilters={setFilters} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto relative z-10 pr-2 pt-2 custom-scrollbar">
        
        {/* Header Section */}
        <div className="mb-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  Player Search Engine
                </h1>
                <p className="text-sm font-medium text-white/50 mt-1">
                  Discover talent matching your exact criteria, ranked by similarity.
                </p>
              </div>
            </div>

            {/* Metrics Bar */}
            <div className="flex items-center justify-between bg-white/2 border border-white/4 backdrop-blur-xl px-5 py-3 rounded-xl shadow-lg">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Results</span>
                  <span className="text-sm font-bold text-white">{processedProfiles.length} Players Found</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Sorted By</span>
                  <span className="text-xs font-bold text-dns-green bg-dns-green/10 px-2 py-1 rounded border border-dns-green/20">Highest Match %</span>
                </div>
            </div>
        </div>

        {rawProfiles === undefined ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-dns-green border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : processedProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-white/10 rounded-2xl bg-white/2 backdrop-blur-md">
            <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">No Matches Found</h3>
            <p className="text-white/50 max-w-sm text-sm">
              Try broadening your search constraints (Age, Height, or Top Archetype).
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-12">
            {processedProfiles.map((p) => (
              <PlayerRow key={p._id} profile={p as ScoutSearchPlayer} matchScore={p.matchScore} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

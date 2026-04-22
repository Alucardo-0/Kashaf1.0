import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ChevronRight } from "lucide-react";
import Link from "next/link";

import type { Doc } from "@/convex/_generated/dataModel";

export type ScoutSearchPlayer = Doc<"users"> & {
  positionProfile: { position: string; percentage: number }[];
  totalMatchesAnalyzed: number;
};

interface PlayerRowProps {
  profile: ScoutSearchPlayer;
  matchScore: number;
}

export function PlayerRow({ profile, matchScore }: PlayerRowProps) {
  const isReliable = profile.totalMatchesAnalyzed >= 3;

  // Visual cues based on match score
  const scoreColor = matchScore >= 85 ? "text-[#00FF87]" : matchScore >= 70 ? "text-amber-400" : "text-white/40";
  const scoreBg = matchScore >= 85 ? "bg-[#00FF87]/10 border-[#00FF87]/20" : matchScore >= 70 ? "bg-amber-400/10 border-amber-400/20" : "bg-white/5 border-white/10";

  // Derive display values from user profile
  const playerName = profile.name || "Unknown Player";
  const age = profile.playerProfile?.age || "--";
  const height = profile.playerProfile?.height || "--";
  const foot = profile.playerProfile?.foot ? profile.playerProfile.foot.charAt(0).toUpperCase() + profile.playerProfile.foot.slice(1) : "Unknown";
  
  const topPos = profile.positionProfile && profile.positionProfile.length > 0
      ? profile.positionProfile.reduce((prev: { position: string; percentage: number }, current: { position: string; percentage: number }) => (prev.percentage > current.percentage) ? prev : current)
      : null;

  const unit = profile.playerProfile?.position || "Unknown";
  const topArchetype = topPos ? topPos.position : "N/A";
  const topPct = topPos ? Math.round(topPos.percentage) : 0;

  return (
    <Link href={`/players/${profile._id}`} className="group relative flex items-center bg-white/2 hover:bg-white/5 border border-white/4 hover:border-white/10 rounded-2xl p-4 transition-all duration-300 overflow-hidden shadow-sm cursor-pointer">
      {/* Dynamic Background Match Glow */}
      {matchScore >= 85 && (
        <div className="absolute top-0 right-0 w-48 h-full bg-linear-to-l from-dns-green/5 to-transparent pointer-events-none" />
      )}
      
      {/* 1. Match Percentage Indicator */}
      <div className="shrink-0 w-24 flex flex-col items-center justify-center border-r border-white/5 pr-4 mr-4">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${scoreBg}`}>
          <span className={`text-xl font-black ${scoreColor}`}>{Math.round(matchScore)}</span>
          <span className={`text-[10px] font-bold ${scoreColor} opacity-70`}>%</span>
        </div>
        <span className="text-[9px] uppercase tracking-widest text-white/40 mt-2 font-semibold">Match</span>
      </div>

      {/* 2. Core Player Info */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-lg font-bold text-white truncate">{playerName}</h3>
          {isReliable ? (
            <div className="flex items-center gap-1 text-dns-blue" title={`Reliable Data (${profile.totalMatchesAnalyzed} matches)`}>
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-500" title={`Low Data Reliability (${profile.totalMatchesAnalyzed} matches)`}>
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-white/60 mb-2">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/20"/> {age} y/o</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/20"/> {height} cm</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/20"/> {foot} Foot</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="bg-white/10 text-white font-bold uppercase tracking-wider px-2 py-0.5 text-[9px] border-transparent hover:bg-white/15">
            {unit}
          </Badge>
          {topPos && (
            <Badge variant="outline" className="text-dns-green bg-dns-green/5 border-dns-green/20 px-2 py-0.5 font-medium hover:bg-dns-green/10 text-[10px] uppercase tracking-wider">
              {topArchetype} ({topPct}%)
            </Badge>
          )}
        </div>
      </div>

      {/* 3. Arrow indicator */}
      <div className="shrink-0 pl-4 text-white/20 group-hover:text-white/60 transition-colors">
        <ChevronRight className="w-5 h-5" />
      </div>
    </Link>
  );
}

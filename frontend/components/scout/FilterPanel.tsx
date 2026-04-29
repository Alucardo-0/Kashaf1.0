import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Archetypes per position unit — mirrors backend models/<unit>/cluster_names.json
const ARCHETYPES_BY_POSITION: Record<string, string[]> = {
  cb: ["Ball-Playing Defender", "Stopper", "Interceptor", "Sweeper"],
  fb: ["Playmaking Fullback", "Wing-Back", "Defensive Fullback"],
  mf: ["Advanced Playmaker", "Carrying Midfielder", "Deep Playmaker", "Anchor"],
  wg: ["Inside Forward", "Wide Playmaker", "Wide Winger"],
  st: ["Link-Up Striker", "Target Man", "Poacher"],
};

export interface FilterState {
  unit: string;
  topArchetype: string;
  archetypeThreshold: number;
  minMatches: number;
  ageRange: [number, number];
  heightRange: [number, number];
  preferredFoot: string;
}

interface FilterPanelProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

export function FilterPanel({ filters, setFilters }: FilterPanelProps) {
  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="w-full h-full bg-[#0a0a0f] border-white/4 shadow-2xl flex flex-col rounded-2xl overflow-hidden relative">
      <CardHeader className="pb-4 border-b border-white/4 relative z-10">
        <CardTitle className="text-lg font-black flex items-center justify-between text-white tracking-tight">
          Search Constraints
          <Badge variant="secondary" className="bg-dns-blue/10 text-dns-blue border-dns-blue/20 text-[10px] uppercase tracking-wider px-2 py-0.5">
            Engine Active
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-5 relative z-10 flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Core Constraints */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-widest border-b border-white/5 pb-2">Technical Profile</h3>
          
          <div className="space-y-2.5">
            <Label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Position / Unit</Label>
            <Select value={filters.unit} onValueChange={(val) => {
              updateFilter("unit", val);
              updateFilter("topArchetype", "any");
            }}>
              <SelectTrigger className="w-full bg-white/5 border-white/5 text-white rounded-lg h-10 focus:border-dns-blue focus:ring-1 focus:ring-dns-blue">
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent className="bg-[#12121a] border-white/10 text-white rounded-xl">
                <SelectItem value="all">All Positions</SelectItem>
                <SelectItem value="cb">Center Back (CB)</SelectItem>
                <SelectItem value="fb">Fullback (FB)</SelectItem>
                <SelectItem value="mf">Midfielder (MF)</SelectItem>
                <SelectItem value="wg">Winger (WG)</SelectItem>
                <SelectItem value="st">Striker (ST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filters.unit !== "all" && (
            <div className="space-y-2.5">
              <Label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Top Archetype</Label>
              <Select value={filters.topArchetype} onValueChange={(val) => updateFilter("topArchetype", val)}>
                <SelectTrigger className="w-full bg-white/5 border-white/5 text-white rounded-lg h-10 focus:border-dns-green focus:ring-1 focus:ring-dns-green">
                  <SelectValue placeholder="Any Archetype" />
                </SelectTrigger>
                <SelectContent className="bg-[#12121a] border-white/10 text-white rounded-xl">
                  <SelectItem value="any">Any Archetype</SelectItem>
                  {(ARCHETYPES_BY_POSITION[filters.unit] ?? []).map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Physical Constraints */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-widest border-b border-white/5 pb-2">Physical Traits</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Age Range</Label>
              <span className="text-xs font-medium text-white/80">{filters.ageRange[0]} - {filters.ageRange[1]}</span>
            </div>
            <div className="px-1">
              <Slider
                value={[filters.ageRange[0], filters.ageRange[1]]}
                min={10} max={50} step={1}
                onValueChange={(vals) => updateFilter("ageRange", [vals[0], vals[1]])}
                className="cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Height (cm)</Label>
              <span className="text-xs font-medium text-white/80">{filters.heightRange[0]}+</span>
            </div>
            <div className="px-1">
              <Slider
                value={[filters.heightRange[0]]}
                min={100} max={210} step={1}
                onValueChange={(vals) => updateFilter("heightRange", [vals[0], 220])}
                className="cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Preferred Foot</Label>
            <div className="flex gap-2">
              {['Any', 'Left', 'Right', 'Both'].map((foot) => (
                <button
                  key={foot}
                  onClick={() => updateFilter("preferredFoot", foot.toLowerCase())}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                    filters.preferredFoot === foot.toLowerCase() 
                    ? "bg-white text-black" 
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                  }`}
                >
                  {foot}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Reliability */}
        <div className="pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="space-y-1 pr-4">
              <Label className="text-sm text-white/90 font-medium">Verified Data Only</Label>
              <p className="text-[10px] text-white/40 leading-snug">Exclude players with fewer than 3 analyzed matches</p>
            </div>
            <Switch
              checked={filters.minMatches === 3}
              onCheckedChange={(checked) => updateFilter("minMatches", checked ? 3 : 0)}
              className="data-[state=checked]:bg-dns-blue"
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

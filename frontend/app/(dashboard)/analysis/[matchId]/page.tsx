"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";

/* ── YouTube reserved shortcuts (must not be overridden) ──────────────── */
const YOUTUBE_RESERVED_KEYS = new Set([
    " ", "k", "j", "l", "f", "m", "c", "t",
    "arrowleft", "arrowright", "arrowup", "arrowdown",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "/", ".", ",", ">", "<", "escape", "tab", "enter",
    "home", "end",
]);

/** Default shortcut assignments (avoiding YouTube's keys) */
const DEFAULT_SHORTCUTS: Record<string, string> = {
    pass: "q",
    shot: "w",
    cross: "e",
    dribble: "r",
    carry: "a",
    reception: "s",
    tackle: "d",
    interception: "g",
    aerial: "z",
    clearance: "x",
};

/* ── Constants ────────────────────────────────────────────────────────── */
const EVENT_TYPES = [
    { value: "pass", label: "Pass", color: "#3B82F6" },
    { value: "shot", label: "Shot", color: "#EF4444" },
    { value: "cross", label: "Cross", color: "#F59E0B" },
    { value: "dribble", label: "Dribble", color: "#8B5CF6" },
    { value: "carry", label: "Carry", color: "#F97316" },
    { value: "reception", label: "Reception", color: "#A78BFA" },
    { value: "tackle", label: "Tackle", color: "#06B6D4" },
    { value: "interception", label: "Interception", color: "#22C55E" },
    { value: "aerial", label: "Aerial Duel", color: "#EC4899" },
    { value: "clearance", label: "Clearance", color: "#14B8A6" },
];

/** Events that have a destination coordinate (ball goes somewhere) */
const HAS_DESTINATION = new Set(["pass", "cross", "carry"]);

const OUTCOMES: Record<string, string[]> = {
    pass: ["Successful", "Failed", "Key Pass", "Assist"],
    shot: ["Goal", "Saved", "Blocked", "Off Target", "Post"],
    cross: ["Successful", "Failed", "Assist"],
    dribble: ["Successful", "Failed"],
    carry: ["Successful", "Failed"],
    reception: ["Successful", "Failed"],
    tackle: ["Successful", "Failed"],
    interception: ["Successful", "Failed"],
    aerial: ["Won", "Lost"],
    clearance: ["Successful"],
};

/** Events that support body part selection */
const HAS_BODY_PART = new Set(["pass", "shot", "cross", "clearance", "aerial"]);

/* ── Tagger Guidelines Data ───────────────────────────────────────────── */
const GUIDELINES: Record<string, {
    tagWhen: string;
    requiredFields: string[];
    doNotTag: string[];
    hint: string;
}> = {
    pass: {
        tagWhen: "Player deliberately plays the ball to a teammate, regardless of distance or direction — short, long, forward, backward, sideways all count.",
        requiredFields: [
            "Start and end coordinates — end coordinates are critical, they drive crossing detection, progressive passing, and distribution stats",
            "Body part: foot or head",
            "Set piece: True for corners, free kicks, goal kicks, throw-ins, kick-offs",
        ],
        doNotTag: [
            "Goalkeeper distributions unless the goalkeeper is the profiled player",
        ],
        hint: "Start + End coords critical · Body part needed",
    },
    shot: {
        tagWhen: "Player makes a deliberate attempt at goal.",
        requiredFields: [
            "Start coordinates only — end coordinates not needed",
            "Body part: foot or head",
            "Set piece: True for direct free kick shots and penalties",
            "Outcome: Goal, Saved, Blocked, Off Target, or Post — categorical, not binary",
        ],
        doNotTag: [
            "Blocked attempts that clearly weren't aimed at goal",
        ],
        hint: "Start coords only · Body part needed · Use categorical outcome",
    },
    cross: {
        tagWhen: "Player deliberately delivers the ball into the box from a wide position in the final third.",
        requiredFields: [
            "Start and end coordinates — both critical",
            "Body part: almost always foot",
            "Set piece: True for corner kick deliveries",
        ],
        doNotTag: [
            "Crosses that don't start from a wide final third position — those are passes",
            "Standard sideways passes along the ground — tag as pass instead",
        ],
        hint: "Start + End coords critical · Wide → box only · Low cutbacks from byline count",
    },
    dribble: {
        tagWhen: "Player deliberately attempts to beat a defender in a direct 1v1 ground challenge.",
        requiredFields: [
            "Start coordinates only — end coordinates not needed",
            "No body part needed",
        ],
        doNotTag: [
            "Running past a defender who isn't actively challenging — that's a carry",
            "Failed dribbles that result in a foul — tag the foul instead",
        ],
        hint: "Start coords only · Must be a 1v1 attempt",
    },
    carry: {
        tagWhen: "Player runs purposefully with the ball in space — no defender being actively beaten.",
        requiredFields: [
            "Start AND end coordinates — both critical, they drive progressive carries and wide carry stats",
            "No body part needed",
        ],
        doNotTag: [
            "Very minor touch adjustments with no real movement — only tag if the player clearly moved with the ball with intent",
        ],
        hint: "Start + End coords both critical · No 1v1 involved",
    },
    reception: {
        tagWhen: "Player receives a deliberate pass from a teammate — whether controlled or miscontrolled.",
        requiredFields: [
            "Start coordinates — where the player received the ball. This is critical: box receptions and positional stats are all derived from this location",
            "No end coordinates needed",
            "Body part optional but useful if headed",
            "Outcome: Successful (controlled) or Failed (heavy touch/miscontrol leading to turnover)",
        ],
        doNotTag: [
            "After interceptions, tackles, or ball recoveries — reception only follows a teammate's deliberate pass",
            "After aerial duels — if the player won the header and controlled it, the aerial duel covers it",
        ],
        hint: "Start coords only · Tag miscontrols as Failed · Only after teammate's pass",
    },
    tackle: {
        tagWhen: "Player attempts a ground challenge to win the ball from an opponent — tag regardless of success or failure.",
        requiredFields: [
            "Start coordinates only",
            "No body part, no end coordinates needed",
            "Outcome: Successful (won the ball/stopped attack) or Failed (missed/beaten/fouled)",
        ],
        doNotTag: [
            "Aerial challenges — use Aerial Duel instead",
            "Challenges that result in a foul — use Foul instead",
        ],
        hint: "Start coords only · Tag both won AND failed tackles",
    },
    interception: {
        tagWhen: "Player actively cuts off a pass that was intended for an opponent — the ball must be in flight toward that opponent when intercepted.",
        requiredFields: [
            "Start coordinates only",
            "No body part, no end coordinates needed",
            "Outcome: Successful (retained possession) or Failed (ball fell to opponent/went out)",
        ],
        doNotTag: [
            "Collecting a loose ball — that is a recovery, not an interception",
            "Blocking a shot — that is not an interception",
            "Winning a header from a pass — use Aerial Duel instead",
            "Do NOT follow with a Reception tag — interception stands alone",
        ],
        hint: "Start coords only · Must cut off opponent's pass · Tag outcome",
    },
    aerial: {
        tagWhen: "Player challenges an opponent for a header in the air.",
        requiredFields: [
            "Start coordinates",
            "Set piece: True if the aerial comes from a corner, free kick delivery, or goal kick",
        ],
        doNotTag: [
            "Ground challenges — use Tackle instead",
            "If the player wins the aerial and immediately heads the ball somewhere — tag Aerial Duel first, then separately tag the headed Pass or headed Clearance as two separate events",
        ],
        hint: "Start coords · Won = your player won the header",
    },
    clearance: {
        tagWhen: "Player deliberately kicks or heads the ball away from danger with no specific intended target.",
        requiredFields: [
            "Start coordinates",
            "Body part: foot or head — this is critical, headed clearances directly feed aerial dominance stats for defenders",
            "Set piece: True if clearing from a corner or free kick delivery",
        ],
        doNotTag: [
            "If the player had a clear intended target — that's a Pass, not a clearance",
            "Goalkeeper punches or saves — unless the goalkeeper is the profiled player",
            "Blocks — a clearance is proactive, a block is reactive to a shot or cross",
        ],
        hint: "Start coords · Body part critical (head vs foot)",
    },
};

const GENERAL_RULES = [
    "Tag only the profiled player's actions — ignore everything else on the pitch",
    "Every action needs a start location — where the player was when the action happened",
    "Tag actions in chronological order — the engine processes sequences",
    "One action = one tag. If a player receives and immediately passes, that's two separate tags: Reception then Pass",
];

const COMMON_MISTAKES: Array<{ situation: string; wrong: string; right: string }> = [
    { situation: "Player receives and immediately shoots", wrong: "Reception + Shot together", right: "Reception → Shot (two separate tags in order)" },
    { situation: "Player wins aerial duel and heads to teammate", wrong: "Aerial Duel only", right: "Aerial Duel → Pass (two tags)" },
    { situation: "Player intercepts a pass", wrong: "Interception → Reception", right: "Interception only" },
    { situation: "Player tackles and immediately carries", wrong: "Tackle + Carry together", right: "Tackle (Successful) → Carry (two separate tags)" },
    { situation: "Player makes a failed tackle", wrong: "No tag at all", right: "Tackle with outcome = Failed" },
    { situation: "Player carries then dribbles past defender", wrong: "Dribble only", right: "Carry (with end coords) → Dribble (two tags)" },
    { situation: "Long pass that doesn't reach teammate", wrong: "No tag", right: "Pass with outcome = Failed" },
    { situation: "Corner kick delivery", wrong: "Pass with no set piece", right: "Pass with set piece = True" },
    { situation: "Header from corner to score", wrong: "Shot only", right: "Shot (body part = head, set piece = True, outcome = Goal)" },
    { situation: "Ball recovery after a clearance", wrong: "Reception", right: "No tag — player wasn't receiving a teammate's pass" },
    { situation: "Player miscontrols a pass", wrong: "Skip — don't tag", right: "Reception with outcome = Failed" },
    { situation: "Interception deflects out of play", wrong: "Interception (Successful)", right: "Interception with outcome = Failed" },
    { situation: "Shot saved by keeper", wrong: "Shot (Off Target)", right: "Shot with outcome = Saved" },
    { situation: "Shot hits the post", wrong: "Shot (Off Target)", right: "Shot with outcome = Post" },
];

/* ── Format timestamp ─────────────────────────────────────────────────── */
function formatTimestamp(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ── Pitch SVG Component ──────────────────────────────────────────────── */
function PitchMap({
    events,
    onPitchClick,
    clickMode,
    pendingOrigin,
    pendingDestination,
}: {
    events: Array<{
        _id: string;
        eventType: string;
        originX: number;
        originY: number;
        destinationX?: number;
        destinationY?: number;
    }>;
    onPitchClick: (x: number, y: number) => void;
    clickMode: "origin" | "destination" | null;
    pendingOrigin: { x: number; y: number } | null;
    pendingDestination?: { x: number; y: number } | null;
}) {
    const svgRef = useRef<SVGSVGElement>(null);

    const handleClick = useCallback(
        (e: React.MouseEvent<SVGSVGElement>) => {
            if (!clickMode || !svgRef.current) return;
            const rect = svgRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            onPitchClick(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
        },
        [clickMode, onPitchClick]
    );

    const getEventColor = (type: string) => EVENT_TYPES.find((e) => e.value === type)?.color ?? "#fff";

    return (
        <div className="relative w-full aspect-[68/105] bg-[#1a472a] rounded-2xl overflow-hidden border border-white/10 shadow-xl">
            <svg
                ref={svgRef}
                viewBox="0 0 68 105"
                className={`w-full h-full ${clickMode ? "cursor-crosshair" : ""}`}
                onClick={handleClick}
            >
                {/* Pitch markings */}
                <rect x="0" y="0" width="68" height="105" fill="none" stroke="white" strokeWidth="0.3" strokeOpacity="0.5" />
                {/* Center line */}
                <line x1="0" y1="52.5" x2="68" y2="52.5" stroke="white" strokeWidth="0.2" strokeOpacity="0.5" />
                {/* Center circle */}
                <circle cx="34" cy="52.5" r="9.15" fill="none" stroke="white" strokeWidth="0.2" strokeOpacity="0.5" />
                <circle cx="34" cy="52.5" r="0.5" fill="white" fillOpacity="0.5" />
                {/* Penalty area top */}
                <rect x="13.84" y="0" width="40.32" height="16.5" fill="none" stroke="white" strokeWidth="0.2" strokeOpacity="0.5" />
                <rect x="24.84" y="0" width="18.32" height="5.5" fill="none" stroke="white" strokeWidth="0.2" strokeOpacity="0.5" />
                <circle cx="34" cy="11" r="0.5" fill="white" fillOpacity="0.5" />
                {/* Penalty area bottom */}
                <rect x="13.84" y="88.5" width="40.32" height="16.5" fill="none" stroke="white" strokeWidth="0.2" strokeOpacity="0.5" />
                <rect x="24.84" y="99.5" width="18.32" height="5.5" fill="none" stroke="white" strokeWidth="0.2" strokeOpacity="0.5" />
                <circle cx="34" cy="94" r="0.5" fill="white" fillOpacity="0.5" />
                {/* Penalty arcs */}
                <path d="M 29 16.5 A 9.15 9.15 0 0 0 39 16.5" fill="none" stroke="white" strokeWidth="0.2" strokeOpacity="0.5" />
                <path d="M 29 88.5 A 9.15 9.15 0 0 1 39 88.5" fill="none" stroke="white" strokeWidth="0.2" strokeOpacity="0.5" />
                {/* Corner arcs */}
                <path d="M 0 1 A 1 1 0 0 0 1 0" fill="none" stroke="white" strokeWidth="0.2" strokeOpacity="0.3" />
                <path d="M 67 0 A 1 1 0 0 0 68 1" fill="none" stroke="white" strokeWidth="0.2" strokeOpacity="0.3" />
                <path d="M 0 104 A 1 1 0 0 1 1 105" fill="none" stroke="white" strokeWidth="0.2" strokeOpacity="0.3" />
                <path d="M 67 105 A 1 1 0 0 0 68 104" fill="none" stroke="white" strokeWidth="0.15" strokeOpacity="0.3" />

                {/* Goal orientation labels */}
                <text x="34" y="3.5" textAnchor="middle" fill="white" fillOpacity="0.35" fontSize="2.8" fontWeight="600" fontFamily="system-ui, sans-serif" letterSpacing="0.15">
                    OPP. GOAL
                </text>
                <text x="34" y="103.5" textAnchor="middle" fill="white" fillOpacity="0.35" fontSize="2.8" fontWeight="600" fontFamily="system-ui, sans-serif" letterSpacing="0.15">
                    OWN GOAL
                </text>

                {/* Events */}
                {events.map((ev) => {
                    const color = getEventColor(ev.eventType);
                    const ox = (ev.originX / 100) * 68;
                    const oy = (ev.originY / 100) * 105;
                    return (
                        <g key={ev._id}>
                            {/* Destination line */}
                            {ev.destinationX !== undefined && ev.destinationY !== undefined && (
                                <line
                                    x1={ox}
                                    y1={oy}
                                    x2={(ev.destinationX / 100) * 68}
                                    y2={(ev.destinationY / 100) * 105}
                                    stroke={color}
                                    strokeWidth="0.4"
                                    strokeOpacity="0.6"
                                    strokeDasharray="1,0.5"
                                    markerEnd=""
                                />
                            )}
                            {/* Destination dot */}
                            {ev.destinationX !== undefined && ev.destinationY !== undefined && (
                                <circle
                                    cx={(ev.destinationX / 100) * 68}
                                    cy={(ev.destinationY / 100) * 105}
                                    r="0.8"
                                    fill={color}
                                    fillOpacity="0.4"
                                    stroke={color}
                                    strokeWidth="0.2"
                                />
                            )}
                            {/* Origin dot */}
                            <circle cx={ox} cy={oy} r="1.2" fill={color} fillOpacity="0.8" stroke="white" strokeWidth="0.2" />
                        </g>
                    );
                })}

                {/* Pending line connecting origin and destination */}
                {pendingOrigin && pendingDestination && (
                    <line
                        x1={(pendingOrigin.x / 100) * 68}
                        y1={(pendingOrigin.y / 100) * 105}
                        x2={(pendingDestination.x / 100) * 68}
                        y2={(pendingDestination.y / 100) * 105}
                        stroke="#3B82F6"
                        strokeWidth="0.4"
                        strokeOpacity="0.6"
                        strokeDasharray="1,0.5"
                    />
                )}

                {/* Pending origin marker */}
                {pendingOrigin && (
                    <circle
                        cx={(pendingOrigin.x / 100) * 68}
                        cy={(pendingOrigin.y / 100) * 105}
                        r="1.2"
                        fill="#00FF87"
                        fillOpacity="0.8"
                        stroke="white"
                        strokeWidth="0.2"
                        className={!pendingDestination ? "animate-pulse" : ""}
                    />
                )}
                
                {/* Pending destination marker */}
                {pendingDestination && (
                    <circle
                        cx={(pendingDestination.x / 100) * 68}
                        cy={(pendingDestination.y / 100) * 105}
                        r="1.2"
                        fill="#3B82F6"
                        fillOpacity="0.8"
                        stroke="white"
                        strokeWidth="0.2"
                    />
                )}
            </svg>

            {/* Click mode indicator */}
            {clickMode && (
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-xs font-medium text-[#00FF87] border border-[#00FF87]/30">
                    Click to set {clickMode === "origin" ? "origin" : "destination"} point
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   MATCH ANALYSIS PAGE
   ══════════════════════════════════════════════════════════════════════ */
export default function MatchAnalysisPage() {
    const params = useParams();
    const router = useRouter();
    const matchId = params.matchId as Id<"matches">;

    /* ── Queries ──────────────────────────────────────────────────────── */
    const match = useQuery(api.matches.getMatchById, { matchId });
    const events = useQuery(api.analysisEvents.getEventsByMatch, { matchId });
    const existingSummary = useQuery(api.matchSummaries.getSummaryByMatch, { matchId });
    const user = useQuery(api.users.getCurrentUser);
    const engineJob = useQuery(api.engineJobs.getJobByMatchId, { matchId });
    const engineLogs = useQuery(api.engineLogs.getLogsByMatch, { matchId });
    const savedShortcuts = useQuery(api.keyboardShortcuts.getShortcuts);

    /* ── Mutations ────────────────────────────────────────────────────── */
    const logEvent = useMutation(api.analysisEvents.logEvent);
    const deleteEvent = useMutation(api.analysisEvents.deleteEvent);
    const updateEvent = useMutation(api.analysisEvents.updateEvent);
    const updateMatchStatus = useMutation(api.matches.updateMatchStatus);
    const createSummary = useMutation(api.matchSummaries.createSummary);
    const getAndQueueEngineJob = useAction(api.engine.getAndQueueEngineJob);
    const saveShortcutsMutation = useMutation(api.keyboardShortcuts.saveShortcuts);

    /* ── Event Logger State ───────────────────────────────────────────── */
    const [selectedEventType, setSelectedEventType] = useState("pass");
    const [selectedOutcome, setSelectedOutcome] = useState("Successful");
    const [clickMode, setClickMode] = useState<"origin" | "destination" | null>("origin");
    const [pendingOrigin, setPendingOrigin] = useState<{ x: number; y: number } | null>(null);
    const [pendingDestination, setPendingDestination] = useState<{ x: number; y: number } | null>(null);
    const playerRef = useRef<any>(null);
    const ytContainerRef = useRef<HTMLDivElement>(null);
    const [playerReady, setPlayerReady] = useState(false);
    const [eventNotes, setEventNotes] = useState("");
    const [isSetPiece, setIsSetPiece] = useState(false);
    const [bodyPart, setBodyPart] = useState<"foot" | "head">("foot");
    const [logLoading, setLogLoading] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    const needsDestination = HAS_DESTINATION.has(selectedEventType);

    /* ── Summary State ────────────────────────────────────────────────── */
    const [showSummary, setShowSummary] = useState(false);
    const [overallRating, setOverallRating] = useState(7);
    const [strengths, setStrengths] = useState("");
    const [weaknesses, setWeaknesses] = useState("");
    const [writtenSummary, setWrittenSummary] = useState("");
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [engineError, setEngineError] = useState<string | null>(null);
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [resubmitLoading, setResubmitLoading] = useState(false);
    const [showGuidelines, setShowGuidelines] = useState(false);
    const [showShortcutConfig, setShowShortcutConfig] = useState(false);
    const [showEngineLogs, setShowEngineLogs] = useState(false);
    const [customShortcuts, setCustomShortcuts] = useState<Record<string, string>>(DEFAULT_SHORTCUTS);
    const [shortcutEditKey, setShortcutEditKey] = useState<string | null>(null);
    const [shortcutError, setShortcutError] = useState<string | null>(null);

    /* ── Load saved shortcuts ─────────────────────────────────────────── */
    useEffect(() => {
        if (savedShortcuts?.shortcuts) {
            setCustomShortcuts({ ...DEFAULT_SHORTCUTS, ...savedShortcuts.shortcuts });
        }
    }, [savedShortcuts]);

    /* ── Keyboard shortcut key map (reverse lookup) ───────────────────── */
    const shortcutKeyMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const [eventType, key] of Object.entries(customShortcuts)) {
            map[key.toLowerCase()] = eventType;
        }
        return map;
    }, [customShortcuts]);

    /* ── Keyboard shortcut handler ────────────────────────────────────── */
    const isMatchCompleted = match?.status === "completed";
    useEffect(() => {
        // canEdit = !isCompleted || isEditingTags — compute inline to avoid hooks-after-return issue
        const canEditNow = !isMatchCompleted || isEditingTags;
        if (!canEditNow) return;
        const handler = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input/textarea
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

            const key = e.key.toLowerCase();
            const eventType = shortcutKeyMap[key];
            if (eventType) {
                e.preventDefault();
                e.stopPropagation();
                setSelectedEventType(eventType);
                setSelectedOutcome(OUTCOMES[eventType]?.[0] ?? "Successful");
                if (!editingEventId) {
                    setPendingOrigin(null);
                    setPendingDestination(null);
                    setClickMode("origin");
                }
            }
        };
        window.addEventListener("keydown", handler, true);
        return () => window.removeEventListener("keydown", handler, true);
    }, [shortcutKeyMap, isMatchCompleted, isEditingTags, editingEventId]);

    /* ── Tab state ────────────────────────────────────────────────────── */
    const [activePanel, setActivePanel] = useState<"events" | "timeline">("events");

    /* ── YouTube IFrame API ────────────────────────────────────────── */
    useEffect(() => {
        if (!match?.youtubeVideoId) return;
        let cancelled = false;

        const initPlayer = () => {
            if (cancelled || !ytContainerRef.current) return;
            // Clear container and create a target div for the player
            const target = document.createElement("div");
            ytContainerRef.current.innerHTML = "";
            ytContainerRef.current.appendChild(target);

            playerRef.current = new (window as any).YT.Player(target, {
                videoId: match.youtubeVideoId,
                width: "100%",
                height: "100%",
                playerVars: { rel: 0, modestbranding: 1 },
                events: {
                    onReady: () => { if (!cancelled) setPlayerReady(true); },
                },
            });
        };

        if ((window as any).YT?.Player) {
            initPlayer();
        } else {
            if (!document.getElementById("yt-api-script")) {
                const tag = document.createElement("script");
                tag.id = "yt-api-script";
                tag.src = "https://www.youtube.com/iframe_api";
                document.head.appendChild(tag);
            }
            (window as any).onYouTubeIframeAPIReady = initPlayer;
        }

        return () => {
            cancelled = true;
            setPlayerReady(false);
            if (playerRef.current?.destroy) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [match?.youtubeVideoId]);

    /* ── Loading ──────────────────────────────────────────────────────── */
    if (match === undefined || user === undefined) {
        return (
            <div className="flex items-center justify-center h-screen">
                <svg className="animate-spin h-8 w-8 text-[#3B82F6]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            </div>
        );
    }

    if (!match) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p className="text-white/40">Match not found</p>
                <button onClick={() => router.back()} className="text-sm text-[#3B82F6] hover:underline cursor-pointer">Go back</button>
            </div>
        );
    }

    const isCompleted = match.status === "completed";
    const canEdit = !isCompleted || isEditingTags;
    const engineFailed = engineJob?.status === "failed";
    const engineFailedMessage = engineJob?.error?.message ?? "Unknown error";

    /* ── Handlers ─────────────────────────────────────────────────────── */
    const handlePitchClick = (x: number, y: number) => {
        if (clickMode === "origin") {
            setPendingOrigin({ x, y });
            if (needsDestination) {
                setClickMode("destination");
            } else {
                setPendingDestination(null);
                setClickMode(null);
            }
        } else if (clickMode === "destination") {
            setPendingDestination({ x, y });
            setClickMode(null);
        }
    };

    const handleLogEvent = async () => {
        if (!pendingOrigin || !match.playerId) return;
        setLogLoading(true);
        try {
            if (editingEventId) {
                // ── Update existing event ──
                await updateEvent({
                    eventId: editingEventId as Id<"analysisEvents">,
                    eventType: selectedEventType,
                    outcome: selectedOutcome,
                    originX: pendingOrigin.x,
                    originY: pendingOrigin.y,
                    destinationX: needsDestination ? pendingDestination?.x : undefined,
                    destinationY: needsDestination ? pendingDestination?.y : undefined,
                    notes: eventNotes || undefined,
                    isSetPiece,
                    bodyPart: HAS_BODY_PART.has(selectedEventType) ? bodyPart : undefined,
                });
                setEditingEventId(null);
            } else {
                // ── Create new event ──
                // Set match to "in progress" if it's still "assigned"
                if (match.status === "analyst_assigned") {
                    await updateMatchStatus({ matchId, status: "analysis_in_progress" });
                }

                // Auto-capture timestamp: current video position minus 5 seconds
                let videoTimestamp = 0;
                if (playerRef.current?.getCurrentTime) {
                    videoTimestamp = Math.max(0, Math.floor(playerRef.current.getCurrentTime()) - 5);
                }

                await logEvent({
                    matchId,
                    playerId: match.playerId as Id<"users">,
                    eventType: selectedEventType,
                    outcome: selectedOutcome,
                    originX: pendingOrigin.x,
                    originY: pendingOrigin.y,
                    destinationX: needsDestination ? pendingDestination?.x : undefined,
                    destinationY: needsDestination ? pendingDestination?.y : undefined,
                    videoTimestamp,
                    notes: eventNotes || undefined,
                    isSetPiece,
                    bodyPart: HAS_BODY_PART.has(selectedEventType) ? bodyPart : undefined,
                });
            }

            // Reset
            setPendingOrigin(null);
            setPendingDestination(null);
            setEventNotes("");
            setIsSetPiece(false);
            setBodyPart("foot");
            setClickMode("origin");
        } catch {
            /* silent */
        }
        setLogLoading(false);
    };

    const handleEditEvent = (ev: any) => {
        setEditingEventId(ev._id);
        setSelectedEventType(ev.eventType);
        setSelectedOutcome(ev.outcome);
        setPendingOrigin({ x: ev.originX, y: ev.originY });
        setPendingDestination(
            ev.destinationX !== undefined && ev.destinationY !== undefined
                ? { x: ev.destinationX, y: ev.destinationY }
                : null
        );
        setEventNotes(ev.notes ?? "");
        setIsSetPiece(ev.isSetPiece ?? false);
        setBodyPart(ev.bodyPart === "head" ? "head" : "foot");
        setClickMode(null);

        // Jump to the event's timestamp in the YouTube player
        if (playerRef.current?.seekTo && typeof ev.videoTimestamp === "number") {
            playerRef.current.seekTo(ev.videoTimestamp, true);
        }
    };

    const handleCancelEdit = () => {
        setEditingEventId(null);
        setPendingOrigin(null);
        setPendingDestination(null);
        setEventNotes("");
        setIsSetPiece(false);
        setBodyPart("foot");
        setClickMode("origin");
    };

    const handleDeleteEvent = async (eventId: Id<"analysisEvents">) => {
        try {
            await deleteEvent({ eventId });
        } catch {
            /* silent */
        }
    };

    const handleSubmitSummary = async () => {
        if (!strengths || !weaknesses || !writtenSummary) return;
        setSummaryLoading(true);
        setEngineError(null);

        try {
            // Step 1: Prepare job payload via Convex (doesn't finalize anything yet)
            if (!match.playerId || !match.analystId) {
                setEngineError("Match is missing player or analyst data. Cannot submit.");
                setSummaryLoading(false);
                return;
            }

            let payload: any = null;
            try {
                payload = await getAndQueueEngineJob({
                    matchId,
                    playerId: match.playerId as Id<"users">,
                    analystId: match.analystId as Id<"users">,
                });
            } catch (err: any) {
                setEngineError("Failed to prepare engine job: " + (err?.message || "Unknown error"));
                setSummaryLoading(false);
                return;
            }

            // Step 2: Send to local Python Engine via proxy
            try {
                const res = await fetch("/api/engine/proxy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) {
                    const errText = await res.text();
                    setEngineError(`Engine rejected the job (${res.status}): ${errText}`);
                    setSummaryLoading(false);
                    return;
                }
            } catch (err: any) {
                setEngineError("Could not reach the local engine. Is it running on port 8080? Error: " + (err?.message || "Network error"));
                setSummaryLoading(false);
                return;
            }

            // Step 3: Engine accepted — now safe to finalize the analysis
            await createSummary({
                matchId,
                overallRating,
                strengths: strengths.split(",").map((s) => s.trim()).filter(Boolean),
                weaknesses: weaknesses.split(",").map((s) => s.trim()).filter(Boolean),
                positionProfile: [],
                writtenSummary,
            });

            setShowSummary(false);
        } catch (err: any) {
            setEngineError("Unexpected error: " + (err?.message || "Please try again."));
        }
        setSummaryLoading(false);
    };

    const handleResubmitEngine = async () => {
        if (!match.playerId || !match.analystId) return;
        setResubmitLoading(true);
        setEngineError(null);
        try {
            const payload = await getAndQueueEngineJob({
                matchId,
                playerId: match.playerId as Id<"users">,
                analystId: match.analystId as Id<"users">,
            });
            const res = await fetch("/api/engine/proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const errText = await res.text();
                setEngineError(`Engine rejected the job (${res.status}): ${errText}`);
            }
        } catch (err: any) {
            setEngineError("Could not reach the local engine. Is it running? Error: " + (err?.message || "Network error"));
        }
        setResubmitLoading(false);
    };

    const eventColors: Record<string, string> = {};
    EVENT_TYPES.forEach((e) => { eventColors[e.value] = e.color; });

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {/* ── Top Bar ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-[#0d0d14] shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/dashboard/${user?.role ?? "analyst"}`)}
                        className="text-white/40 hover:text-white transition-colors cursor-pointer"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-sm font-semibold text-white">
                            {match.opponentName ? `vs ${match.opponentName}` : "Match Analysis"}
                        </h1>
                        <p className="text-[11px] text-white/30">
                            {events?.length ?? 0} events logged
                            {isCompleted && " · ✅ Completed"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isCompleted && !existingSummary && (events?.length ?? 0) > 0 && (
                        <button
                            onClick={() => setShowSummary(true)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#0A0A0F] bg-[#00FF87] hover:bg-[#00FF87]/90 transition-all cursor-pointer"
                        >
                            Complete Analysis
                        </button>
                    )}
                    {isCompleted && engineFailed && (
                        <button
                            onClick={handleResubmitEngine}
                            disabled={resubmitLoading}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#3B82F6]/90 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {resubmitLoading ? "Re-submitting…" : "Re-submit to Engine"}
                        </button>
                    )}
                    <button
                        onClick={() => setShowGuidelines(true)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/50 bg-white/[0.03] border border-white/[0.06] hover:bg-white/5 hover:text-white/70 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                        Guidelines
                    </button>
                    {canEdit && (
                        <button
                            onClick={() => setShowShortcutConfig(true)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/50 bg-white/[0.03] border border-white/[0.06] hover:bg-white/5 hover:text-white/70 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="6" y1="8" x2="6.01" y2="8" /><line x1="10" y1="8" x2="10.01" y2="8" /><line x1="14" y1="8" x2="14.01" y2="8" /><line x1="18" y1="8" x2="18.01" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                            Shortcuts
                        </button>
                    )}
                    <button
                        onClick={() => setShowEngineLogs(!showEngineLogs)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/50 bg-white/[0.03] border border-white/[0.06] hover:bg-white/5 hover:text-white/70 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                        Logs
                    </button>
                    <a
                        href={match.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/30 hover:text-white/60 transition-colors p-2"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                    </a>
                </div>
            </div>

            {/* ── Main Layout ─────────────────────────────────────────── */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Video Space & Event Logger */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0F]">
                    {/* Engine Failure Banner */}
                    {engineFailed && (
                        <div className="mx-4 mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                            <span className="text-lg shrink-0">⚠</span>
                            <div className="flex-1">
                                <p className="font-semibold mb-1">Engine analysis failed</p>
                                <p className="text-red-400/70 text-xs">{engineFailedMessage}</p>
                                <p className="text-red-400/50 text-[10px] mt-1">You can edit your tags below and re-submit to the engine.</p>
                            </div>
                        </div>
                    )}

                    {/* Re-submit error from retry */}
                    {engineError && isCompleted && (
                        <div className="mx-4 mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                            <p className="font-semibold mb-1">⚠ Re-submit failed</p>
                            <p className="text-red-400/80">{engineError}</p>
                        </div>
                    )}

                    {/* Video Embed */}
                    <div className="flex-1 p-4 lg:p-6 flex items-center justify-center overflow-auto min-h-[400px]">
                        <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl">
                            <div ref={ytContainerRef} className="w-full h-full" />
                        </div>
                    </div>

                    {/* Logger Panel (Bottom) */}
                    {canEdit && (
                        <div className="shrink-0 border-t border-white/[0.06] bg-[#0d0d14] p-4 lg:p-6 overflow-y-auto w-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                                {/* Column 1: Event Type */}
                                <div>
                                    <label className="block text-xs font-medium text-white/50 mb-3">Event Type</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {EVENT_TYPES.map((et) => (
                                            <button
                                                key={et.value}
                                                onClick={() => {
                                                    setSelectedEventType(et.value);
                                                    setSelectedOutcome(OUTCOMES[et.value]?.[0] ?? "Successful");
                                                    // Auto-activate origin mode so user can immediately click the pitch
                                                    if (!editingEventId) {
                                                        setPendingOrigin(null);
                                                        setPendingDestination(null);
                                                        setClickMode("origin");
                                                    }
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${selectedEventType === et.value
                                                    ? "border-white/20 shadow-sm"
                                                    : "border-transparent hover:bg-white/5"
                                                    }`}
                                                style={{
                                                    backgroundColor: selectedEventType === et.value ? `${et.color}20` : "",
                                                    color: selectedEventType === et.value ? et.color : "rgba(255,255,255,0.5)",
                                                }}
                                            >
                                                {et.label}
                                                {customShortcuts[et.value] && (
                                                    <span className="ml-1.5 px-1 py-0.5 rounded text-[8px] font-bold uppercase bg-white/10 text-white/40">
                                                        {customShortcuts[et.value]}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {editingEventId && (
                                        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2" className="shrink-0">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                            <span className="text-[11px] text-yellow-400/90 font-medium">Editing event</span>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="ml-auto text-[10px] text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}

                                    {!editingEventId && (
                                        <div className="mt-5 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#3B82F6]/5 border border-[#3B82F6]/15">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" className="shrink-0">
                                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                            </svg>
                                            <span className="text-[11px] text-[#3B82F6]/80">Timestamp auto-captured from video (−5s)</span>
                                        </div>
                                    )}

                                    {/* Contextual guideline hint */}
                                    {GUIDELINES[selectedEventType] && (
                                        <button
                                            onClick={() => setShowGuidelines(true)}
                                            className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-all cursor-pointer text-left group"
                                        >
                                            <span className="text-[10px] shrink-0">💡</span>
                                            <span className="text-[10px] text-white/35 group-hover:text-white/50 transition-colors leading-tight">
                                                {GUIDELINES[selectedEventType].hint}
                                            </span>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20 group-hover:text-white/40 transition-colors ml-auto shrink-0">
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </button>
                                    )}
                                    
                                    <div className="flex items-center justify-between mt-5 w-48">
                                        <label className="block text-xs font-medium text-white/50">Is this a Set Piece?</label>
                                        <button
                                            onClick={() => setIsSetPiece(!isSetPiece)}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${isSetPiece
                                                ? "bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/30"
                                                : "bg-white/[0.03] text-white/40 border-transparent hover:bg-white/5"
                                            }`}
                                        >
                                            {isSetPiece ? "Yes" : "No"}
                                        </button>
                                    </div>

                                    {HAS_BODY_PART.has(selectedEventType) && (
                                        <div className="flex items-center justify-between mt-3 w-48">
                                            <label className="block text-xs font-medium text-white/50">Body Part</label>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => setBodyPart("foot")}
                                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${bodyPart === "foot"
                                                        ? "bg-[#00FF87]/10 text-[#00FF87] border-[#00FF87]/30"
                                                        : "bg-white/[0.03] text-white/40 border-transparent hover:bg-white/5"
                                                    }`}
                                                >
                                                    🦶 Foot
                                                </button>
                                                <button
                                                    onClick={() => setBodyPart("head")}
                                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${bodyPart === "head"
                                                        ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30"
                                                        : "bg-white/[0.03] text-white/40 border-transparent hover:bg-white/5"
                                                    }`}
                                                >
                                                    🗣️ Head
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Column 2: Outcome & Pitch Controls */}
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 mb-3">Outcome</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(OUTCOMES[selectedEventType] ?? []).map((o) => (
                                                <button
                                                    key={o}
                                                    onClick={() => setSelectedOutcome(o)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${selectedOutcome === o
                                                        ? "bg-white/10 text-white font-medium"
                                                        : "bg-white/[0.03] text-white/40 hover:bg-white/5"
                                                        }`}
                                                >
                                                    {o}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-white/50 mb-2">Position on Pitch</label>
                                        <div className="flex flex-col xl:flex-row gap-2">
                                            <button
                                                onClick={() => {
                                                    setPendingOrigin(null);
                                                    setPendingDestination(null);
                                                    setClickMode("origin");
                                                }}
                                                className={`flex-1 px-3 py-2 text-center rounded-lg text-xs transition-all cursor-pointer border ${clickMode === "origin"
                                                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30 animate-pulse"
                                                        : pendingOrigin
                                                            ? "bg-[#00FF87]/10 text-[#00FF87] border-[#00FF87]/30"
                                                            : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:bg-white/5"
                                                    }`}
                                            >
                                                {pendingOrigin ? `Origin: ${pendingOrigin.x.toFixed(0)}%, ${pendingOrigin.y.toFixed(0)}%` : "Set Origin"}
                                            </button>
                                            {needsDestination && (
                                                <button
                                                    onClick={() => setClickMode("destination")}
                                                    disabled={!pendingOrigin}
                                                    className={`flex-1 px-3 py-2 text-center rounded-lg text-xs transition-all cursor-pointer border ${clickMode === "destination"
                                                            ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30 animate-pulse"
                                                            : pendingDestination
                                                                ? "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30"
                                                                : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:bg-white/5 disabled:opacity-30"
                                                        }`}
                                                >
                                                    {pendingDestination ? `Dest: ${pendingDestination.x.toFixed(0)}%, ${pendingDestination.y.toFixed(0)}%` : "Set Destination"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Column 3 & 4: Notes and Submit */}
                                <div className="lg:col-span-2 flex flex-col h-full">
                                    <label className="block text-xs font-medium text-white/50 mb-3">Notes (optional)</label>
                                    <textarea
                                        value={eventNotes}
                                        onChange={(e) => setEventNotes(e.target.value)}
                                        placeholder="e.g. Great through ball to striker"
                                        className="w-full flex-1 min-h-[80px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#3B82F6]/50 transition-all resize-none mb-4"
                                    />
                                    <div className="flex gap-2">
                                        {editingEventId && (
                                            <button
                                                onClick={handleCancelEdit}
                                                className="px-4 py-3 shrink-0 rounded-xl font-medium text-sm text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            onClick={handleLogEvent}
                                            disabled={!pendingOrigin || logLoading}
                                            className={`flex-1 py-3 shrink-0 rounded-xl font-semibold text-sm transition-all hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.97] ${
                                                editingEventId
                                                    ? "text-[#0A0A0F] bg-yellow-400 hover:bg-yellow-400/90 hover:shadow-yellow-400/25"
                                                    : "text-[#0A0A0F] bg-[#00FF87] hover:bg-[#00FF87]/90 hover:shadow-[#00FF87]/25"
                                            }`}
                                        >
                                            {logLoading
                                                ? (editingEventId ? "Updating..." : "Logging...")
                                                : (editingEventId ? "Update Event" : "Log Event")
                                            }
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {isCompleted && !isEditingTags && (
                        <div className="shrink-0 border-t border-white/[0.06] bg-[#0d0d14] p-4 flex items-center justify-center w-full gap-4">
                            <div className="text-center">
                                <span className="text-lg mb-1 block">✅</span>
                                <p className="text-sm font-medium text-white/80">Analysis Complete</p>
                            </div>
                            <button
                                onClick={() => setIsEditingTags(true)}
                                className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                            >
                                Edit Tags
                            </button>
                            {engineFailed && (
                                <button
                                    onClick={handleResubmitEngine}
                                    disabled={resubmitLoading}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#3B82F6]/90 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {resubmitLoading ? "Re-submitting…" : "Re-submit to Engine"}
                                </button>
                            )}
                        </div>
                    )}
                    {isEditingTags && (
                        <div className="shrink-0 border-t border-white/[0.06] bg-[#0d0d14] px-4 py-2 flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-yellow-400/80 font-medium">✏️ Editing tags</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleResubmitEngine}
                                    disabled={resubmitLoading}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#3B82F6]/90 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {resubmitLoading ? "Re-submitting…" : "Re-submit to Engine"}
                                </button>
                                <button
                                    onClick={() => setIsEditingTags(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                                >
                                    Done Editing
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Pitch & Timeline */}
                <div className="w-[380px] lg:w-[420px] 2xl:w-[480px] border-l border-white/[0.06] flex flex-col bg-[#0d0d14] shrink-0">
                    {/* Pitch Map Section */}
                    <div className="p-4 border-b border-white/[0.06] shrink-0">
                        <PitchMap
                            events={events ?? []}
                            onPitchClick={handlePitchClick}
                            clickMode={clickMode}
                            pendingOrigin={pendingOrigin}
                            pendingDestination={pendingDestination}
                        />
                        <div className="flex flex-wrap gap-2 mt-4">
                            {EVENT_TYPES.map((et) => {
                                const count = events?.filter((e) => e.eventType === et.value).length ?? 0;
                                if (count === 0) return null;
                                return (
                                    <span key={et.value} className="flex items-center gap-1 text-[10px] text-white/40">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: et.color }} />
                                        {et.label} ({count})
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Timeline Header */}
                    <div className="px-5 py-3 border-b border-white/[0.06] shrink-0 flex items-center justify-between bg-white/[0.01]">
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Timeline</span>
                        <span className="text-xs font-medium text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded-full">{events?.length ?? 0} events</span>
                    </div>

                    {/* Timeline List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {!events || events.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-3xl mb-2 opacity-50">📋</div>
                                <p className="text-xs text-white/30">No events logged yet</p>
                            </div>
                        ) : (
                            [...events].reverse().map((ev) => {
                                const color = eventColors[ev.eventType] ?? "#fff";
                                return (
                                    <div
                                        key={ev._id}
                                        className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all group"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-2">
                                                <div
                                                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <div>
                                                    <p className="text-xs font-medium text-white capitalize flex items-center">
                                                        {ev.eventType.replace("_", " ")}
                                                        <span className="text-white/40 font-normal mx-1.5">· {ev.outcome}</span>
                                                        {ev.isSetPiece && (
                                                            <span className="text-[#A855F7] font-medium ml-1 text-[9px] uppercase tracking-wider bg-[#A855F7]/15 px-1.5 py-0.5 rounded">
                                                                Set Piece
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-[10px] text-white/25 mt-0.5">
                                                        {formatTimestamp(ev.videoTimestamp)} · ({ev.originX.toFixed(0)}, {ev.originY.toFixed(0)})
                                                        {ev.destinationX !== undefined && ` → (${ev.destinationX.toFixed(0)}, ${ev.destinationY?.toFixed(0)})`}
                                                    </p>
                                                    {ev.notes && (
                                                        <p className="text-[10px] text-white/30 mt-1 italic">{ev.notes}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {canEdit && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => handleEditEvent(ev)}
                                                        className={`p-1 transition-all cursor-pointer ${
                                                            editingEventId === ev._id
                                                                ? "text-yellow-400"
                                                                : "text-white/30 hover:text-[#3B82F6]"
                                                        }`}
                                                        title="Edit event"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteEvent(ev._id as Id<"analysisEvents">)}
                                                        className="text-red-400/60 hover:text-red-400 transition-all cursor-pointer p-1"
                                                        title="Delete event"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* ── Guidelines Drawer ──────────────────────────────────────── */}
            {showGuidelines && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGuidelines(false)} />
                    <div className="relative w-full max-w-[540px] bg-[#0d0d14] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-white">Tagger Guidelines</h2>
                                    <p className="text-[10px] text-white/30">StatsBomb-compatible tagging reference</p>
                                </div>
                            </div>
                            <button onClick={() => setShowGuidelines(false)} className="text-white/40 hover:text-white transition-colors cursor-pointer p-1">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                            {/* General Rules */}
                            <div>
                                <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                                    General Rules
                                </h3>
                                <ul className="space-y-2">
                                    {GENERAL_RULES.map((rule, i) => (
                                        <li key={i} className="text-[11px] text-white/50 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-white/20">
                                            {rule}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="border-t border-white/[0.04]" />

                            {/* Per-event guidelines */}
                            {EVENT_TYPES.map((et) => {
                                const g = GUIDELINES[et.value];
                                if (!g) return null;
                                const isActive = selectedEventType === et.value;
                                return (
                                    <div
                                        key={et.value}
                                        className={`rounded-xl border transition-all ${isActive
                                            ? "border-white/10 bg-white/[0.02]"
                                            : "border-transparent"
                                        }`}
                                        style={isActive ? { borderColor: `${et.color}25` } : {}}
                                    >
                                        <div className={`${isActive ? "px-4 py-4" : "py-3"}`}>
                                            {/* Event title */}
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: et.color }} />
                                                <h4 className="text-xs font-bold text-white">{et.label}</h4>
                                                {isActive && (
                                                    <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-white/40 ml-auto">SELECTED</span>
                                                )}
                                            </div>

                                            {/* Tag when */}
                                            <p className="text-[11px] text-white/40 mb-3 leading-relaxed">
                                                <span className="text-white/60 font-semibold">Tag when: </span>
                                                {g.tagWhen}
                                            </p>

                                            {/* Required fields */}
                                            <div className="mb-3">
                                                <p className="text-[10px] font-semibold text-[#00FF87]/70 uppercase tracking-wider mb-1.5">Required</p>
                                                <ul className="space-y-1">
                                                    {g.requiredFields.map((f, i) => (
                                                        <li key={i} className="text-[10px] text-white/40 leading-relaxed pl-3 relative before:content-['✓'] before:absolute before:left-0 before:text-[#00FF87]/50 before:text-[9px]">
                                                            {f}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Do not tag */}
                                            {g.doNotTag.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-semibold text-red-400/70 uppercase tracking-wider mb-1.5">Do Not Tag</p>
                                                    <ul className="space-y-1">
                                                        {g.doNotTag.map((d, i) => (
                                                            <li key={i} className="text-[10px] text-white/35 leading-relaxed pl-3 relative before:content-['✗'] before:absolute before:left-0 before:text-red-400/50 before:text-[9px]">
                                                                {d}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* Separator between events */}
                                        {!isActive && <div className="border-b border-white/[0.03]" />}
                                    </div>
                                );
                            })}

                            <div className="border-t border-white/[0.04]" />

                            {/* Common Mistakes Table */}
                            <div>
                                <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                                    Common Mistakes to Avoid
                                </h3>
                                <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                                    <table className="w-full text-[10px]">
                                        <thead>
                                            <tr className="bg-white/[0.03]">
                                                <th className="text-left text-white/50 font-semibold px-3 py-2 border-b border-white/[0.06]">Situation</th>
                                                <th className="text-left text-red-400/60 font-semibold px-3 py-2 border-b border-white/[0.06]">❌ Wrong</th>
                                                <th className="text-left text-[#00FF87]/60 font-semibold px-3 py-2 border-b border-white/[0.06]">✅ Right</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {COMMON_MISTAKES.map((m, i) => (
                                                <tr key={i} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-3 py-2.5 text-white/45 leading-tight">{m.situation}</td>
                                                    <td className="px-3 py-2.5 text-red-400/50 leading-tight">{m.wrong}</td>
                                                    <td className="px-3 py-2.5 text-[#00FF87]/50 leading-tight">{m.right}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Summary Modal ────────────────────────────────────────── */}
            {showSummary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowSummary(false)} />
                    <div className="relative w-full max-w-lg bg-[#12121a] border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white">Complete Analysis</h2>
                            <button onClick={() => setShowSummary(false)} className="text-white/40 hover:text-white transition-colors cursor-pointer">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Overall Rating */}
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-2">Overall Rating: <span className="text-[#00FF87] font-bold">{overallRating}/10</span></label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={overallRating}
                                    onChange={(e) => setOverallRating(Number(e.target.value))}
                                    className="w-full accent-[#00FF87]"
                                />
                                <div className="flex justify-between text-[10px] text-white/20 mt-1">
                                    <span>Poor</span><span>Average</span><span>Excellent</span>
                                </div>
                            </div>

                            {/* Strengths */}
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1.5">Strengths</label>
                                <input
                                    type="text"
                                    value={strengths}
                                    onChange={(e) => setStrengths(e.target.value)}
                                    placeholder="Passing accuracy, Vision, Work rate"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00FF87]/50 transition-all"
                                />
                                <p className="text-[10px] text-white/20 mt-1">Comma-separated</p>
                            </div>

                            {/* Weaknesses */}
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1.5">Weaknesses</label>
                                <input
                                    type="text"
                                    value={weaknesses}
                                    onChange={(e) => setWeaknesses(e.target.value)}
                                    placeholder="Aerial duels, Defensive positioning"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00FF87]/50 transition-all"
                                />
                                <p className="text-[10px] text-white/20 mt-1">Comma-separated</p>
                            </div>

                            {/* Written Summary */}
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1.5">Written Summary</label>
                                <textarea
                                    value={writtenSummary}
                                    onChange={(e) => setWrittenSummary(e.target.value)}
                                    rows={5}
                                    placeholder="Detailed analysis of the player's performance..."
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00FF87]/50 transition-all resize-none"
                                />
                            </div>

                            {/* Engine Error */}
                            {engineError && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                                    <p className="font-semibold mb-1">⚠ Could not submit — your work is safe</p>
                                    <p className="text-red-400/80">{engineError}</p>
                                </div>
                            )}

                            {/* Submit */}
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowSummary(false)} className="flex-1 py-3 rounded-xl font-medium text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">Cancel</button>
                                <button
                                    onClick={handleSubmitSummary}
                                    disabled={summaryLoading || !strengths || !weaknesses || !writtenSummary}
                                    className="flex-1 py-3 rounded-xl font-semibold text-[#0A0A0F] bg-[#00FF87] hover:bg-[#00FF87]/90 transition-all hover:shadow-lg hover:shadow-[#00FF87]/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {summaryLoading ? "Submitting..." : "Submit & Complete"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Keyboard Shortcuts Config Modal ──────────────────────── */}
            {showShortcutConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowShortcutConfig(false)} />
                    <div className="relative w-full max-w-md bg-[#12121a] border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
                                <p className="text-[10px] text-white/30 mt-0.5">Press a key to assign it. YouTube shortcuts are blocked.</p>
                            </div>
                            <button onClick={() => { setShowShortcutConfig(false); setShortcutEditKey(null); setShortcutError(null); }} className="text-white/40 hover:text-white transition-colors cursor-pointer">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        {shortcutError && (
                            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                {shortcutError}
                            </div>
                        )}

                        <div className="space-y-2">
                            {EVENT_TYPES.map((et) => {
                                const currentKey = customShortcuts[et.value] ?? "";
                                const isEditing = shortcutEditKey === et.value;
                                return (
                                    <div
                                        key={et.value}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                            isEditing
                                                ? "border-[#3B82F6]/40 bg-[#3B82F6]/5"
                                                : "border-white/[0.06] bg-white/[0.02]"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: et.color }} />
                                            <span className="text-xs font-medium text-white">{et.label}</span>
                                        </div>
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-[#3B82F6] animate-pulse">Press a key...</span>
                                                <button
                                                    onClick={() => { setShortcutEditKey(null); setShortcutError(null); }}
                                                    className="text-[10px] text-white/40 hover:text-white/60 cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { setShortcutEditKey(et.value); setShortcutError(null); }}
                                                className="px-2 py-1 rounded-lg text-[11px] font-bold uppercase bg-white/10 text-white/60 hover:bg-white/15 transition-all cursor-pointer min-w-[32px] text-center"
                                            >
                                                {currentKey || "—"}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Capture keydown when editing */}
                        {shortcutEditKey && (
                            <div
                                tabIndex={0}
                                ref={(el) => el?.focus()}
                                onKeyDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const key = e.key.toLowerCase();
                                    
                                    // Check YouTube reserved keys
                                    if (YOUTUBE_RESERVED_KEYS.has(key)) {
                                        setShortcutError(`"${e.key}" is reserved by YouTube and cannot be used.`);
                                        return;
                                    }

                                    // Check if already assigned to another event type
                                    const existingEvent = Object.entries(customShortcuts).find(
                                        ([evType, k]) => k.toLowerCase() === key && evType !== shortcutEditKey
                                    );
                                    if (existingEvent) {
                                        const existingLabel = EVENT_TYPES.find((et) => et.value === existingEvent[0])?.label ?? existingEvent[0];
                                        setShortcutError(`"${e.key}" is already assigned to ${existingLabel}.`);
                                        return;
                                    }

                                    const updated = { ...customShortcuts, [shortcutEditKey!]: key };
                                    setCustomShortcuts(updated);
                                    setShortcutEditKey(null);
                                    setShortcutError(null);
                                    // Persist
                                    saveShortcutsMutation({ shortcuts: updated });
                                }}
                                className="fixed inset-0 z-[60] bg-transparent focus:outline-none"
                                style={{ pointerEvents: "all" }}
                            />
                        )}

                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={() => {
                                    setCustomShortcuts(DEFAULT_SHORTCUTS);
                                    saveShortcutsMutation({ shortcuts: DEFAULT_SHORTCUTS });
                                }}
                                className="flex-1 py-2 rounded-xl text-xs font-medium text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                            >
                                Reset to Defaults
                            </button>
                            <button
                                onClick={() => { setShowShortcutConfig(false); setShortcutEditKey(null); setShortcutError(null); }}
                                className="flex-1 py-2 rounded-xl text-xs font-semibold text-[#0A0A0F] bg-[#00FF87] hover:bg-[#00FF87]/90 transition-all cursor-pointer"
                            >
                                Done
                            </button>
                        </div>

                        <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                            <p className="text-[10px] text-white/30 leading-relaxed">
                                <span className="text-white/50 font-semibold">YouTube shortcuts are blocked:</span>{" "}
                                Space, K, J, L, F, M, C, T, Arrow keys, 0-9, and others. These will be handled by the video player instead.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Engine Logs Drawer ──────────────────────────────────────── */}
            {showEngineLogs && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEngineLogs(false)} />
                    <div className="relative w-full max-w-[480px] bg-[#0d0d14] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-white">Engine Process Logs</h2>
                                    <p className="text-[10px] text-white/30">Before/after tracking for engine processing</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEngineLogs(false)} className="text-white/40 hover:text-white transition-colors cursor-pointer p-1">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        {/* Match info */}
                        {match && (
                            <div className="px-6 py-3 border-b border-white/[0.06] bg-white/[0.01]">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-white/50">Shirt #</span>
                                    <span className="text-xs font-bold text-[#00FF87]">{match.shirtNumber ?? 5}</span>
                                    {match.playerNote && (
                                        <>
                                            <span className="text-white/20 mx-1">·</span>
                                            <span className="text-xs text-white/40 italic truncate">{match.playerNote}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Log entries */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                            {!engineLogs || engineLogs.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-3xl mb-2 opacity-50">📄</div>
                                    <p className="text-xs text-white/30">No engine logs yet</p>
                                    <p className="text-[10px] text-white/20 mt-1">Logs will appear after you submit the analysis to the engine</p>
                                </div>
                            ) : (
                                engineLogs.map((log: any) => {
                                    const statusColors: Record<string, string> = {
                                        started: "#3B82F6",
                                        completed: "#22C55E",
                                        failed: "#EF4444",
                                    };
                                    const color = statusColors[log.status] ?? "#fff";
                                    return (
                                        <div key={log._id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                                    <span className="text-xs font-medium text-white">{log.step}</span>
                                                </div>
                                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
                                                    {log.status.toUpperCase()}
                                                </span>
                                            </div>
                                            {log.inputSummary && (
                                                <div className="mb-1.5">
                                                    <span className="text-[9px] text-white/30 font-semibold uppercase">Input: </span>
                                                    <span className="text-[10px] text-white/50">{log.inputSummary}</span>
                                                </div>
                                            )}
                                            {log.outputSummary && (
                                                <div className="mb-1.5">
                                                    <span className="text-[9px] text-[#00FF87]/50 font-semibold uppercase">Output: </span>
                                                    <span className="text-[10px] text-white/50">{log.outputSummary}</span>
                                                </div>
                                            )}
                                            {log.details && (
                                                <p className="text-[10px] text-white/35 italic">{log.details}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[9px] text-white/20">
                                                    {new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                                </span>
                                                {log.durationMs !== undefined && (
                                                    <span className="text-[9px] text-white/30">
                                                        {log.durationMs}ms
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

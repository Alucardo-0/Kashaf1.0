"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ── Data for dropdowns ─────────────────────────────────────────────── */
const POSITIONS = [
    "Goalkeeper", "Centre-Back", "Left-Back", "Right-Back",
    "Defensive Midfielder", "Central Midfielder", "Attacking Midfielder",
    "Left Winger", "Right Winger", "Striker", "Second Striker",
];

const NATIONALITIES = [
    "Algeria", "Argentina", "Australia", "Belgium", "Brazil", "Cameroon",
    "Canada", "Chile", "China", "Colombia", "Croatia", "Czech Republic",
    "Denmark", "Ecuador", "Egypt", "England", "Ethiopia", "Finland",
    "France", "Germany", "Ghana", "Greece", "Hungary", "India",
    "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
    "Ivory Coast", "Japan", "Kenya", "Mali", "Mexico", "Morocco",
    "Netherlands", "Nigeria", "Norway", "Paraguay", "Peru", "Poland",
    "Portugal", "Romania", "Russia", "Saudi Arabia", "Scotland",
    "Senegal", "Serbia", "South Africa", "South Korea", "Spain",
    "Sweden", "Switzerland", "Tunisia", "Turkey", "Ukraine",
    "United States", "Uruguay", "Venezuela", "Wales",
];

const LANGUAGES = [
    "English", "Spanish", "French", "Portuguese", "German",
    "Italian", "Arabic", "Turkish", "Dutch", "Russian",
    "Japanese", "Korean", "Chinese", "Hindi", "Swahili",
];

const CERTIFICATIONS = [
    "UEFA Pro License", "UEFA A License", "UEFA B License",
    "FA Level 3", "FA Level 2", "CONMEBOL Pro",
    "Sports Science Degree", "Performance Analysis Diploma",
    "InStat Certified", "Hudl Certified", "Wyscout Certified",
    "Other",
];

const LEAGUE_LEVELS = [
    "1st Division / Top Flight", "2nd Division",
    "3rd Division", "4th Division / Semi-Pro",
    "Youth / Academy", "Women's Top Flight",
    "Women's Lower Division", "College / University",
];

/* ── Shared input component ─────────────────────────────────────────── */
function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">{label}</label>
            <input
                {...props}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 focus:ring-1 focus:ring-[#00FF87]/30 transition-all"
            />
        </div>
    );
}

function Select({ label, options, ...props }: { label: string; options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">{label}</label>
            <select
                {...props}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00FF87]/50 focus:ring-1 focus:ring-[#00FF87]/30 transition-all appearance-none"
            >
                <option value="" className="bg-[#12121a]">Select...</option>
                {options.map((opt) => (
                    <option key={opt} value={opt} className="bg-[#12121a]">{opt}</option>
                ))}
            </select>
        </div>
    );
}

function MultiSelect({ label, options, selected, onChange }: {
    label: string;
    options: string[];
    selected: string[];
    onChange: (v: string[]) => void;
}) {
    const toggle = (opt: string) => {
        onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
    };
    return (
        <div>
            <label className="block text-sm font-medium text-white/70 mb-2">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => toggle(opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${selected.includes(opt)
                            ? "bg-[#00FF87]/20 text-[#00FF87] border border-[#00FF87]/40"
                            : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                            }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ── Player Form ────────────────────────────────────────────────────── */
function PlayerForm({ user, onSubmit, loading }: {
    user: { name?: string; email?: string };
    onSubmit: (data: {
        name: string;
        playerProfile: {
            age: number; nationality: string; position: string; secondaryPosition?: string;
            height: number; weight: number; foot: "left" | "right" | "both";
            currentClub?: string; contactWhatsapp?: string; contactEmail?: string; contactAgent?: string;
        };
    }) => void;
    loading: boolean;
}) {
    const [name, setName] = useState(user.name ?? "");
    const [age, setAge] = useState("");
    const [nationality, setNationality] = useState("");
    const [position, setPosition] = useState("");
    const [secondaryPosition, setSecondaryPosition] = useState("");
    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");
    const [foot, setFoot] = useState<"left" | "right" | "both">("right");
    const [currentClub, setCurrentClub] = useState("");
    const [contactWhatsapp, setContactWhatsapp] = useState("");
    const [contactEmail, setContactEmail] = useState(user.email ?? "");
    const [contactAgent, setContactAgent] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name,
            playerProfile: {
                age: parseInt(age),
                nationality,
                position,
                secondaryPosition: secondaryPosition || undefined,
                height: parseInt(height),
                weight: parseInt(weight),
                foot,
                currentClub: currentClub || undefined,
                contactWhatsapp: contactWhatsapp || undefined,
                contactEmail: contactEmail || undefined,
                contactAgent: contactAgent || undefined,
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Full Name *" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your full name" />
                <Input label="Age *" type="number" value={age} onChange={(e) => setAge(e.target.value)} required min={13} max={55} placeholder="e.g. 22" />
            </div>

            <Select label="Nationality *" options={NATIONALITIES} value={nationality} onChange={(e) => setNationality(e.target.value)} required />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Primary Position *" options={POSITIONS} value={position} onChange={(e) => setPosition(e.target.value)} required />
                <Select label="Secondary Position" options={POSITIONS} value={secondaryPosition} onChange={(e) => setSecondaryPosition(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Height (cm) *" type="number" value={height} onChange={(e) => setHeight(e.target.value)} required min={140} max={220} placeholder="e.g. 180" />
                <Input label="Weight (kg) *" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} required min={40} max={130} placeholder="e.g. 75" />
                <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">Preferred Foot *</label>
                    <div className="flex gap-2 pt-1">
                        {(["left", "right", "both"] as const).map((f) => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setFoot(f)}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all cursor-pointer ${foot === f
                                    ? "bg-[#00FF87]/20 text-[#00FF87] border border-[#00FF87]/40"
                                    : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <Input label="Current Club" type="text" value={currentClub} onChange={(e) => setCurrentClub(e.target.value)} placeholder="e.g. FC Barcelona B" />

            {/* Contact Info */}
            <div className="border-t border-white/5 pt-5 mt-5">
                <h3 className="text-sm font-semibold text-white/80 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="WhatsApp" type="tel" value={contactWhatsapp} onChange={(e) => setContactWhatsapp(e.target.value)} placeholder="+1 234 567 8900" />
                    <Input label="Contact Email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="mt-4">
                    <Input label="Agent Name" type="text" value={contactAgent} onChange={(e) => setContactAgent(e.target.value)} placeholder="Agent or representative name" />
                </div>
            </div>

            <SubmitButton loading={loading} text="Complete Profile" />
        </form>
    );
}

/* ── Analyst Form ───────────────────────────────────────────────────── */
function AnalystForm({ user, onSubmit, loading }: {
    user: { name?: string };
    onSubmit: (data: { name: string; analystProfile: { nationality: string; experience: number; certifications: string[]; languages: string[]; bio: string } }) => void;
    loading: boolean;
}) {
    const [name, setName] = useState(user.name ?? "");
    const [nationality, setNationality] = useState("");
    const [experience, setExperience] = useState("");
    const [certifications, setCertifications] = useState<string[]>([]);
    const [languages, setLanguages] = useState<string[]>(["English"]);
    const [bio, setBio] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (languages.length === 0) return;
        onSubmit({
            name,
            analystProfile: {
                nationality,
                experience: parseInt(experience),
                certifications,
                languages,
                bio,
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Full Name *" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your full name" />
                <Select label="Nationality *" options={NATIONALITIES} value={nationality} onChange={(e) => setNationality(e.target.value)} required />
            </div>

            <Input label="Years of Experience *" type="number" value={experience} onChange={(e) => setExperience(e.target.value)} required min={0} max={40} placeholder="e.g. 5" />

            <MultiSelect label="Certifications" options={CERTIFICATIONS} selected={certifications} onChange={setCertifications} />
            <MultiSelect label="Languages *" options={LANGUAGES} selected={languages} onChange={setLanguages} />
            {languages.length === 0 && <p className="text-red-400 text-xs">Select at least one language</p>}

            <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Bio *</label>
                <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    required
                    rows={4}
                    placeholder="Describe your analysis style, experience, and what you offer..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 focus:ring-1 focus:ring-[#00FF87]/30 transition-all resize-none"
                />
            </div>

            <SubmitButton loading={loading} text="Complete Profile" />
        </form>
    );
}

/* ── Scout Form ─────────────────────────────────────────────────────── */
function ScoutForm({ user, onSubmit, loading }: {
    user: { name?: string };
    onSubmit: (data: { name: string; scoutProfile: { clubName: string; country: string; leagueLevel: string; isVerified: boolean; verificationDocId?: any } }) => void;
    loading: boolean;
}) {
    const generateUploadUrl = useMutation(api.users.generateUploadUrl);
    const [name, setName] = useState(user.name ?? "");
    const [clubName, setClubName] = useState("");
    const [country, setCountry] = useState("");
    const [leagueLevel, setLeagueLevel] = useState("");
    const [docFile, setDocFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let verificationDocId: any = undefined;

        if (docFile) {
            setUploading(true);
            try {
                const uploadUrl = await generateUploadUrl();
                const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": docFile.type }, body: docFile });
                const { storageId } = await res.json();
                verificationDocId = storageId;
            } catch { /* proceed without doc */ }
            setUploading(false);
        }

        onSubmit({
            name,
            scoutProfile: {
                clubName,
                country,
                leagueLevel,
                isVerified: false,
                verificationDocId,
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="Full Name *" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your full name" />
            <Input label="Club / Organization *" type="text" value={clubName} onChange={(e) => setClubName(e.target.value)} required placeholder="e.g. Ajax Amsterdam" />
            <Select label="Country *" options={NATIONALITIES} value={country} onChange={(e) => setCountry(e.target.value)} required />
            <Select label="League Level *" options={LEAGUE_LEVELS} value={leagueLevel} onChange={(e) => setLeagueLevel(e.target.value)} required />

            {/* Document Upload */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Verification Document *</label>
                <p className="text-xs text-white/35 mb-3">Upload proof of club employment (contract, ID card, letter). PDF, JPG, PNG accepted.</p>
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/8 transition-all">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#8B5CF6] shrink-0">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="text-sm text-white/60 truncate flex-1">
                        {docFile ? docFile.name : "Choose file..."}
                    </span>
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                        required
                    />
                </label>
            </div>

            {/* Info box */}
            <div className="p-4 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[#8B5CF6] mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <p className="text-sm text-white/60">
                        Your account will be reviewed by our team after you submit your verification document. You&apos;ll gain full access once approved.
                    </p>
                </div>
            </div>

            <SubmitButton loading={loading || uploading} text={uploading ? "Uploading document..." : "Complete Profile"} />
        </form>
    );
}

/* ── Submit button ─────────────────────────────────────────────── */
function SubmitButton({ loading, text }: { loading: boolean; text: string }) {
    return (
        <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-[#0A0A0F] bg-[#00FF87] hover:bg-[#00FF87]/90 transition-all hover:shadow-lg hover:shadow-[#00FF87]/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
        >
            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                </span>
            ) : text}
        </button>
    );
}

/* ── Main Onboarding Page ───────────────────────────────────────────── */
export default function OnboardingPage() {
    const user = useQuery(api.users.getCurrentUser);
    const completePlayer = useMutation(api.users.completePlayerProfile);
    const completeAnalyst = useMutation(api.users.completeAnalystProfile);
    const completeScout = useMutation(api.users.completeScoutProfile);
    const setRole = useMutation(api.users.setUserRole);

    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"role" | "form">(
        "role" // Will be updated once user data loads
    );
    const [selectedRole, setSelectedRole] = useState<"player" | "analyst" | "scout" | null>(null);

    // Redirect if already onboarded
    useEffect(() => {
        if (user?.onboardingComplete) {
            const dashPath =
                user.role === "player" ? "/dashboard/player"
                    : user.role === "analyst" ? "/dashboard/analyst"
                        : "/dashboard/scout";
            router.push(dashPath);
        }
    }, [user, router]);

    if (user?.onboardingComplete) {
        return null;
    }

    // Loading state
    if (user === undefined) {
        return (
            <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <svg className="animate-spin h-8 w-8 text-[#00FF87]" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-white/50 text-sm">Loading your profile...</p>
                </div>
            </div>
        );
    }

    // If user has a role already (set during sign-up), skip to form
    const effectiveRole = selectedRole ?? user?.role ?? null;
    const effectiveStep = effectiveRole ? "form" : step;

    const handleRoleSelect = async (role: "player" | "analyst" | "scout") => {
        setSelectedRole(role);
        setStep("form");
        try {
            await setRole({ role });
        } catch {
            // Role will be set during profile completion anyway
        }
    };

    const handlePlayerSubmit = async (data: { name: string; playerProfile: Parameters<typeof completePlayer>[0]["playerProfile"] }) => {
        setError("");
        setLoading(true);
        try {
            await completePlayer(data);
            router.push("/dashboard/player");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setLoading(false);
        }
    };

    const handleAnalystSubmit = async (data: { name: string; analystProfile: Parameters<typeof completeAnalyst>[0]["analystProfile"] }) => {
        setError("");
        setLoading(true);
        try {
            await completeAnalyst(data);
            router.push("/dashboard/analyst");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setLoading(false);
        }
    };

    const handleScoutSubmit = async (data: { name: string; scoutProfile: Parameters<typeof completeScout>[0]["scoutProfile"] }) => {
        setError("");
        setLoading(true);
        try {
            await completeScout(data);
            router.push("/dashboard/scout");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setLoading(false);
        }
    };

    const ROLES = [
        {
            id: "player" as const,
            title: "Football Player",
            desc: "Upload match footage, get professional analysis, and be discovered by scouts.",
            icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2 L14.5 8 L12 12 L9.5 8 Z" />
                    <path d="M22 12 L16 14.5 L12 12 L16 9.5 Z" />
                    <path d="M12 22 L9.5 16 L12 12 L14.5 16 Z" />
                    <path d="M2 12 L8 9.5 L12 12 L8 14.5 Z" />
                </svg>
            ),
            color: "#00FF87",
        },
        {
            id: "analyst" as const,
            title: "Performance Analyst",
            desc: "Analyze player performances, build detailed reports, and earn per match.",
            icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
            ),
            color: "#3B82F6",
        },
        {
            id: "scout" as const,
            title: "Club Scout",
            desc: "Search for talent, filter by position profiles, and access detailed match reports.",
            icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            ),
            color: "#8B5CF6",
        },
    ];

    const roleColor = effectiveRole ? ROLES.find((r) => r.id === effectiveRole)?.color ?? "#00FF87" : "#00FF87";

    return (
        <div className="min-h-screen bg-[#0A0A0F] py-12 px-4">
            <div className="max-w-xl mx-auto">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-[#00FF87]/20">
                            <img src="/kashaf-logo.png" alt="KASHAF Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-2xl font-bold text-white tracking-tight">
                            KASHAF<span className="text-[#00FF87]">.</span>
                        </span>
                    </Link>
                </div>

                {/* Progress indicator */}
                <div className="flex items-center justify-center gap-3 mb-10">
                    <div className={`w-8 h-1 rounded-full transition-all ${effectiveStep === "role" ? "bg-[#00FF87]" : "bg-[#00FF87]"}`} />
                    <div className={`w-8 h-1 rounded-full transition-all ${effectiveStep === "form" ? "bg-[#00FF87]" : "bg-white/10"}`} />
                </div>

                {/* ── Step 1: Role Selection ─────────────────── */}
                {effectiveStep === "role" && (
                    <div className="animate-fade-in-up">
                        <h1 className="text-2xl font-bold text-white text-center mb-2">
                            Welcome to KASHAF!
                        </h1>
                        <p className="text-white/50 text-center mb-8">
                            What best describes you?
                        </p>

                        <div className="flex flex-col gap-4">
                            {ROLES.map((role) => (
                                <button
                                    key={role.id}
                                    onClick={() => handleRoleSelect(role.id)}
                                    className="glass-card-hover p-6 flex items-start gap-4 text-left cursor-pointer group"
                                >
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                                        style={{ backgroundColor: `${role.color}15`, color: role.color }}
                                    >
                                        {role.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-1">{role.title}</h3>
                                        <p className="text-sm text-white/40 leading-relaxed">{role.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Step 2: Profile Form ───────────────────── */}
                {effectiveStep === "form" && effectiveRole && (
                    <div className="animate-fade-in-up">
                        {/* Back button (if role wasn't pre-selected) */}
                        {!user?.role && (
                            <button
                                onClick={() => { setSelectedRole(null); setStep("role"); setError(""); }}
                                className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors mb-6 cursor-pointer"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                                Change role
                            </button>
                        )}

                        {/* Header */}
                        <div className="flex items-center gap-3 mb-8">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: `${roleColor}15`, color: roleColor }}
                            >
                                {ROLES.find((r) => r.id === effectiveRole)?.icon}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">
                                    Complete Your {ROLES.find((r) => r.id === effectiveRole)?.title} Profile
                                </h1>
                                <p className="text-xs text-white/40">Fill in the details below to get started</p>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
                                {error}
                            </div>
                        )}

                        {/* Role-specific forms */}
                        {effectiveRole === "player" && (
                            <PlayerForm user={{ name: user?.name ?? undefined, email: user?.email }} onSubmit={handlePlayerSubmit} loading={loading} />
                        )}
                        {effectiveRole === "analyst" && (
                            <AnalystForm user={{ name: user?.name ?? undefined }} onSubmit={handleAnalystSubmit} loading={loading} />
                        )}
                        {effectiveRole === "scout" && (
                            <ScoutForm user={{ name: user?.name ?? undefined }} onSubmit={handleScoutSubmit} loading={loading} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

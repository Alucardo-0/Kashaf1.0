"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const user = useQuery(api.users.getCurrentUser);
    const updateProfile = useMutation(api.users.updateUserProfile);
    const { signOut } = useAuthActions();
    const router = useRouter();

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    /* ── Common fields ────────────────────────────────────────────────── */
    const [name, setName] = useState("");

    /* ── Player fields ────────────────────────────────────────────────── */
    const [age, setAge] = useState(0);
    const [nationality, setNationality] = useState("");
    const [position, setPosition] = useState("");
    const [secondaryPosition, setSecondaryPosition] = useState("");
    const [height, setHeight] = useState(0);
    const [weight, setWeight] = useState(0);
    const [foot, setFoot] = useState<"left" | "right" | "both">("right");
    const [currentClub, setCurrentClub] = useState("");
    const [contactWhatsapp, setContactWhatsapp] = useState("");
    const [contactEmail, setContactEmail] = useState("");

    /* ── Analyst fields ───────────────────────────────────────────────── */
    const [aNationality, setANationality] = useState("");
    const [experience, setExperience] = useState(0);
    const [certifications, setCertifications] = useState("");
    const [languages, setLanguages] = useState("");
    const [bio, setBio] = useState("");

    /* ── Scout fields ─────────────────────────────────────────────────── */
    const [clubName, setClubName] = useState("");
    const [country, setCountry] = useState("");
    const [leagueLevel, setLeagueLevel] = useState("");

    /* ── Populate from user ───────────────────────────────────────────── */
    useEffect(() => {
        if (!user) return;
        setName(user.name ?? "");

        if (user.role === "player" && user.playerProfile) {
            const p = user.playerProfile;
            setAge(p.age ?? 0);
            setNationality(p.nationality ?? "");
            setPosition(p.position ?? "");
            setSecondaryPosition(p.secondaryPosition ?? "");
            setHeight(p.height ?? 0);
            setWeight(p.weight ?? 0);
            setFoot(p.foot ?? "right");
            setCurrentClub(p.currentClub ?? "");
            setContactWhatsapp(p.contactWhatsapp ?? "");
            setContactEmail(p.contactEmail ?? "");
        }

        if (user.role === "analyst" && user.analystProfile) {
            const a = user.analystProfile;
            setANationality(a.nationality ?? "");
            setExperience(a.experience ?? 0);
            setCertifications(a.certifications?.join(", ") ?? "");
            setLanguages(a.languages?.join(", ") ?? "");
            setBio(a.bio ?? "");
        }

        if (user.role === "scout" && user.scoutProfile) {
            const s = user.scoutProfile;
            setClubName(s.clubName ?? "");
            setCountry(s.country ?? "");
            setLeagueLevel(s.leagueLevel ?? "");
        }
    }, [user]);

    if (user === undefined) {
        return (
            <div className="flex items-center justify-center h-screen">
                <svg className="animate-spin h-8 w-8 text-[#00FF87]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            </div>
        );
    }

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const args: any = { name };

            if (user?.role === "player") {
                args.playerProfile = {
                    age,
                    nationality,
                    position,
                    secondaryPosition: secondaryPosition || undefined,
                    height,
                    weight,
                    foot,
                    currentClub: currentClub || undefined,
                    contactWhatsapp: contactWhatsapp || undefined,
                    contactEmail: contactEmail || undefined,
                };
            }

            if (user?.role === "analyst") {
                args.analystProfile = {
                    nationality: aNationality,
                    experience,
                    certifications: certifications.split(",").map((s) => s.trim()).filter(Boolean),
                    languages: languages.split(",").map((s) => s.trim()).filter(Boolean),
                    bio,
                };
            }

            if (user?.role === "scout") {
                args.scoutProfile = {
                    clubName,
                    country,
                    leagueLevel,
                    isVerified: user.scoutProfile?.isVerified ?? false,
                };
            }

            await updateProfile(args);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch {
            /* silent */
        }
        setSaving(false);
    };

    const handleSignOut = async () => {
        await signOut();
        router.push("/");
    };

    const inputClass =
        "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 focus:ring-1 focus:ring-[#00FF87]/30 transition-all text-sm";
    const labelClass = "block text-sm font-medium text-white/60 mb-1.5";

    return (
        <div className="p-6 lg:p-8 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                    <p className="text-sm text-white/40 mt-1 capitalize">
                        {user?.role ?? "User"} Profile
                    </p>
                </div>
            </div>

            {/* ── General ─────────────────────────────────────────────── */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-6">
                <h2 className="text-base font-semibold text-white mb-4">General</h2>
                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>Display Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Email</label>
                        <input type="text" value={user?.email ?? ""} disabled className={`${inputClass} opacity-40 cursor-not-allowed`} />
                        <p className="text-[11px] text-white/20 mt-1">Email cannot be changed</p>
                    </div>
                </div>
            </div>

            {/* ── Player Profile ───────────────────────────────────────── */}
            {user?.role === "player" && (
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-6">
                    <h2 className="text-base font-semibold text-white mb-4">Player Profile</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Position</label>
                            <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Striker" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Secondary Position</label>
                            <input type="text" value={secondaryPosition} onChange={(e) => setSecondaryPosition(e.target.value)} placeholder="Optional" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Nationality</label>
                            <input type="text" value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Age</label>
                            <input type="number" value={age || ""} onChange={(e) => setAge(Number(e.target.value))} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Height (cm)</label>
                            <input type="number" value={height || ""} onChange={(e) => setHeight(Number(e.target.value))} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Weight (kg)</label>
                            <input type="number" value={weight || ""} onChange={(e) => setWeight(Number(e.target.value))} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Preferred Foot</label>
                            <select value={foot} onChange={(e) => setFoot(e.target.value as "left" | "right" | "both")} className={inputClass}>
                                <option value="right">Right</option>
                                <option value="left">Left</option>
                                <option value="both">Both</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Current Club</label>
                            <input type="text" value={currentClub} onChange={(e) => setCurrentClub(e.target.value)} placeholder="Free Agent" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>WhatsApp</label>
                            <input type="text" value={contactWhatsapp} onChange={(e) => setContactWhatsapp(e.target.value)} placeholder="+1 234 567 890" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Contact Email</label>
                            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Analyst Profile ──────────────────────────────────────── */}
            {user?.role === "analyst" && (
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-6">
                    <h2 className="text-base font-semibold text-white mb-4">Analyst Profile</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Nationality</label>
                            <input type="text" value={aNationality} onChange={(e) => setANationality(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Experience (years)</label>
                            <input type="number" value={experience || ""} onChange={(e) => setExperience(Number(e.target.value))} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Languages</label>
                            <input type="text" value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="English, Arabic, French" className={inputClass} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelClass}>Certifications</label>
                            <input type="text" value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder="UEFA A, Pro License, etc." className={inputClass} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelClass}>Bio</label>
                            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell players about your experience and approach..." className={`${inputClass} resize-none`} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Scout Profile ────────────────────────────────────────── */}
            {user?.role === "scout" && (
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-6">
                    <h2 className="text-base font-semibold text-white mb-4">Scout Profile</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Club / Agency</label>
                            <input type="text" value={clubName} onChange={(e) => setClubName(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Country</label>
                            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>League Level</label>
                            <input type="text" value={leagueLevel} onChange={(e) => setLeagueLevel(e.target.value)} placeholder="e.g. Premier League" className={inputClass} />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border ${user.scoutProfile?.isVerified
                                    ? "bg-[#00FF87]/15 text-[#00FF87] border-[#00FF87]/30"
                                    : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                                }`}>
                                {user.scoutProfile?.isVerified ? "Verified ✓" : "Pending Verification"}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Actions ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <button
                    onClick={handleSignOut}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                    Sign Out
                </button>
                <div className="flex items-center gap-3">
                    {saved && (
                        <span className="text-xs text-[#00FF87] animate-pulse">✓ Saved successfully</span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-xl font-semibold text-sm text-[#0A0A0F] bg-[#00FF87] hover:bg-[#00FF87]/90 transition-all hover:shadow-lg hover:shadow-[#00FF87]/25 active:scale-[0.97] disabled:opacity-50 cursor-pointer"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

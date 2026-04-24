"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
    const { signIn } = useAuthActions();
    const router = useRouter();

    const [step, setStep] = useState<"role" | "credentials" | "verification">("role");
    const [selectedRole, setSelectedRole] = useState<"player" | "analyst" | "scout" | null>(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const roles = [
        {
            id: "player" as const,
            title: "Football Player",
            desc: "Upload your match footage, get professional analysis, and get discovered by scouts worldwide.",
            icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
            id: "scout" as const,
            title: "Club Scout",
            desc: "Search for talent using advanced filters. Access match reports, heatmaps, and player position profiles.",
            icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            ),
            color: "#8B5CF6",
        },
    ];

    const handleRoleSelect = (role: "player" | "analyst" | "scout") => {
        setSelectedRole(role);
        setStep("credentials");
        setError("");
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("Please enter your full name.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const result = await signIn("password", {
                email,
                password,
                name,
                role: selectedRole!,
                flow: "signUp",
            });

            if (result.signingIn) {
                // Signed in immediately, go to onboarding
                router.push("/onboarding");
            } else {
                // Email verification step required
                setStep("verification");
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await signIn("password", {
                email,
                code: verificationCode,
                flow: "email-verification",
            });
            router.push("/onboarding");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Invalid verification code. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto px-4">
            {/* Logo */}
            <div className="text-center mb-10">
                <Link href="/" className="inline-flex items-center gap-2 group">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-[#00FF87]/20">
                        <img src="/kashaf-logo.png" alt="KASHAF Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-2xl font-bold text-white tracking-tight">
                        KASHAF<span className="text-[#00FF87]">.</span>
                    </span>
                </Link>
            </div>

            {/* ── Step 1: Role Selection ─────────────────────── */}
            {step === "role" && (
                <div className="animate-fade-in-up">
                    <h1 className="text-2xl font-bold text-white text-center mb-2">
                        Join KASHAF
                    </h1>
                    <p className="text-white/50 text-center mb-8">
                        Choose your role to get started
                    </p>

                    <div className="flex flex-col gap-4">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                onClick={() => handleRoleSelect(role.id)}
                                className="glass-card-hover p-6 flex items-start gap-4 text-left cursor-pointer group"
                            >
                                <div
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                                    style={{
                                        backgroundColor: `${role.color}15`,
                                        color: role.color,
                                    }}
                                >
                                    {role.icon}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-1">
                                        {role.title}
                                    </h3>
                                    <p className="text-sm text-white/40 leading-relaxed">
                                        {role.desc}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>

                    <p className="text-center text-sm text-white/40 mt-8">
                        Already have an account?{" "}
                        <Link href="/sign-in" className="text-[#00FF87] hover:text-[#00FF87]/80 font-medium transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            )}

            {/* ── Step 2: Credentials ────────────────────────── */}
            {step === "credentials" && (
                <div className="animate-fade-in-up">
                    <button
                        onClick={() => { setStep("role"); setError(""); }}
                        className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors mb-6 cursor-pointer"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Back
                    </button>

                    <div className="flex items-center gap-3 mb-6">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                                backgroundColor: `${roles.find((r) => r.id === selectedRole)!.color}15`,
                                color: roles.find((r) => r.id === selectedRole)!.color,
                            }}
                        >
                            {roles.find((r) => r.id === selectedRole)!.icon}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">
                                Sign up as {roles.find((r) => r.id === selectedRole)!.title}
                            </h1>
                            <p className="text-xs text-white/40">Fill in your details to create your account</p>
                        </div>
                    </div>

                    <form onSubmit={handleSignUp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your full name"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 focus:ring-1 focus:ring-[#00FF87]/30 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 focus:ring-1 focus:ring-[#00FF87]/30 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Minimum 8 characters"
                                required
                                minLength={8}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 focus:ring-1 focus:ring-[#00FF87]/30 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat your password"
                                required
                                minLength={8}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 focus:ring-1 focus:ring-[#00FF87]/30 transition-all"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

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
                                    Creating account...
                                </span>
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-white/40 mt-6">
                        Already have an account?{" "}
                        <Link href="/sign-in" className="text-[#00FF87] hover:text-[#00FF87]/80 font-medium transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            )}

            {/* ── Step 3: Email Verification ─────────────────── */}
            {step === "verification" && (
                <div className="animate-fade-in-up text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#00FF87]/10 flex items-center justify-center mx-auto mb-6">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00FF87" strokeWidth="1.5">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
                    <p className="text-white/50 mb-8">
                        We sent a verification code to{" "}
                        <span className="text-white font-medium">{email}</span>
                    </p>

                    <form onSubmit={handleVerification} className="space-y-4 max-w-xs mx-auto">
                        <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            placeholder="Enter verification code"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-lg tracking-widest placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 focus:ring-1 focus:ring-[#00FF87]/30 transition-all"
                        />

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl font-semibold text-[#0A0A0F] bg-[#00FF87] hover:bg-[#00FF87]/90 transition-all hover:shadow-lg hover:shadow-[#00FF87]/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
                        >
                            {loading ? "Verifying..." : "Verify Email"}
                        </button>
                    </form>

                    <button
                        onClick={() => { setStep("credentials"); setError(""); }}
                        className="text-sm text-white/40 hover:text-white/70 transition-colors mt-6 cursor-pointer"
                    >
                        ← Back to sign up
                    </button>
                </div>
            )}
        </div>
    );
}

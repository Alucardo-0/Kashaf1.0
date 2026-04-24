"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
    const { signIn } = useAuthActions();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetSent, setResetSent] = useState(false);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signIn("password", {
                email,
                password,
                flow: "signIn",
            });

            if (result.signingIn) {
                router.push("/onboarding");
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Invalid email or password. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await signIn("password", {
                email: resetEmail,
                flow: "reset",
            });
            setResetSent(true);
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

    if (showForgot) {
        return (
            <div className="w-full max-w-md mx-auto px-4">
                {/* Logo */}
                <div className="text-center mb-10">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-[#00FF87]/20">
                            <img src="/kashaf-logo.png" alt="KASHAF Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-2xl font-bold text-white tracking-tight">
                            KASHAF<span className="text-[#00FF87]">.</span>
                        </span>
                    </Link>
                </div>

                {resetSent ? (
                    <div className="animate-fade-in-up text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#00FF87]/10 flex items-center justify-center mx-auto mb-6">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00FF87" strokeWidth="1.5">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
                        <p className="text-white/50 mb-6">
                            If an account with <span className="text-white font-medium">{resetEmail}</span> exists,
                            we&apos;ve sent password reset instructions.
                        </p>
                        <button
                            onClick={() => { setShowForgot(false); setResetSent(false); setError(""); }}
                            className="text-sm text-[#00FF87] hover:text-[#00FF87]/80 font-medium transition-colors cursor-pointer"
                        >
                            ← Back to sign in
                        </button>
                    </div>
                ) : (
                    <div className="animate-fade-in-up">
                        <h1 className="text-2xl font-bold text-white text-center mb-2">
                            Reset Password
                        </h1>
                        <p className="text-white/50 text-center mb-8">
                            Enter your email and we&apos;ll send you a reset link.
                        </p>

                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
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
                                {loading ? "Sending..." : "Send Reset Link"}
                            </button>
                        </form>

                        <button
                            onClick={() => { setShowForgot(false); setError(""); }}
                            className="block text-center text-sm text-white/40 hover:text-white/70 transition-colors mt-6 mx-auto cursor-pointer"
                        >
                            ← Back to sign in
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto px-4">
            {/* Logo */}
            <div className="text-center mb-10">
                <Link href="/" className="inline-flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-[#00FF87]/20">
                        <img src="/kashaf-logo.png" alt="KASHAF Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-2xl font-bold text-white tracking-tight">
                        KASHAF<span className="text-[#00FF87]">.</span>
                    </span>
                </Link>
            </div>

            <div className="animate-fade-in-up">
                <h1 className="text-2xl font-bold text-white text-center mb-2">
                    Welcome back
                </h1>
                <p className="text-white/50 text-center mb-8">
                    Sign in to your KASHAF account
                </p>

                <form onSubmit={handleSignIn} className="space-y-4">
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
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-medium text-white/70">
                                Password
                            </label>
                            <button
                                type="button"
                                onClick={() => { setShowForgot(true); setError(""); }}
                                className="text-xs text-[#00FF87] hover:text-[#00FF87]/80 transition-colors cursor-pointer"
                            >
                                Forgot password?
                            </button>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Your password"
                            required
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
                                Signing in...
                            </span>
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                <p className="text-center text-sm text-white/40 mt-8">
                    Don&apos;t have an account?{" "}
                    <Link href="/sign-up" className="text-[#00FF87] hover:text-[#00FF87]/80 font-medium transition-colors">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}

"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useSmoothScroll } from "@/lib/hooks";

export default function Navbar() {
    const user = useQuery(api.users.getCurrentUser);
    const { signOut } = useAuthActions();
    const router = useRouter();
    const scrollTo = useSmoothScroll();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const isLoggedIn = user !== undefined && user !== null;

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Close menu on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const dashboardPath = user?.role
        ? `/dashboard/${user.role}`
        : "/onboarding";

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                ? "bg-[#0A0A0F]/90 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20"
                : "bg-transparent"
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-9 h-9 rounded-lg overflow-hidden shadow-lg shadow-[#00FF87]/20 group-hover:shadow-[#00FF87]/40 transition-shadow">
                        <img src="/kashaf-logo.png" alt="KASHAF Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">
                        KASHAF<span className="text-[#00FF87]">.</span>
                    </span>
                </Link>

                {/* Nav Links */}
                <div className="hidden md:flex items-center gap-8">
                    <a href="#how-it-works" onClick={(e) => scrollTo(e, "#how-it-works")} className="text-sm text-white/60 hover:text-white transition-colors">
                        How It Works
                    </a>
                    <a href="#stats" onClick={(e) => scrollTo(e, "#stats")} className="text-sm text-white/60 hover:text-white transition-colors">
                        Platform
                    </a>
                    <a href="#testimonials" onClick={(e) => scrollTo(e, "#testimonials")} className="text-sm text-white/60 hover:text-white transition-colors">
                        Testimonials
                    </a>
                    {/* <a href="#pricing" onClick={(e) => scrollTo(e, "#pricing")} className="text-sm text-white/60 hover:text-white transition-colors">
                        Pricing
                    </a> */}
                </div>

                {/* Auth-aware CTA area */}
                {isLoggedIn ? (
                    <div className="flex items-center gap-3">
                        <Link
                            href={dashboardPath}
                            className="text-sm font-semibold bg-[#00FF87] text-[#0A0A0F] px-5 py-2.5 rounded-xl hover:bg-[#00ff87]/90 transition-all hover:shadow-lg hover:shadow-[#00FF87]/25 active:scale-[0.97]"
                        >
                            Go to Dashboard
                        </Link>

                        {/* User avatar with dropdown */}
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="w-9 h-9 rounded-full bg-[#00FF87]/15 border border-[#00FF87]/30 flex items-center justify-center text-sm font-bold text-[#00FF87] hover:bg-[#00FF87]/25 transition-all cursor-pointer"
                            >
                                {user.name?.charAt(0)?.toUpperCase() ?? "?"}
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 top-12 w-56 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl py-2 animate-fade-in-up">
                                    {/* User info */}
                                    <div className="px-4 py-3 border-b border-white/5">
                                        <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                        <p className="text-xs text-white/40 truncate">{user.email}</p>
                                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-[#00FF87]/10 text-[#00FF87] capitalize font-medium">
                                            {user.role}
                                        </span>
                                    </div>

                                    <Link
                                        href={dashboardPath}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                                        </svg>
                                        Dashboard
                                    </Link>
                                    <Link
                                        href="/settings"
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                        </svg>
                                        Settings
                                    </Link>

                                    <div className="border-t border-white/5 mt-1 pt-1">
                                        <button
                                            onClick={async () => {
                                                setMenuOpen(false);
                                                await signOut();
                                                router.push("/");
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                                            </svg>
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <Link
                            href="/sign-in"
                            className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/sign-up"
                            className="text-sm font-semibold bg-[#00FF87] text-[#0A0A0F] px-5 py-2.5 rounded-xl hover:bg-[#00ff87]/90 transition-all hover:shadow-lg hover:shadow-[#00FF87]/25 active:scale-[0.97]"
                        >
                            Get Started
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
}

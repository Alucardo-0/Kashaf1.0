"use client";

import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Marquee } from "@/components/ui/marquee";

type Role = "player" | "analyst" | "scout";

const STEPS: Record<Role, { icon: React.ReactNode; title: string; desc: string }[]> = {
    player: [
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00FF87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
            ),
            title: "Upload Your Match",
            desc: "Paste a YouTube link to your match footage. We'll embed it and get it ready for analysis.",
        },
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00FF87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            ),
            title: "Hire an Analyst",
            desc: "Browse experienced performance analysts, compare rates and reviews, then hire one to break down your game.",
        },
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00FF87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
            ),
            title: "Get Discovered",
            desc: "Your analyzed profile becomes visible to scouts worldwide. Showcase your strengths and get signed.",
        },
    ],
    analyst: [
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            ),
            title: "Create Your Profile",
            desc: "Set your certifications, languages, and rate. Build credibility through quality work.",
        },
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
            ),
            title: "Analyze Matches",
            desc: "Use our professional tools: log events on a pitch map, tag timestamps, and build detailed performance reports.",
        },
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            ),
            title: "Earn Per Analysis",
            desc: "Get paid for every completed analysis. Build your reputation and attract more clients.",
        },
    ],
    scout: [
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
            ),
            title: "Set Your Filters",
            desc: "Filter by position profile, age, nationality, preferred foot, and more. Save searches for alerts.",
        },
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
            ),
            title: "Review Reports",
            desc: "Watch match footage with event timelines, heatmaps, and professional analyst breakdowns.",
        },
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            ),
            title: "Sign Talent",
            desc: "Contact players directly. Access verified performance data to make informed decisions.",
        },
    ],
};

const ROLE_COLORS: Record<Role, string> = {
    player: "#00FF87",
    analyst: "#3B82F6",
    scout: "#8B5CF6",
};

export default function HowItWorks() {
    const [activeRole, setActiveRole] = useState<Role>("player");
    const steps = STEPS[activeRole];
    const color = ROLE_COLORS[activeRole];

    const sectionRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"],
    });
    const bgY = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);

    return (
        <section ref={sectionRef} id="how-it-works" className="relative py-32 overflow-hidden h-[100dvh]">
            {/* Background Marquees */}
            <div className="absolute inset-0 z-0 flex flex-col justify-center gap-24 opacity-[0.03] pointer-events-none">
                <Marquee speed="slow" direction="left">
                    <span className="text-8xl md:text-[12rem] font-black uppercase whitespace-nowrap px-8">Upload Video • Analyze Performance • Get Discovered</span>
                </Marquee>
                <Marquee speed="slow" direction="right">
                    <span className="text-8xl md:text-[12rem] font-black uppercase whitespace-nowrap px-8">Hire Experts • Improve Tactics • Rise to the Top</span>
                </Marquee>
            </div>

            {/* Parallax Background Orb */}
            <motion.div
                style={{ y: bgY }}
                className="absolute top-1/4 -right-1/4 w-[800px] h-[800px] bg-white/[0.015] rounded-full blur-[120px] pointer-events-none"
            />

            <div className="max-w-6xl mx-auto relative z-10 px-6">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                        How It Works
                    </h2>
                    <p className="text-lg text-white/50 max-w-xl mx-auto">
                        Three simple steps to transform your football career — no matter your role.
                    </p>
                </motion.div>

                {/* Role tabs */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex items-center justify-center gap-2 mb-16"
                >
                    {(["player", "analyst", "scout"] as Role[]).map((role) => (
                        <button
                            key={role}
                            onClick={() => setActiveRole(role)}
                            className={`px-6 py-3 rounded-xl text-sm font-semibold capitalize transition-all duration-300 cursor-pointer ${activeRole === role
                                ? "text-[#0A0A0F] shadow-lg"
                                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                                }`}
                            style={
                                activeRole === role
                                    ? {
                                        backgroundColor: color,
                                        boxShadow: `0 0 30px ${color}33`,
                                    }
                                    : {}
                            }
                        >
                            {role}
                        </button>
                    ))}
                </motion.div>

                {/* Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                    {steps.map((step, i) => (
                        <motion.div
                            key={`${activeRole}-${i}`}
                            initial={{ opacity: 0, y: 40, scale: 0.95 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.6, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            className="glass-card p-8 relative group"
                        >
                            {/* Step number */}
                            <div
                                className="absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                                style={{
                                    backgroundColor: color,
                                    color: "#0A0A0F",
                                    boxShadow: `0 0 20px ${color}44`,
                                }}
                            >
                                {i + 1}
                            </div>

                            {/* Icon */}
                            <div className="mb-6 mt-2">{step.icon}</div>

                            {/* Content */}
                            <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                            <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>

                            {/* Connector line (not on last) */}
                            {i < steps.length - 1 && (
                                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-white/10" />
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section >
    );
}

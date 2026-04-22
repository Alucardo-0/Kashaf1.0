"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const TESTIMONIALS = [
    {
        name: "Marcus Okafor",
        role: "Player",
        club: "FC Hannover U21",
        quote:
            "KASHAF changed everything for me. An analyst broke down my game, highlighted what scouts wanted to see, and within weeks I had two clubs reaching out.",
        avatar: "MO",
        color: "#00FF87",
    },
    {
        name: "Elena Vasquez",
        role: "Performance Analyst",
        location: "Madrid, Spain",
        quote:
            "I used to struggle finding clients. Now I have a steady stream of players who need quality analysis. The pitch map tool is the best I've used.",
        avatar: "EV",
        color: "#3B82F6",
    },
    {
        name: "Thomas van der Berg",
        role: "Scout",
        club: "Eredivisie Club",
        quote:
            "The position profile system is brilliant. I can filter for exactly the type of player we need and see real data — not just highlight reels.",
        avatar: "TB",
        color: "#8B5CF6",
    },
    {
        name: "Amara Diallo",
        role: "Player",
        club: "Free Agent",
        quote:
            "Coming from a smaller league, visibility was my biggest challenge. KASHAF gave me a professional profile that scouts actually look at.",
        avatar: "AD",
        color: "#00FF87",
    },
    {
        name: "James O'Brien",
        role: "Performance Analyst",
        location: "London, UK",
        quote:
            "The event logging is seamless. I can pause, tag, mark on the pitch, and move on — then the summary writes itself. My clients love the detail.",
        avatar: "JO",
        color: "#3B82F6",
    },
    {
        name: "Hiroshi Tanaka",
        role: "Scout",
        club: "J-League Academy",
        quote:
            "We've discovered three signings through KASHAF this season. The quality of analysis data makes our scouting process significantly more efficient.",
        avatar: "HT",
        color: "#8B5CF6",
    },
];

export default function Testimonials() {
    const sectionRef = useRef<HTMLElement>(null);

    return (
        <section ref={sectionRef} id="testimonials" className="relative py-32 px-6 overflow-hidden">
            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                        What They Say
                    </h2>
                    <p className="text-lg text-white/50 max-w-xl mx-auto">
                        Players, analysts, and scouts are already changing the game with KASHAF.
                    </p>
                </motion.div>

                {/* Testimonial grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {TESTIMONIALS.map((t, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95, y: 40 }}
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            className="glass-card p-6 flex flex-col gap-4 group cursor-default"
                        >
                            {/* Quote */}
                            <div className="flex-1">
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="mb-3 opacity-30"
                                    style={{ color: t.color }}
                                >
                                    <path
                                        d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"
                                        fill="currentColor"
                                    />
                                    <path
                                        d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"
                                        fill="currentColor"
                                    />
                                </svg>
                                <p className="text-white/70 text-sm leading-relaxed italic">
                                    &ldquo;{t.quote}&rdquo;
                                </p>
                            </div>

                            {/* Author */}
                            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                                    style={{
                                        backgroundColor: `${t.color}20`,
                                        color: t.color,
                                    }}
                                >
                                    {t.avatar}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">{t.name}</p>
                                    <p className="text-xs text-white/40">
                                        {t.role} • {t.club ?? t.location}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

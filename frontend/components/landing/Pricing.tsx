"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function Pricing() {
    const sectionRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"],
    });

    const bgY = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);

    return (
        <section ref={sectionRef} id="pricing" className="relative py-32 px-6">
            {/* Background accent */}
            <motion.div
                style={{ y: bgY }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#3B82F6]/5 rounded-full blur-[150px] pointer-events-none"
            />

            <div className="max-w-5xl mx-auto relative">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                        Simple, Fair Pricing
                    </h2>
                    <p className="text-lg text-white/50 max-w-xl mx-auto">
                        Players pay per analysis. Scouts subscribe for full access. Analysts set their own rates.
                    </p>
                </motion.div>

                {/* Pricing cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Player */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 40 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                        whileHover={{ y: -8, scale: 1.02 }}
                        className="glass-card p-8 flex flex-col group cursor-default"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-[#00FF87]/10 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FF87" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Player</h3>
                                <p className="text-xs text-white/40">Pay per analysis</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <span className="text-3xl font-extrabold text-white">Free</span>
                            <span className="text-white/40 text-sm ml-2">to join</span>
                        </div>

                        <ul className="flex-1 space-y-3 mb-8">
                            {[
                                "Create your player profile",
                                "Upload unlimited match footage",
                                "Pay only when hiring an analyst",
                                "Full stats dashboard & position profile",
                                "Visible to all scouts on platform",
                                "Direct scout contact via WhatsApp/email",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                                    <svg className="w-4 h-4 text-[#00FF87] mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <Link
                            href="/sign-up"
                            className="block text-center py-3 rounded-xl bg-[#00FF87] text-[#0A0A0F] font-semibold hover:shadow-lg hover:shadow-[#00FF87]/25 transition-all active:scale-[0.97]"
                        >
                            Join as Player
                        </Link>
                    </motion.div>

                    {/* Analyst */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 40 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        whileHover={{ y: -8, scale: 1.02 }}
                        className="glass-card p-8 flex flex-col relative border-[#3B82F6]/30 hover:border-[#3B82F6]/50 transition-colors duration-300 shadow-[0_0_30px_rgba(59,130,246,0.1)] hover:shadow-[0_0_40px_rgba(59,130,246,0.2)]"
                    >
                        {/* Popular badge */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#3B82F6] text-xs font-bold text-white shadow-lg shadow-[#3B82F6]/30">
                            EARN MONEY
                        </div>

                        <div className="flex items-center gap-3 mb-6 mt-2">
                            <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Analyst</h3>
                                <p className="text-xs text-white/40">Set your own rate</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <span className="text-3xl font-extrabold text-white">You decide</span>
                            <span className="text-white/40 text-sm ml-2">per match</span>
                        </div>

                        <ul className="flex-1 space-y-3 mb-8">
                            {[
                                "Professional analysis tools",
                                "Interactive pitch map & event logger",
                                "Set your own per-match rate",
                                "Build your reputation with ratings",
                                "Direct player communication",
                                "Earnings dashboard & analytics",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                                    <svg className="w-4 h-4 text-[#3B82F6] mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <Link
                            href="/sign-up"
                            className="block text-center py-3 rounded-xl bg-[#3B82F6] text-white font-semibold hover:shadow-lg hover:shadow-[#3B82F6]/25 transition-all active:scale-[0.97]"
                        >
                            Join as Analyst
                        </Link>
                    </motion.div>

                    {/* Scout */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 40 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                        whileHover={{ y: -8, scale: 1.02 }}
                        className="glass-card p-8 flex flex-col group cursor-default"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Scout</h3>
                                <p className="text-xs text-white/40">Full access subscription</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <span className="text-3xl font-extrabold text-white">$49</span>
                            <span className="text-white/40 text-sm ml-2">/month</span>
                        </div>

                        <ul className="flex-1 space-y-3 mb-8">
                            {[
                                "Advanced player search & filters",
                                "View all match reports & heatmaps",
                                "Position profile matching system",
                                "Save search filters for alerts",
                                "Direct player & agent contact",
                                "Verified scout badge",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                                    <svg className="w-4 h-4 text-[#8B5CF6] mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <Link
                            href="/sign-up"
                            className="block text-center py-3 rounded-xl bg-white/5 text-white font-semibold border border-white/10 hover:bg-white/10 transition-all active:scale-[0.97]"
                        >
                            Join as Scout
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Marquee } from "@/components/ui/marquee";

function AnimatedCounter({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
    const [count, setCount] = useState(0);
    const [hasAnimated, setHasAnimated] = useState(false);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated) {
                    setHasAnimated(true);
                    const startTime = performance.now();
                    const animate = (currentTime: number) => {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        // Ease out cubic
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setCount(Math.floor(eased * end));
                        if (progress < 1) requestAnimationFrame(animate);
                    };
                    requestAnimationFrame(animate);
                }
            },
            { threshold: 0.5 }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end, duration, hasAnimated]);

    return (
        <span ref={ref}>
            {count.toLocaleString()}{suffix}
        </span>
    );
}

export default function Stats() {
    const stats = useQuery(api.users.getPlatformStats);

    const items = [
        {
            value: stats?.totalPlayers ?? 0,
            fallback: 1200,
            label: "Football Players",
            suffix: "+",
            color: "#00FF87",
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            ),
        },
        {
            value: stats?.totalAnalyses ?? 0,
            fallback: 3400,
            label: "Analyses Completed",
            suffix: "+",
            color: "#3B82F6",
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                    <path d="M22 12A10 10 0 0 0 12 2v10z" />
                </svg>
            ),
        },
        {
            value: stats?.totalScouts ?? 0,
            fallback: 85,
            label: "Club Scouts",
            suffix: "+",
            color: "#8B5CF6",
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            ),
        },
        {
            value: stats?.totalAnalysts ?? 0,
            fallback: 240,
            label: "Expert Analysts",
            suffix: "+",
            color: "#F59E0B",
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
            ),
        },
    ];

    const sectionRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"],
    });

    const bgY = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);

    // Generate some random positions for data particles
    const particles = Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 20 + 20,
        delay: Math.random() * -20,
    }));

    return (
        <section ref={sectionRef} id="stats" className="relative py-32 overflow-hidden flex justify-center items-center h-[100dvh]">
            {/* Background Radar / Data Pulse */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
                {/* Concentric rings */}
                {[...Array(4)].map((_, i) => (
                    <motion.div
                        key={`ring-${i}`}
                        className="absolute rounded-full border border-[#00FF87]/10"
                        style={{
                            width: `${(i + 1) * 300}px`,
                            height: `${(i + 1) * 300}px`,
                        }}
                        animate={{
                            rotate: 360,
                            scale: [1, 1.05, 1],
                            opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                            rotate: { duration: 100 + i * 20, repeat: Infinity, ease: "linear" },
                            scale: { duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut" },
                            opacity: { duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut" },
                        }}
                    />
                ))}

                {/* Sweeping Radar Line */}
                <motion.div
                    className="absolute w-[600px] h-[600px] rounded-full"
                    style={{
                        background: "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(0, 255, 135, 0.05) 360deg)",
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                />

                {/* Floating Data Particles */}
                {particles.map((p) => (
                    <motion.div
                        key={`particle-${p.id}`}
                        className="absolute bg-[#00FF87] rounded-full shadow-[0_0_10px_#00FF87]"
                        style={{
                            top: p.top,
                            left: p.left,
                            width: p.size,
                            height: p.size,
                            opacity: 0.2,
                        }}
                        animate={{
                            y: ["-20px", "20px", "-20px"],
                            x: ["-20px", "20px", "-20px"],
                            opacity: [0.1, 0.5, 0.1],
                            scale: [1, 1.5, 1],
                        }}
                        transition={{
                            duration: p.duration,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: "linear",
                        }}
                    />
                ))}
            </div>

            {/* Background glow */}
            <motion.div
                style={{ y: bgY }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#00FF87]/5 rounded-full blur-[150px] pointer-events-none"
            />

            <div className="max-w-6xl mx-auto relative z-10 px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                        Trusted by the Football Community
                    </h2>
                    <p className="text-lg text-white/50 max-w-xl mx-auto">
                        Our platform is growing every day with players, analysts, and scouts from around the world.
                    </p>
                </motion.div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative perspective-1000">
                    {items.map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, rotateY: 90, z: -100 }}
                            whileInView={{ opacity: 1, rotateY: 0, z: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{
                                duration: 0.8,
                                delay: i * 0.15,
                                type: "spring",
                                bounce: 0.4
                            }}
                            whileHover={{ y: -8, scale: 1.05, rotateY: 5 }}
                            className="glass-card p-6 text-center group transform-style-3d will-change-transform"
                        >
                            <div
                                className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all group-hover:scale-110"
                                style={{
                                    backgroundColor: `${item.color}15`,
                                    color: item.color,
                                }}
                            >
                                {item.icon}
                            </div>
                            <div
                                className="text-3xl sm:text-4xl font-extrabold mb-1"
                                style={{ color: item.color }}
                            >
                                <AnimatedCounter
                                    end={item.value > 0 ? item.value : item.fallback}
                                    suffix={item.suffix}
                                />
                            </div>
                            <div className="text-sm text-white/50">{item.label}</div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

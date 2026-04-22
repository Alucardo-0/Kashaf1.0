"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSmoothScroll } from "@/lib/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    ArrowRight,
    Play,
    Star,
    TrendingUp,
    Shield,
    Users,
    Zap,
} from "lucide-react";

/* ── SVG: Football pitch lines ───────────────────────────────────────── */
function PitchSVG() {
    return (
        <svg
            viewBox="0 0 800 500"
            fill="none"
            className="absolute inset-0 w-full h-full opacity-[0.04]"
            preserveAspectRatio="xMidYMid slice"
        >
            <rect x="40" y="30" width="720" height="440" stroke="white" strokeWidth="1.5" rx="2" />
            <line x1="400" y1="30" x2="400" y2="470" stroke="white" strokeWidth="1.5" />
            <circle cx="400" cy="250" r="70" stroke="white" strokeWidth="1.5" />
            <circle cx="400" cy="250" r="3" fill="white" />
            <rect x="40" y="130" width="130" height="240" stroke="white" strokeWidth="1.5" />
            <rect x="40" y="180" width="50" height="140" stroke="white" strokeWidth="1.5" />
            <path d="M170 200 A50 50 0 0 1 170 300" stroke="white" strokeWidth="1.5" fill="none" />
            <circle cx="120" cy="250" r="2.5" fill="white" />
            <rect x="630" y="130" width="130" height="240" stroke="white" strokeWidth="1.5" />
            <rect x="710" y="180" width="50" height="140" stroke="white" strokeWidth="1.5" />
            <path d="M630 200 A50 50 0 0 0 630 300" stroke="white" strokeWidth="1.5" fill="none" />
            <circle cx="680" cy="250" r="2.5" fill="white" />
            <path d="M40 40 A10 10 0 0 1 50 30" stroke="white" strokeWidth="1.5" />
            <path d="M750 30 A10 10 0 0 1 760 40" stroke="white" strokeWidth="1.5" />
            <path d="M40 460 A10 10 0 0 0 50 470" stroke="white" strokeWidth="1.5" />
            <path d="M750 470 A10 10 0 0 0 760 460" stroke="white" strokeWidth="1.5" />
        </svg>
    );
}

/* ── SVG: Abstract football ──────────────────────────────────────────── */
function FootballIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 48 48" fill="none" className={className}>
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <polygon points="24,8 30,16 28,24 20,24 18,16" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.08" />
            <polygon points="36,20 34,28 28,30 26,24 30,16" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.06" />
            <polygon points="34,36 28,38 22,34 24,28 30,28" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.06" />
            <polygon points="14,36 18,28 24,28 22,34 16,38" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.06" />
            <polygon points="12,20 18,16 20,24 18,28 12,28" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.06" />
        </svg>
    );
}

/* ── Animated counter ────────────────────────────────────────────────── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true;
                    const duration = 1600;
                    const startTime = performance.now();
                    const animate = (now: number) => {
                        const progress = Math.min((now - startTime) / duration, 1);
                        // easeOutExpo
                        const eased = 1 - Math.pow(2, -10 * progress);
                        setCount(Math.floor(eased * target));
                        if (progress < 1) requestAnimationFrame(animate);
                    };
                    requestAnimationFrame(animate);
                }
            },
            { threshold: 0.5 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [target]);

    return (
        <span ref={ref}>
            {count.toLocaleString()}{suffix}
        </span>
    );
}

/* ── Stat card ───────────────────────────────────────────────────────── */
function HeroStat({
    value,
    numericValue,
    suffix,
    label,
    icon: Icon,
}: {
    value: string;
    numericValue: number;
    suffix: string;
    label: string;
    icon: React.ElementType;
}) {
    return (
        <motion.div
            whileHover={{ scale: 1.04, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-default group hover:border-[#00FF87]/20 transition-colors duration-300"
        >
            <Icon className="size-4 text-[#00FF87] group-hover:scale-110 transition-transform" />
            <div>
                <p className="text-sm font-semibold text-white">
                    <AnimatedCounter target={numericValue} suffix={suffix} />
                </p>
                <p className="text-[11px] text-white/40">{label}</p>
            </div>
        </motion.div>
    );
}

/* ── Framer Motion variants ──────────────────────────────────────────── */
const container: import("framer-motion").Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const fadeUp: import("framer-motion").Variants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};

/* ══════════════════════════════════════════════════════════════════════
   HERO SECTION
   ══════════════════════════════════════════════════════════════════════ */
export default function Hero() {
    const user = useQuery(api.users.getCurrentUser);
    const isLoggedIn = user !== undefined && user !== null;
    const dashPath = user?.role ? `/dashboard/${user.role}` : "/onboarding";
    const scrollTo = useSmoothScroll();

    // ── Parallax ────────────────────────────────────
    const sectionRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end start"],
    });

    // Different speeds for parallax layers
    const pitchY = useTransform(scrollYProgress, [0, 1], ["0%", "45%"]);
    const titleY = useTransform(scrollYProgress, [0, 1], [0, -180]);
    const cardsY = useTransform(scrollYProgress, [0, 1], [0, -90]);
    const bgOrb1Y = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
    const bgOrb2Y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
    const football1Y = useTransform(scrollYProgress, [0, 1], [0, -150]);
    const football2Y = useTransform(scrollYProgress, [0, 1], [0, -100]);
    const fadeOut = useTransform(scrollYProgress, [0, 0.7, 1], [1, 1, 0]);

    return (
        <section ref={sectionRef} className="relative min-h-screen flex items-center overflow-hidden bg-[#0A0A0F]">
            {/* ── Background with parallax ──────────────── */}
            <motion.div style={{ y: pitchY }} className="absolute inset-0">
                <PitchSVG />
            </motion.div>

            {/* subtle radial accents — parallax at different speeds */}
            <motion.div
                style={{ y: bgOrb1Y }}
                className="absolute top-0 right-0 w-[60%] h-[70%] bg-[#00FF87]/[0.02] blur-[120px] rounded-full"
            />
            <motion.div
                style={{ y: bgOrb2Y }}
                className="absolute bottom-0 left-0 w-[40%] h-[50%] bg-[#3B82F6]/[0.02] blur-[100px] rounded-full"
            />

            {/* floating footballs — parallax + float animation */}
            <motion.div
                style={{ y: football1Y }}
                className="absolute top-[18%] right-[8%] hidden lg:block"
            >
                <motion.div
                    animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                >
                    <FootballIcon className="size-20 text-white/[0.06]" />
                </motion.div>
            </motion.div>
            <motion.div
                style={{ y: football2Y }}
                className="absolute bottom-[22%] left-[5%] hidden lg:block"
            >
                <motion.div
                    animate={{ y: [0, 10, 0], rotate: [0, -6, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                >
                    <FootballIcon className="size-14 text-white/[0.04]" />
                </motion.div>
            </motion.div>

            {/* third football — new, top-left */}
            <motion.div
                style={{ y: useTransform(scrollYProgress, [0, 1], [0, -100]) }}
                className="absolute top-[40%] right-[35%] hidden lg:block"
            >
                <motion.div
                    animate={{ y: [0, -8, 0], rotate: [0, -4, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
                >
                    <FootballIcon className="size-10 text-white/[0.03]" />
                </motion.div>
            </motion.div>

            {/* ── Content with parallax ─────────────────── */}
            <motion.div style={{ opacity: fadeOut }} className="relative z-10 max-w-6xl mx-auto px-6 py-32 w-full">
                <div className="grid lg:grid-cols-[1fr_auto] gap-16 items-center">
                    {/* LEFT — Text content */}
                    <motion.div style={{ y: titleY }} variants={container} initial="hidden" animate="show">
                        {/* Badge */}
                        <motion.div variants={fadeUp}>
                            <Badge
                                variant="outline"
                                className="mb-6 px-3 py-1 text-xs font-medium text-[#00FF87] border-[#00FF87]/20 bg-[#00FF87]/[0.05]"
                            >
                                <span className="size-1.5 rounded-full bg-[#00FF87] animate-pulse mr-1.5" />
                                Football Talent Discovery Platform
                            </Badge>
                        </motion.div>

                        {/* Headline — each word animates individually */}
                        <motion.h1
                            variants={fadeUp}
                            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight leading-[1.05] mb-6"
                            style={{ fontFamily: "var(--font-anton)" }}
                        >
                            <motion.span
                                className="inline-block text-white"
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                            >
                                DISCOVER
                            </motion.span>
                            <br />
                            <motion.span
                                className="inline-block text-white/50"
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.45, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                            >
                                A NEW
                            </motion.span>
                            <br />
                            <motion.span
                                className="inline-block text-[#00FF87]"
                                initial={{ opacity: 0, x: -30, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{ delay: 0.6, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                            >
                                STAR
                            </motion.span>
                        </motion.h1>

                        {/* Separator accent — animated width */}
                        <motion.div
                            variants={fadeUp}
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 64, opacity: 1 }}
                            transition={{ delay: 0.8, duration: 0.6 }}
                            className="mb-6"
                        >
                            <Separator className="bg-[#00FF87]/40 h-[2px] w-full" />
                        </motion.div>

                        {/* Subtitle */}
                        <motion.p
                            variants={fadeUp}
                            className="text-base sm:text-lg text-white/45 max-w-lg leading-relaxed mb-8"
                        >
                            Upload your match footage, get professional analysis from certified
                            analysts, and put your talent in front of club scouts worldwide.
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-10">
                            {isLoggedIn ? (
                                <Button asChild size="lg" className="bg-[#00FF87] text-[#0A0A0F] hover:bg-[#00FF87]/90 font-bold text-sm h-12 px-8 rounded-xl group">
                                    <Link href={dashPath}>
                                        Go to Dashboard
                                        <ArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                        <Button asChild size="lg" className="bg-[#00FF87] text-[#0A0A0F] hover:bg-[#00FF87]/90 font-bold text-sm h-12 px-8 rounded-xl group">
                                            <Link href="/sign-up">
                                                Get Started Free
                                                <ArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        </Button>
                                    </motion.div>
                                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="lg"
                                            className="border-white/10 text-white/70 hover:text-white hover:bg-white/5 h-12 px-6 rounded-xl group"
                                        >
                                            <a
                                                href="#how-it-works"
                                                onClick={(e) => scrollTo(e, "#how-it-works")}
                                            >
                                                <Play className="size-4 mr-1 fill-current group-hover:scale-110 transition-transform" />
                                                How It Works
                                            </a>
                                        </Button>
                                    </motion.div>
                                </>
                            )}
                        </motion.div>

                        {/* Stats strip — animated counters */}
                        <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                            <HeroStat value="2,400+" numericValue={2400} suffix="+" label="Players" icon={Users} />
                            <HeroStat value="840+" numericValue={840} suffix="+" label="Analyses" icon={TrendingUp} />
                            <HeroStat value="120+" numericValue={120} suffix="+" label="Scouts" icon={Star} />
                        </motion.div>
                    </motion.div>

                    {/* RIGHT — Role cards (parallax at different speed) */}
                    <motion.div
                        style={{ y: cardsY }}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="hidden lg:flex flex-col gap-4 w-[320px]"
                    >
                        {[
                            { role: "Player", desc: "Upload matches & get discovered", icon: Zap, color: "#00FF87" },
                            { role: "Analyst", desc: "Analyze performances & earn", icon: TrendingUp, color: "#3B82F6" },
                            { role: "Scout", desc: "Find talent & build your squad", icon: Shield, color: "#A78BFA" },
                        ].map((card, i) => (
                            <motion.div
                                key={card.role}
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                whileHover={{ x: 6, scale: 1.02 }}
                                transition={{
                                    delay: 0.8 + i * 0.15,
                                    duration: 0.5,
                                    ease: [0.25, 0.46, 0.45, 0.94],
                                }}
                            >
                                <Link href="/sign-up">
                                    <div className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-300 cursor-pointer">
                                        <div
                                            className="size-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                                            style={{ background: `${card.color}10`, border: `1px solid ${card.color}20` }}
                                        >
                                            <card.icon className="size-5" style={{ color: card.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white group-hover:text-[#00FF87] transition-colors">
                                                {card.role}
                                            </p>
                                            <p className="text-xs text-white/35">{card.desc}</p>
                                        </div>
                                        <ArrowRight className="size-4 text-white/15 group-hover:text-white/40 transition-all group-hover:translate-x-1" />
                                    </div>
                                </Link>
                            </motion.div>
                        ))}

                        {/* Trust bar */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.4 }}
                            className="flex items-center gap-2 px-4 pt-2"
                        >
                            <div className="flex -space-x-2">
                                {["bg-[#00FF87]", "bg-[#3B82F6]", "bg-[#A78BFA]", "bg-[#F59E0B]"].map((bg, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 1.5 + i * 0.08, type: "spring", stiffness: 300 }}
                                        className={`size-6 rounded-full ${bg} border-2 border-[#0A0A0F] flex items-center justify-center text-[8px] font-bold text-[#0A0A0F]`}
                                    >
                                        {["M", "A", "K", "S"][i]}
                                    </motion.div>
                                ))}
                            </div>
                            <p className="text-[11px] text-white/30">
                                Join <span className="text-white/50 font-medium">3,000+</span> users
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.div>

            {/* bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0A0A0F] to-transparent" />
        </section>
    );
}

"use client";

import { motion } from "framer-motion";

interface MarqueeProps {
    children: React.ReactNode;
    direction?: "left" | "right";
    speed?: "slow" | "normal" | "fast";
    className?: string;
}

export function Marquee({
    children,
    direction = "left",
    speed = "normal",
    className = "",
}: MarqueeProps) {
    const duration = speed === "fast" ? 20 : speed === "normal" ? 40 : 80;

    return (
        <div
            className={`flex overflow-hidden relative select-none \${className}`}
            style={{ maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}
        >
            <motion.div
                className="flex min-w-full flex-shrink-0 items-center justify-around gap-8"
                animate={{ x: direction === "left" ? ["0%", "-100%"] : ["-100%", "0%"] }}
                transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: duration,
                }}
            >
                {children}
            </motion.div>
            <motion.div
                className="flex min-w-full flex-shrink-0 items-center justify-around gap-8"
                animate={{ x: direction === "left" ? ["0%", "-100%"] : ["-100%", "0%"] }}
                transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: duration,
                }}
                aria-hidden="true"
            >
                {children}
            </motion.div>
        </div>
    );
}

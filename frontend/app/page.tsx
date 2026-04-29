"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Stats from "@/components/landing/Stats";
import Testimonials from "@/components/landing/Testimonials";
import Footer from "@/components/landing/Footer";
import LenisProvider from "@/components/LenisProvider";

function SectionTransition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start 20%"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["40%", "0%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.85, 1]);

  return (
    <motion.div ref={ref} style={{ y, opacity, scale }} className="will-change-transform origin-top">
      {children}
    </motion.div>
  );
}

export default function Home() {
  return (
    <LenisProvider>
      <div className="min-h-screen bg-[#0A0A0F] overflow-hidden">
        <Navbar />
        <Hero />
        <div className="relative z-10 bg-[#0A0A0F]">
          <SectionTransition>
            <HowItWorks />
          </SectionTransition>
          <SectionTransition>
            <Stats />
          </SectionTransition>
          <SectionTransition>
            <Testimonials />
          </SectionTransition>
          <Footer />
        </div>
      </div>
    </LenisProvider>
  );
}

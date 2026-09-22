"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";

export default function Hero() {
  const titleRef = useRef(null);

  useEffect(() => {
    const letters = titleRef.current.querySelectorAll(".word");

    gsap.fromTo(
      letters,
      {
        y: 120,
        opacity: 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: 1.2,
        stagger: 0.12,
        ease: "power4.out",
        delay: 0.5,
      }
    );
  }, []);

  return (
    <div className="hero-content">
      <p className="hero-small">
        CREATIVE DIGITAL STUDIO
      </p>

      <h1 ref={titleRef}>
        <span className="word">WE</span>
        <span className="word">CREATE</span>
        <span className="word gradient-text">DIGITAL</span>
        <span className="word">WORLDS.</span>
      </h1>

      <motion.p
        className="hero-description"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        Web experiences powered by creativity,
        Gaming Zone
      </motion.p>

      <motion.button
        className="hero-button"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
        whileHover={{
          scale: 1.05,
        }}
        whileTap={{
          scale: 0.95,
        }}
      >
        EXPLORE ↗
      </motion.button>
    </div>
  );
}
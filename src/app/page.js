"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import WebGLScene from "./components/WebGLScene";
import CustomCursor from "./components/CustomCursor";
import MagneticButton from "./components/MagneticButton";
import HorizontalProjects from "./components/HorizontalProjects";

export default function Home() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
      lerp: 0.08,
    });

    function raf(time) {
      lenis.raf(time);

      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Connect Lenis + GSAP

    lenis.on("scroll", () => {
      // ScrollTrigger.update();
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <CustomCursor />

      <Navbar />

      <main>
        {/* HERO */}

        <section className="hero-section">
          <WebGLScene />

          <Hero />
        </section>

        {/* ABOUT */}

        <section className="content-section">
          <p className="section-label">
            01 — ABOUT
          </p>

          <h2>
            We build
            <span>
              {" "}
              digital experiences{" "}
            </span>
            that feel alive.
          </h2>

          <p className="description">
            We combine WebGL, Three.js,
            GSAP, Framer Motion and
            smooth scrolling to create
            immersive digital experiences.
          </p>

          <MagneticButton>
            DISCOVER MORE ↗
          </MagneticButton>
        </section>

        {/* HORIZONTAL PROJECTS */}

        <HorizontalProjects />
        

        {/* CONTACT */}

        <section className="contact-section">
          <p className="section-label">
            03 — CONTACT
          </p>

          <h2>
            Let's create
            <br />
            something{" "}
            <span>different.</span>
          </h2>

          <MagneticButton>
            START A PROJECT ↗
          </MagneticButton>
        </section>
      </main>
    </>
  );
}
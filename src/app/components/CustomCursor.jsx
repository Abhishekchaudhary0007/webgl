"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function CustomCursor() {
  const cursorRef = useRef(null);
  const followerRef = useRef(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const follower = followerRef.current;

    const moveCursor = (event) => {
      gsap.to(cursor, {
        x: event.clientX,
        y: event.clientY,
        duration: 0.1,
      });

      gsap.to(follower, {
        x: event.clientX,
        y: event.clientY,
        duration: 0.5,
        ease: "power3.out",
      });
    };

    window.addEventListener(
      "mousemove",
      moveCursor
    );

    const interactiveElements =
      document.querySelectorAll(
        "a, button, .project-card"
      );

    const enter = () => {
      gsap.to(follower, {
        scale: 2.5,
        duration: 0.3,
      });
    };

    const leave = () => {
      gsap.to(follower, {
        scale: 1,
        duration: 0.3,
      });
    };

    interactiveElements.forEach(
      (element) => {
        element.addEventListener(
          "mouseenter",
          enter
        );

        element.addEventListener(
          "mouseleave",
          leave
        );
      }
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        moveCursor
      );

      interactiveElements.forEach(
        (element) => {
          element.removeEventListener(
            "mouseenter",
            enter
          );

          element.removeEventListener(
            "mouseleave",
            leave
          );
        }
      );
    };
  }, []);

  return (
    <>
      <div
        ref={cursorRef}
        className="cursor-dot"
      />

      <div
        ref={followerRef}
        className="cursor-follower"
      />
    </>
  );
}
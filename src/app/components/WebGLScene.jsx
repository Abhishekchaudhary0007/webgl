"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function WebGLScene() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );

    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setSize(
      container.clientWidth,
      container.clientHeight
    );

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
    );

    container.appendChild(renderer.domElement);

    // =========================
    // MAIN OBJECT
    // =========================

    const geometry = new THREE.IcosahedronGeometry(
      1.5,
      5
    );

    const material = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      metalness: 0.8,
      roughness: 0.2,
    });

    const object = new THREE.Mesh(
      geometry,
      material
    );

    scene.add(object);

    // =========================
    // WIRE FRAME
    // =========================

    const wireGeometry =
      new THREE.IcosahedronGeometry(1.6, 3);

    const wireMaterial =
      new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        wireframe: true,
        transparent: true,
        opacity: 0.15,
      });

    const wire = new THREE.Mesh(
      wireGeometry,
      wireMaterial
    );

    scene.add(wire);

    // =========================
    // LIGHTS
    // =========================

    const ambientLight =
      new THREE.AmbientLight(
        0xffffff,
        0.7
      );

    scene.add(ambientLight);

    const purpleLight =
      new THREE.PointLight(
        0x8b5cf6,
        100,
        20
      );

    purpleLight.position.set(
      4,
      3,
      5
    );

    scene.add(purpleLight);

    const cyanLight =
      new THREE.PointLight(
        0x00ffff,
        80,
        20
      );

    cyanLight.position.set(
      -4,
      -2,
      3
    );

    scene.add(cyanLight);

    // =========================
    // MOUSE
    // =========================

    const mouse = {
      x: 0,
      y: 0,
    };

    const handleMouseMove = (event) => {
      mouse.x =
        (event.clientX /
          window.innerWidth) *
          2 -
        1;

      mouse.y =
        -(event.clientY /
          window.innerHeight) *
          2 +
        1;
    };

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    // =========================
    // SCROLL ANIMATION
    // =========================

    const scrollAnimation = gsap.to(
      object.rotation,
      {
        x: Math.PI * 2,
        y: Math.PI * 4,

        scrollTrigger: {
          trigger: document.body,

          start: "top top",

          end: "bottom bottom",

          scrub: 1.5,
        },
      }
    );

    gsap.to(object.position, {
      y: -1.5,

      scrollTrigger: {
        trigger: ".content-section",

        start: "top bottom",

        end: "top center",

        scrub: 1,
      },
    });

    gsap.to(object.scale, {
      x: 0.65,
      y: 0.65,
      z: 0.65,

      scrollTrigger: {
        trigger: ".content-section",

        start: "top bottom",

        end: "top center",

        scrub: 1,
      },
    });

    // =========================
    // ANIMATION LOOP
    // =========================

    let animationFrame;

    const animate = () => {
      animationFrame =
        requestAnimationFrame(animate);

      // Idle movement

      object.rotation.z += 0.002;

      wire.rotation.x -= 0.001;
      wire.rotation.y -= 0.002;

      // Mouse movement

      object.rotation.x +=
        (mouse.y * 0.3 -
          object.rotation.x) *
        0.02;

      object.rotation.y +=
        (mouse.x * 0.3 -
          object.rotation.y) *
        0.02;

      renderer.render(
        scene,
        camera
      );
    };

    animate();

    // =========================
    // RESIZE
    // =========================

    const handleResize = () => {
      const width =
        container.clientWidth;

      const height =
        container.clientHeight;

      camera.aspect =
        width / height;

      camera.updateProjectionMatrix();

      renderer.setSize(
        width,
        height
      );
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    // =========================
    // CLEANUP
    // =========================

    return () => {
      cancelAnimationFrame(
        animationFrame
      );

      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      window.removeEventListener(
        "resize",
        handleResize
      );

      ScrollTrigger.getAll().forEach(
        (trigger) => trigger.kill()
      );

      geometry.dispose();
      material.dispose();

      wireGeometry.dispose();
      wireMaterial.dispose();

      renderer.dispose();

      if (
        container.contains(
          renderer.domElement
        )
      ) {
        container.removeChild(
          renderer.domElement
        );
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="webgl-container"
    />
  );
}
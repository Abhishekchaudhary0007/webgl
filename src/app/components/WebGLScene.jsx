"use client";

/**
 * WebGLScene — interactive liquid orb
 *
 * Interactions
 *  - Move       the orb leans toward the cursor, bulges under it, particles part around it
 *  - Drag       spin the orb, it keeps its momentum when you let go
 *  - Click/tap  shockwave ripples across the surface and the colour theme changes
 *  - Scroll     the orb rotates, travels and shrinks (as before); scroll speed makes it wobble
 *
 * Suggested CSS (works best on a dark page background, the glow is additive):
 *
 *   .webgl-container { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
 *   .content-section { position: relative; z-index: 1; }
 *
 * Add data-no-webgl to any element that should never trigger the orb.
 * Requires three r152+ and gsap 3.12+.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// =========================
// THEMES (click to cycle)
// a = valleys, b = peaks, c = rim highlight, glow = atmosphere
// =========================

const PALETTES = [
  { a: 0x5b21b6, b: 0x22d3ee, c: 0xf5d0fe, glow: 0x8b5cf6 }, // violet / cyan
  { a: 0xbe123c, b: 0xfb923c, c: 0xfef3c7, glow: 0xfb7185 }, // sunset
  { a: 0x047857, b: 0x38bdf8, c: 0xd1fae5, glow: 0x34d399 }, // aurora
  { a: 0x1d4ed8, b: 0xf472b6, c: 0xfef9c3, glow: 0x818cf8 }, // neon
];

// =========================
// SHADERS
// =========================

const NOISE_GLSL = /* glsl */ `
  vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v){
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x  = x_ * ns.x + ns.yyyy;
    vec4 y  = y_ * ns.x + ns.yyyy;
    vec4 h  = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`;

const BLOB_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uHover;
  uniform float uStrength;
  uniform vec3  uPointer;
  uniform float uPointerPower;
  uniform vec3  uRippleOrigin;
  uniform float uRippleTime;

  varying vec3  vNormalW;
  varying vec3  vWorldPos;
  varying float vDisp;

  #define BLOB_R 1.5

  ${NOISE_GLSL}

  float displacement(vec3 dir){
    float t = uTime;
    float n = snoise(dir * 1.4 + vec3(0.0, t * 0.25, t * 0.1));
    n += 0.5 * snoise(dir * 3.0 - vec3(t * 0.3, 0.0, t * 0.2));
    float d = n * 0.16 * uStrength * (1.0 + uHover * 0.6);

    // bulge toward the cursor
    float facing = max(dot(dir, uPointer), 0.0);
    d += pow(facing, 8.0) * uPointerPower * 0.32;

    // click shockwave travelling away from the click point
    float ang = acos(clamp(dot(dir, uRippleOrigin), -1.0, 1.0));
    float x = ang - uRippleTime * 2.4;
    d += sin(x * 11.0) * exp(-x * x * 6.0) * exp(-uRippleTime * 1.1) * 0.22;

    return d;
  }

  void main(){
    vec3 dir = normalize(position);

    // tangent frame for finite-difference normals
    vec3 up = abs(dir.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 tan1 = normalize(cross(dir, up));
    vec3 tan2 = normalize(cross(dir, tan1));
    float e = 0.01;

    float d0 = displacement(dir);
    vec3 p0 = dir * (BLOB_R + d0);

    vec3 dir1 = normalize(dir + tan1 * e);
    vec3 p1 = dir1 * (BLOB_R + displacement(dir1));

    vec3 dir2 = normalize(dir + tan2 * e);
    vec3 p2 = dir2 * (BLOB_R + displacement(dir2));

    vec3 n = normalize(cross(p1 - p0, p2 - p0));
    if (dot(n, dir) < 0.0) n = -n;

    vDisp = d0;
    vNormalW = normalize(mat3(modelMatrix) * n);
    vec4 wp = modelMatrix * vec4(p0, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const BLOB_FRAGMENT = /* glsl */ `
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform float uTime;
  uniform float uHover;

  varying vec3  vNormalW;
  varying vec3  vWorldPos;
  varying float vDisp;

  void main(){
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float ndv = max(dot(N, V), 0.0);
    float fres = pow(1.0 - ndv, 3.0);

    float t = smoothstep(-0.22, 0.28, vDisp);
    vec3 base = mix(uColorA, uColorB, t);

    vec3 L1 = normalize(vec3(0.7, 0.9, 0.8));
    vec3 L2 = normalize(vec3(-0.8, -0.4, 0.5));
    float d1 = max(dot(N, L1), 0.0);
    float d2 = max(dot(N, L2), 0.0);

    vec3 col = base * (0.25 + 0.75 * d1) + uColorC * d2 * 0.35;

    // glossy highlight
    vec3 H = normalize(L1 + V);
    col += pow(max(dot(N, H), 0.0), 80.0) * 0.9;

    // rim light
    col += uColorC * fres * (1.1 + uHover * 0.8);

    // thin-film iridescence that slides across the rim
    float ir = vDisp * 14.0 + ndv * 3.0 + uTime * 0.4;
    col += (0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + ir))) * fres * 0.35;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const GLOW_VERTEX = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vWorldPos;
  void main(){
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const GLOW_FRAGMENT = /* glsl */ `
  uniform vec3  uColor;
  uniform float uIntensity;
  varying vec3  vNormalW;
  varying vec3  vWorldPos;
  void main(){
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float a = pow(abs(dot(N, V)), 2.2);
    gl_FragColor = vec4(uColor, a * uIntensity);
    #include <colorspace_fragment>
  }
`;

const PARTICLE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec3  uPointer;
  uniform float uActive;
  uniform float uBurst;

  attribute float aRand;
  attribute float aSize;

  varying float vRand;
  varying float vAlpha;

  void main(){
    vec3 p = position;

    // slow organic drift
    float t = uTime * 0.15;
    p.x += sin(t * 1.3 + aRand * 20.0) * 0.35;
    p.y += cos(t + aRand * 31.0) * 0.35;

    // particles get pushed away from the cursor (and blasted on click)
    vec2 d = p.xy - uPointer.xy;
    float dist = length(d);
    float radius = 2.2 * (1.0 + uBurst * 0.8);
    float f = (1.0 - smoothstep(0.0, radius, dist)) * uActive;
    p.xy += normalize(d + vec2(1e-4)) * f * (0.9 + uBurst * 1.6) * (0.4 + aRand * 0.6);
    p.z  += f * 0.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float twinkle = 0.6 + 0.4 * sin(uTime * 1.5 + aRand * 40.0);
    gl_PointSize = aSize * uPixelRatio * (1.0 + f * 1.5) * twinkle * (28.0 / -mv.z);

    vRand = aRand;
    vAlpha = twinkle * (0.35 + f * 0.65);
  }
`;

const PARTICLE_FRAGMENT = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vRand;
  varying float vAlpha;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = pow(1.0 - smoothstep(0.0, 0.5, d), 2.0);
    vec3 col = mix(uColorA, uColorB, vRand);
    gl_FragColor = vec4(col, a * vAlpha);
    #include <colorspace_fragment>
  }
`;

// =========================
// COMPONENT
// =========================

export default function WebGLScene() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isSmall = window.innerWidth < 768;

    const measure = () => ({
      w: container.clientWidth || window.innerWidth,
      h: container.clientHeight || window.innerHeight,
    });
    let { w: width, h: height } = measure();

    // =========================
    // RENDERER / CAMERA
    // =========================

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (err) {
      console.warn("WebGL is not available:", err);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);

    let baseZ = 5;
    const fitCamera = () => {
      const aspect = width / height;
      baseZ = Math.max(5, 3.4 / aspect); // pull back on portrait screens
      camera.aspect = aspect;
      camera.position.z = baseZ;
      camera.updateProjectionMatrix();
    };
    fitCamera();

    // =========================
    // THEME (shared colour objects, tweened on click)
    // =========================

    const theme = {
      a: new THREE.Color(),
      b: new THREE.Color(),
      c: new THREE.Color(),
      glow: new THREE.Color(),
    };
    let paletteIndex = 0;
    let ctx; // gsap context, created below

    const setPalette = (index, animate) => {
      const p = PALETTES[index];
      ["a", "b", "c", "glow"].forEach((key) => {
        const target = new THREE.Color(p[key]);
        if (animate) {
          ctx.add(() =>
            gsap.to(theme[key], {
              r: target.r,
              g: target.g,
              b: target.b,
              duration: 1.4,
              ease: "power2.inOut",
              overwrite: true,
            })
          );
        } else {
          theme[key].copy(target);
        }
      });
    };
    setPalette(0, false);

    // =========================
    // HIERARCHY
    // stage (scroll move/scale) > tilt (cursor lean + intro)
    //   > dragGroup (manual spin) > scrollRot (scroll rotation)
    // =========================

    const stage = new THREE.Group();
    const tilt = new THREE.Group();
    const dragGroup = new THREE.Group();
    const scrollRot = new THREE.Group();

    scene.add(stage);
    stage.add(tilt);
    tilt.add(dragGroup);
    dragGroup.add(scrollRot);

    // =========================
    // MAIN OBJECT (shader-displaced liquid orb)
    // =========================

    const blobUniforms = {
      uTime: { value: 0 },
      uHover: { value: 0 },
      uStrength: { value: 1 },
      uPointer: { value: new THREE.Vector3(0, 0, 1) },
      uPointerPower: { value: 0 },
      uRippleOrigin: { value: new THREE.Vector3(0, 0, 1) },
      uRippleTime: { value: 100 },
      uColorA: { value: theme.a },
      uColorB: { value: theme.b },
      uColorC: { value: theme.c },
    };

    const blob = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, isSmall ? 16 : 24),
      new THREE.ShaderMaterial({
        uniforms: blobUniforms,
        vertexShader: BLOB_VERTEX,
        fragmentShader: BLOB_FRAGMENT,
      })
    );
    blob.frustumCulled = false;
    scrollRot.add(blob);

    // =========================
    // WIRE FRAME
    // =========================

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.95, 2),
      wireMaterial
    );
    scrollRot.add(wire);

    // =========================
    // ATMOSPHERE GLOW
    // =========================

    const glowUniforms = {
      uColor: { value: theme.glow },
      uIntensity: { value: 0.55 },
    };
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 48, 48),
      new THREE.ShaderMaterial({
        uniforms: glowUniforms,
        vertexShader: GLOW_VERTEX,
        fragmentShader: GLOW_FRAGMENT,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    tilt.add(glow);

    // =========================
    // ORBIT RINGS
    // =========================

    const ringDefs = [
      { r: 2.35, tx: 1.15, ty: 0.2, speed: 0.35, bead: 0.055 },
      { r: 2.7, tx: 0.55, ty: -0.6, speed: -0.24, bead: 0.045 },
      { r: 3.05, tx: -0.35, ty: 0.9, speed: 0.16, bead: 0.04 },
    ];

    const beadMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const rings = ringDefs.map((def) => {
      const pivot = new THREE.Group();
      pivot.rotation.set(def.tx, def.ty, 0);

      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(def.r, 0.008, 8, 220),
        material
      );

      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(def.bead, 16, 16),
        beadMaterial
      );
      bead.position.x = def.r;
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(def.bead * 3, 16, 16),
        haloMaterial
      );
      bead.add(halo);
      mesh.add(bead);

      pivot.add(mesh);
      dragGroup.add(pivot);
      return { mesh, material, speed: def.speed, base: 0.3 };
    });

    // =========================
    // CLICK SHOCK RING
    // =========================

    const shockMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const shock = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 96), shockMaterial);
    shock.visible = false;
    shock.renderOrder = 5;
    stage.add(shock);

    // =========================
    // PARTICLES
    // =========================

    const count = isSmall ? 900 : 2000;
    const positions = new Float32Array(count * 3);
    const rands = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = -10 + Math.random() * 10.5;
      rands[i] = Math.random();
      sizes[i] = 0.4 + Math.random() * 1.0;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("aRand", new THREE.BufferAttribute(rands, 1));
    particleGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    const particleUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uPointer: { value: new THREE.Vector3() },
      uActive: { value: 0 },
      uBurst: { value: 0 },
      uColorA: { value: theme.b },
      uColorB: { value: theme.c },
    };

    const particles = new THREE.Points(
      particleGeometry,
      new THREE.ShaderMaterial({
        uniforms: particleUniforms,
        vertexShader: PARTICLE_VERTEX,
        fragmentShader: PARTICLE_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    particles.frustumCulled = false;
    scene.add(particles);

    // =========================
    // SCROLL + INTRO ANIMATION
    // =========================

    ctx = gsap.context(() => {
      // full-page rotation
      gsap.to(scrollRot.rotation, {
        x: Math.PI * 2,
        y: Math.PI * 4,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.5,
        },
      });

      // move + shrink when the content arrives
      const section = document.querySelector(".content-section");
      if (section) {
        const trigger = {
          trigger: section,
          start: "top bottom",
          end: "top center",
          scrub: 1,
        };
        gsap.to(stage.position, { y: -1.5, ease: "none", scrollTrigger: trigger });
        gsap.to(stage.scale, {
          x: 0.65,
          y: 0.65,
          z: 0.65,
          ease: "none",
          scrollTrigger: trigger,
        });
      }

      // particles drift toward the camera as you scroll
      gsap.to(particles.position, {
        y: 2.5,
        z: 1.5,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 2,
        },
      });

      // intro pop
      gsap.fromTo(
        tilt.scale,
        { x: 0.001, y: 0.001, z: 0.001 },
        { x: 1, y: 1, z: 1, duration: 1.8, delay: 0.1, ease: "elastic.out(1, 0.6)" }
      );
    });

    // =========================
    // POINTER / DRAG / CLICK
    // =========================

    const raycaster = new THREE.Raycaster();
    const hitSphere = new THREE.Sphere();
    const hitPoint = new THREE.Vector3();
    const tmpVec = new THREE.Vector3();
    const tmpLocal = new THREE.Vector3();
    const ndc = new THREE.Vector2();

    const pointer = {
      x: 0,
      y: 0,
      sx: 0,
      sy: 0,
      active: false,
      overUI: false,
    };
    const dragState = { active: false, lastX: 0, lastY: 0, moved: 0 };
    const spinVel = new THREE.Vector2();
    const pointerDir = new THREE.Vector3(0, 0, 1);

    let hover = 0;
    let pointerPower = 0;
    let pulse = 0;
    let energy = 0;
    let burst = 0;
    let activeAmt = 0;
    let strength = 1;
    let scrollVel = 0;
    let lastScrollY = window.scrollY;
    let rippleStart = -100;
    let lastCursor = "";

    const isUI = (e) =>
      e.target instanceof Element &&
      !!e.target.closest("a, button, input, textarea, select, label, [data-no-webgl]");

    const updatePointer = (e) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointer.active = true;
      pointer.overUI = isUI(e);
    };

    const hitTest = () => {
      raycaster.setFromCamera(ndc.set(pointer.x, pointer.y), camera);
      blob.getWorldPosition(hitSphere.center);
      hitSphere.radius = 1.5 * blob.getWorldScale(tmpVec).x * 1.08;
      return raycaster.ray.intersectSphere(hitSphere, hitPoint);
    };

    const cyclePalette = () => {
      paletteIndex = (paletteIndex + 1) % PALETTES.length;
      setPalette(paletteIndex, true);
    };

    let time = 0;

    const triggerRipple = (point) => {
      blob.worldToLocal(tmpLocal.copy(point)).normalize();
      blobUniforms.uRippleOrigin.value.copy(tmpLocal);
      rippleStart = time;
      pulse = 1;
      energy = 1;
      burst = 1;

      ctx.add(() => {
        gsap.killTweensOf(shock.scale);
        gsap.killTweensOf(shockMaterial);
        gsap.fromTo(
          shock.scale,
          { x: 1.6, y: 1.6 },
          { x: 4.8, y: 4.8, duration: 1.4, ease: "power3.out" }
        );
        gsap.fromTo(
          shockMaterial,
          { opacity: 0.9 },
          {
            opacity: 0,
            duration: 1.4,
            ease: "power2.out",
            onStart: () => (shock.visible = true),
            onComplete: () => (shock.visible = false),
          }
        );
      });
    };

    const onPointerDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      updatePointer(e);
      if (pointer.overUI) return;
      const hit = hitTest();
      if (!hit) return;

      dragState.active = true;
      dragState.lastX = e.clientX;
      dragState.lastY = e.clientY;
      dragState.moved = 0;
      spinVel.set(0, 0);
      document.body.style.userSelect = "none";
      triggerRipple(hit);
    };

    const onPointerMove = (e) => {
      updatePointer(e);
      if (!dragState.active) return;
      const dx = e.clientX - dragState.lastX;
      const dy = e.clientY - dragState.lastY;
      dragState.lastX = e.clientX;
      dragState.lastY = e.clientY;
      dragState.moved += Math.abs(dx) + Math.abs(dy);
      dragGroup.rotation.y += dx * 0.008;
      dragGroup.rotation.x += dy * 0.008;
      spinVel.set(dy * 0.008, dx * 0.008);
    };

    const endDrag = (cancelled) => {
      if (dragState.active) {
        dragState.active = false;
        document.body.style.userSelect = "";
        if (!cancelled && dragState.moved < 8) cyclePalette();
      }
    };

    const onPointerUp = (e) => {
      endDrag(false);
      if (e.pointerType !== "mouse") pointer.active = false;
    };

    const onPointerCancel = () => {
      endDrag(true);
      pointer.active = false;
    };

    const onLeave = () => {
      pointer.active = false;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerCancel, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    // =========================
    // ANIMATION LOOP
    // =========================

    const damp = (current, target, lambda, dt) =>
      current + (target - current) * (1 - Math.exp(-lambda * dt));

    const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let last = performance.now();

    const animate = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const dtS = dt * (reduceMotion ? 0.25 : 1);
      time += dtS;

      // pointer smoothing
      pointer.sx = damp(pointer.sx, pointer.active ? pointer.x : 0, 3, dt);
      pointer.sy = damp(pointer.sy, pointer.active ? pointer.y : 0, 3, dt);
      activeAmt = damp(activeAmt, pointer.active ? 1 : 0, 4, dt);

      // camera parallax
      camera.position.x = damp(camera.position.x, pointer.sx * 0.35, 2.5, dt);
      camera.position.y = damp(camera.position.y, pointer.sy * 0.2, 2.5, dt);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      // lean toward the cursor
      tilt.rotation.x = damp(tilt.rotation.x, pointer.sy * 0.28, 4, dt);
      tilt.rotation.y = damp(tilt.rotation.y, pointer.sx * 0.35, 4, dt);

      // idle motion
      blob.rotation.y += dtS * 0.12;
      blob.rotation.z += dtS * 0.05;
      wire.rotation.x -= dtS * 0.06;
      wire.rotation.y -= dtS * 0.12;

      // drag inertia
      if (dragState.active) {
        spinVel.multiplyScalar(Math.exp(-15 * dt));
      } else {
        dragGroup.rotation.x += spinVel.x;
        dragGroup.rotation.y += spinVel.y;
        spinVel.multiplyScalar(Math.exp(-2.2 * dt));
      }

      // hover detection (uses the freshly updated transforms)
      stage.updateMatrixWorld(true);
      let hit = null;
      if (pointer.active && !pointer.overUI) hit = hitTest();

      if (hit) {
        blob.worldToLocal(tmpLocal.copy(hit)).normalize();
        pointerDir.lerp(tmpLocal, 1 - Math.exp(-12 * dt)).normalize();
      }

      const hovering = !!hit || dragState.active;
      hover = damp(hover, hovering ? 1 : 0, 6, dt);
      pointerPower = damp(pointerPower, hit ? 1 : 0, 8, dt);
      pulse = damp(pulse, 0, 4, dt);
      energy = damp(energy, 0, 1.5, dt);
      burst = damp(burst, 0, 2.5, dt);

      const cursor = dragState.active ? "grabbing" : hit ? "grab" : "";
      if (cursor !== lastCursor) {
        document.body.style.cursor = cursor;
        lastCursor = cursor;
      }

      // scroll speed makes the orb wobble harder
      const scrollY = window.scrollY;
      const delta = reduceMotion ? 0 : scrollY - lastScrollY;
      lastScrollY = scrollY;
      scrollVel = damp(scrollVel, delta, 8, dt);
      strength = damp(strength, 1 + Math.min(Math.abs(scrollVel) / 25, 1.2), 6, dt);

      // blob uniforms
      blobUniforms.uTime.value = time;
      blobUniforms.uHover.value = hover;
      blobUniforms.uStrength.value = strength;
      blobUniforms.uPointerPower.value = pointerPower;
      blobUniforms.uPointer.value.copy(pointerDir);
      blobUniforms.uRippleTime.value = time - rippleStart;

      blob.scale.setScalar(1 + hover * 0.05 + pulse * 0.08);
      wire.scale.setScalar(1 + hover * 0.08 + pulse * 0.15);
      wireMaterial.color.copy(theme.b);
      wireMaterial.opacity = 0.12 + hover * 0.1 + energy * 0.12;

      glowUniforms.uIntensity.value = 0.55 + hover * 0.35 + pulse * 0.4 + energy * 0.2;

      // rings
      const ringBoost = 1 + energy * 6;
      rings.forEach((ring) => {
        ring.mesh.rotation.z += dtS * ring.speed * ringBoost;
        ring.material.color.copy(theme.b);
        ring.material.opacity = ring.base + hover * 0.25 + energy * 0.3;
      });
      beadMaterial.color.copy(theme.c);
      haloMaterial.color.copy(theme.b);
      shockMaterial.color.copy(theme.c);

      // particles: convert cursor to world space on the z=0 plane
      const worldX = pointer.sx * halfFov * baseZ * camera.aspect;
      const worldY = pointer.sy * halfFov * baseZ;
      particleUniforms.uTime.value = time;
      particleUniforms.uActive.value = activeAmt;
      particleUniforms.uBurst.value = burst;
      particleUniforms.uPointer.value.set(
        worldX - particles.position.x,
        worldY - particles.position.y,
        0
      );

      renderer.render(scene, camera);
    };

    // only render while visible
    const startLoop = () => {
      last = performance.now();
      renderer.setAnimationLoop(animate);
    };
    const stopLoop = () => renderer.setAnimationLoop(null);

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? startLoop() : stopLoop()),
      { threshold: 0 }
    );
    observer.observe(container);
    startLoop();

    // =========================
    // RESIZE
    // =========================

    const resizeObserver = new ResizeObserver(() => {
      const size = measure();
      width = size.w;
      height = size.h;
      renderer.setSize(width, height, false);
      fitCamera();
    });
    resizeObserver.observe(container);

    // =========================
    // CLEANUP
    // =========================

    return () => {
      stopLoop();
      observer.disconnect();
      resizeObserver.disconnect();

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      document.documentElement.removeEventListener("mouseleave", onLeave);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      // reverts only the tweens / triggers created by this component
      ctx.revert();

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          [].concat(obj.material).forEach((m) => m.dispose());
        }
      });

      renderer.dispose();
      renderer.forceContextLoss();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="webgl-container"
      aria-hidden="true"
    />
  );
}
"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const sections = [
  {
    direction: "left",
    projects: [
      {
        number: "01",
        title: "Digital Space",
        category: "THREE.JS",
        image: "/images/image_1.jpeg",
      },
      {
        number: "02",
        title: "Future Interface",
        category: "WEBGL",
        image: "/images/image_2.jfif",
      },
      {
        number: "03",
        title: "Motion System",
        category: "GSAP",
        image: "/images/image_3.jpg",
      },
      {
        number: "04",
        title: "Creative World",
        category: "INTERACTIVE",
        image: "/images/image_4.jpg",
      },
    ],
  },

  {
    direction: "right",
    projects: [
      {
        number: "05",
        title: "Digital Future",
        category: "WEB DESIGN",
        image: "/images/image_22.jpeg",
      },
      {
        number: "06",
        title: "Creative Motion",
        category: "MOTION",
        image: "/images/image_23.avif",
      },
      {
        number: "07",
        title: "Web Experience",
        category: "WEBGL",
        image: "/images/image_24.jpg",
      },
      {
        number: "08",
        title: "Interactive World",
        category: "INTERACTIVE",
        image: "/images/image_25.avif",
      },
    ],
  },

  {
    direction: "left",
    projects: [
      {
        number: "09",
        title: "Future Space",
        category: "THREE.JS",
        image: "/images/image_1.jpeg",
      },
      {
        number: "10",
        title: "Motion Experience",
        category: "GSAP",
        image: "/images/image_2.jfif",
      },
      {
        number: "11",
        title: "Digital World",
        category: "WEBGL",
        image: "/images/image_3.jpg",
      },
      {
        number: "12",
        title: "Creative Interface",
        category: "INTERACTIVE",
        image: "/images/image_4.jpg",
      },
    ],
  },

  {
    direction: "right",
    projects: [
      {
        number: "13",
        title: "Modern Space",
        category: "THREE.JS",
        image: "/images/image_1.jpeg",
      },
      {
        number: "14",
        title: "Future World",
        category: "WEBGL",
        image: "/images/image_2.jfif",
      },
      {
        number: "15",
        title: "Motion Design",
        category: "GSAP",
        image: "/images/image_3.jpg",
      },
      {
        number: "16",
        title: "Digital Experience",
        category: "INTERACTIVE",
        image: "/images/image_4.jpg",
      },
    ],
  },
];

function HorizontalSection({ projects, direction }) {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;

    if (!section || !track) return;

    const ctx = gsap.context(() => {
      const getScrollAmount = () => {
        return track.scrollWidth - window.innerWidth;
      };

      const isRight = direction === "right";

      gsap.set(track, {
        x: isRight ? -getScrollAmount() : 0,
      });

      gsap.to(track, {
        x: isRight ? 0 : () => -getScrollAmount(),

        ease: "none",

        scrollTrigger: {
          trigger: section,

          start: "top top",

          end: () => `+=${getScrollAmount()}`,

          pin: true,

          scrub: 1,

          anticipatePin: 1,

          invalidateOnRefresh: true,

          markers: false,
        },
      });

      ScrollTrigger.refresh();
    }, section);

    return () => {
      ctx.revert();
    };
  }, [direction]);

  return (
    <section
      ref={sectionRef}
      className="horizontal-section"
    >
      <div
        ref={trackRef}
        className="project-track"
      >
        {projects.map((project) => (
          <article
            key={project.number}
            className="large-project"
            style={{
              backgroundImage: `url(${project.image})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "cover",
              minWidth: "100vw",
              height: "100vh",
            }}
          >
            <div className="project-overlay"></div>

            <div className="project-number">
              {project.number}
            </div>

            <div className="project-content">
              <h2>{project.title}</h2>

              <p>{project.category}</p>
            </div>

            <div className="project-circle">
              ↗
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function HorizontalProjects() {
  return (
    <main>
      {sections.map((section, index) => (
        <HorizontalSection
          key={index}
          projects={section.projects}
          direction={section.direction}
        />
      ))}
    </main>
  );
}
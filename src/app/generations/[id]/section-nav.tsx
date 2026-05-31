"use client";

import { useEffect, useRef, useState } from "react";

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export function SectionNav({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const clickScrolling = useRef(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const els = sections.flatMap((section) => {
      const el = document.getElementById(section.id);
      return el ? [el] : [];
    });
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (clickScrolling.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    for (const el of els) observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id);
    clickScrolling.current = true;
    clearTimeout(clickTimer.current);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    clickTimer.current = setTimeout(() => {
      clickScrolling.current = false;
    }, 800);
  };

  return (
    <nav className="fixed top-1/2 right-4 z-40 hidden -translate-y-1/2 flex-col gap-1.5 xl:flex">
      <div className="border-border bg-surface/90 flex flex-col gap-1.5 rounded-full border px-1.5 py-2 shadow-lg backdrop-blur">
        {sections.map((section) => {
          const isActive = activeId === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                scrollTo(section.id);
              }}
              className={`group relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isActive ? "bg-primary-100 text-primary-700" : "text-text-disabled hover:bg-surface-sunken hover:text-text-secondary"}`}
              aria-label={section.label}
            >
              {section.icon}
              <span className="text-text-inverse bg-text-primary text-caption pointer-events-none absolute right-full mr-2.5 rounded-md px-2.5 py-1 font-medium whitespace-nowrap opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {section.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

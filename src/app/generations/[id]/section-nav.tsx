'use client';

import { useEffect, useRef, useState } from 'react';

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export function SectionNav({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');
  const clickScrolling = useRef(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];
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
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );

    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id);
    clickScrolling.current = true;
    clearTimeout(clickTimer.current);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    clickTimer.current = setTimeout(() => {
      clickScrolling.current = false;
    }, 800);
  };

  return (
    <nav className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1.5 xl:flex">
      <div className="flex flex-col gap-1.5 rounded-full border border-gray-200 bg-white/90 px-1.5 py-2 shadow-lg backdrop-blur">
        {sections.map((s) => {
          const isActive = activeId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className={`group relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
              }`}
              aria-label={s.label}
            >
              {s.icon}
              <span className="pointer-events-none absolute right-full mr-2.5 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

'use client';

import {
  BarChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  cn,
  EyeIcon,
  GitCompareIcon,
  ImageIcon,
  ImagePlusIcon,
  PlayIcon,
  ScrollTextIcon,
  SparklesIcon,
  WorkflowIcon,
} from '@/components/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType, type SVGProps } from 'react';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface NavItem {
  name: string;
  href: string;
  icon: IconType;
  /** Match prefix; defaults to `href`. */
  match?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Run',
    items: [
      { name: 'Runs', href: '/executions', icon: PlayIcon },
      { name: 'Dollhouse Renders', href: '/dollhouse-renders', icon: ImageIcon },
      { name: 'Audit', href: '/audit/compare', icon: GitCompareIcon },
    ],
  },
  {
    label: 'Build',
    items: [
      { name: 'Strategies', href: '/strategies', icon: WorkflowIcon },
      { name: 'Input Presets', href: '/input-presets', icon: ImagePlusIcon },
      { name: 'Prompt Versions', href: '/prompt-versions', icon: ScrollTextIcon },
      { name: 'Prompt Preview', href: '/prompt-preview', icon: EyeIcon },
    ],
  },
  {
    label: 'Insights',
    items: [{ name: 'Analytics', href: '/', icon: BarChartIcon, match: '/' }],
  },
];

const COLLAPSED_KEY = 'aieval.sidebar.collapsed';

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const v = window.localStorage.getItem(COLLAPSED_KEY);
      if (v === '1') setCollapsed(true);
    } catch {
      // localStorage unavailable; ignore.
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isActive = (item: NavItem) => {
    const match = item.match ?? item.href;
    if (match === '/') return pathname === '/';
    return pathname.startsWith(match);
  };

  return (
    <aside
      className={cn(
        'border-border bg-surface flex h-screen flex-col border-r transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
      aria-label="Primary"
    >
      {/* Brand */}
      <div className="border-border flex h-16 items-center justify-between gap-2 border-b px-4">
        <Link
          href="/"
          className={cn('flex min-w-0 items-center gap-2', collapsed && 'justify-center')}
          aria-label="AI Image Eval home"
        >
          <Logomark />
          {!collapsed && (
            <span className="text-body text-text-primary truncate font-semibold">
              AI Image Eval
            </span>
          )}
        </Link>
        {!collapsed && hydrated && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            className="text-text-disabled hover:bg-surface-sunken hover:text-text-secondary inline-flex h-7 w-7 items-center justify-center rounded-md"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Sections">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <div className="text-text-disabled mb-1 px-3 text-[10px] font-semibold tracking-wider uppercase">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'text-body flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors',
                        collapsed && 'justify-center px-2',
                        active
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-text-secondary hover:bg-surface-sunken hover:text-text-primary',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5 shrink-0',
                          active ? 'text-primary-600' : 'text-text-muted',
                        )}
                        aria-hidden="true"
                      />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer (collapse toggle when collapsed; user button hosted in TopBar) */}
      <div className="border-border border-t px-3 py-3">
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="text-text-disabled hover:bg-surface-sunken hover:text-text-secondary flex w-full items-center justify-center rounded-md py-2"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        ) : (
          <p className="text-text-disabled px-2 text-[10px]">v0.1.0</p>
        )}
      </div>
    </aside>
  );
}

function Logomark() {
  return (
    <span
      className="bg-primary-600 text-text-inverse flex h-8 w-8 shrink-0 items-center justify-center rounded-md shadow-xs"
      aria-hidden="true"
    >
      <SparklesIcon className="h-4 w-4" strokeWidth={2.25} />
    </span>
  );
}

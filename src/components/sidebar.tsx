'use client';

import { cn } from '@/components/ui/cn';
import {
  BarChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  GitCompareIcon,
  ImageIcon,
  ImagePlusIcon,
  PlayIcon,
  ScrollTextIcon,
  SparklesIcon,
  WorkflowIcon,
} from '@/components/ui/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore, type ComponentType, type SVGProps } from 'react';

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

const collapsedListeners = new Set<() => void>();

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function subscribeCollapsed(onChange: () => void): () => void {
  collapsedListeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    collapsedListeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function writeCollapsed(next: boolean): void {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
  } catch {
    // localStorage unavailable; ignore.
  }
  for (const listener of collapsedListeners) listener();
}

export function Sidebar() {
  const pathname = usePathname();
  // Read the persisted collapse state from localStorage via an external store
  // so SSR gets a clean `false` snapshot and the client hydrates to the real
  // value without a mount effect or a separate hydration flag.
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);

  const toggleCollapsed = () => writeCollapsed(!collapsed);

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
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            className="text-text-disabled hover:bg-surface-sunken hover:text-text-secondary inline-flex size-7 items-center justify-center rounded-md"
          >
            <ChevronLeftIcon className="size-4" />
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
                          'size-5 shrink-0',
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
      <div className="border-border border-t p-3">
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="text-text-disabled hover:bg-surface-sunken hover:text-text-secondary flex w-full items-center justify-center rounded-md py-2"
          >
            <ChevronRightIcon className="size-4" />
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
      className="bg-primary-600 text-text-inverse flex size-8 shrink-0 items-center justify-center rounded-md shadow-xs"
      aria-hidden="true"
    >
      <SparklesIcon className="size-4" strokeWidth={2.25} />
    </span>
  );
}

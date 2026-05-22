'use client';

import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { AppShellSkeleton } from './loading-state';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();

  const isAuthPage = pathname.startsWith('/auth');
  const showShell = isSignedIn && !isAuthPage;

  if (!isLoaded) {
    return <AppShellSkeleton />;
  }

  if (!showShell) {
    return <>{children}</>;
  }

  return (
    <div className="isolate flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

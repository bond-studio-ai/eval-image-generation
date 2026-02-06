'use client';

import { authClient } from '@/lib/auth/client';
import { usePathname } from 'next/navigation';
import { AppShellSkeleton } from './loading-state';
import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession();
  const pathname = usePathname();

  const isAuthPage = pathname.startsWith('/auth');
  const isSignedIn = !!session.data;
  const showSidebar = isSignedIn && !isAuthPage;

  if (session.isPending) {
    return <AppShellSkeleton />;
  }

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

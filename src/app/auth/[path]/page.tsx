import { AuthView } from '@neondatabase/auth/react/ui';
import { authViewPaths } from '@neondatabase/auth/react/ui/server';

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <AuthView pathname={path} />
    </div>
  );
}

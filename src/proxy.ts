import { auth } from '@/lib/auth/server';

const proxyHandler = auth.middleware({ loginUrl: '/auth/sign-in' });

export function proxy(request: Parameters<typeof proxyHandler>[0]) {
  return proxyHandler(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth).*)'],
};

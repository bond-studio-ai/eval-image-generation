import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextFetchEvent } from 'next/server';
import type { NextRequest } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/',
  '/analytics(.*)',
  '/audit(.*)',
  '/dollhouse-renders(.*)',
  '/executions(.*)',
  '/generations(.*)',
  '/strategies(.*)',
  '/input-presets(.*)',
  '/prompt-versions(.*)',
  '/prompt-preview(.*)',
]);

const clerkWithProtection = clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      const signInUrl = new URL('/auth/sign-in', req.url).toString();
      await auth.protect({
        unauthenticatedUrl: signInUrl,
      });
    }
  },
  (req) => ({
    signInUrl: new URL('/auth/sign-in', req.url).toString(),
  }),
);

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return clerkWithProtection(request, event);
}

// Matcher must include /api/** so `auth()` works inside route handlers.
// Excluding /api here caused Clerk's `auth()` to throw with no body,
// surfacing as a Vercel HTTP 500 with `content-length: 0` for every
// browser-side mutation. `isProtectedRoute` still controls which pages
// require sign-in. Route handlers that proxy or mutate admin data must
// perform their own `auth()` check because middleware only initializes
// Clerk context for `/api/**`.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth).*)'],
};

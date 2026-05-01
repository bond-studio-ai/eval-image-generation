import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextFetchEvent } from 'next/server';
import type { NextRequest } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/',
  '/executions(.*)',
  '/strategies(.*)',
  '/input-presets(.*)',
  '/prompt-versions(.*)',
  '/prompt-preview(.*)',
  '/catalog-runs(.*)',
  '/catalog-prompts(.*)',
  '/catalog-calibrations(.*)',
  '/catalog-thresholds(.*)',
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

// Matcher must include /api/** so `auth()` works inside route handlers
// (e.g. the /api/v1/catalog-feed proxy needs the Clerk request context to
// gate browser-side admin mutations behind sign-in). Excluding /api here
// caused Clerk's `auth()` to throw with no body, surfacing as a Vercel
// HTTP 500 with `content-length: 0` for every browser-side mutation.
// `isProtectedRoute` still controls which paths actually require sign-in
// (only app pages, never API routes), so running the middleware on /api
// just initializes context — it does not gate the existing unauthenticated
// API routes (upload, projects, products, etc.).
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth).*)'],
};

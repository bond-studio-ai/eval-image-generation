import {
  clerkMiddleware,
  createRouteMatcher,
} from '@clerk/nextjs/server';
import { NextFetchEvent } from 'next/server';
import type { NextRequest } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/',
  '/executions(.*)',
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth|api).*)',
  ],
};

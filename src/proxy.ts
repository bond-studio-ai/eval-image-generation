import { auth } from '@/lib/auth/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_DOMAIN = 'bondstudio.ai';

const proxyHandler = auth.middleware({ loginUrl: '/auth/sign-in' });

export async function proxy(request: NextRequest) {
  // Run the auth middleware first (handles session refresh, unauthenticated redirects)
  const response = await proxyHandler(request);

  // After auth middleware, check if user is authenticated with an allowed email domain
  const { data: session } = await auth.getSession();

  if (session?.user) {
    const email = session.user.email;
    const domain = email.split('@')[1];

    if (domain !== ALLOWED_DOMAIN) {
      // Sign out the unauthorized user
      await auth.signOut();

      // Redirect to sign-in with an error indicator
      const signInUrl = new URL('/auth/sign-in', request.url);
      signInUrl.searchParams.set('error', 'unauthorized_domain');
      return NextResponse.redirect(signInUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth).*)'],
};

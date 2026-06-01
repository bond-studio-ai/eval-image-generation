import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { chromium, type FullConfig } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Authenticates once against the real Clerk instance and persists the signed-in
 * session to `storageState` so every spec starts logged in.
 *
 * Required env (provisioned as CI secrets, see `.github/workflows/e2e-a11y.yml`):
 *   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  (read by `clerkSetup`)
 *   - CLERK_SECRET_KEY                   (read by `clerkSetup` to mint a testing token)
 *   - E2E_CLERK_USER_USERNAME            (test user identifier — email or username)
 *   - E2E_CLERK_USER_PASSWORD            (test user password)
 *
 * `clerkSetup` must run against a Clerk **development/test** instance; it throws
 * on production secret keys.
 */
export const STORAGE_STATE = process.env.STORAGE_STATE ?? ".playwright/storage.json";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to seed the Playwright Clerk session. See test/e2e/README.md.`);
  }
  return value;
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const identifier = requireEnv("E2E_CLERK_USER_USERNAME");
  const password = requireEnv("E2E_CLERK_USER_PASSWORD");
  requireEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  requireEnv("CLERK_SECRET_KEY");

  await clerkSetup();

  const baseURL = config.projects[0]?.use.baseURL ?? process.env.BASE_URL ?? "http://localhost:3000";

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  // Clerk must be loaded on a non-protected page before signing in; `/auth/sign-in`
  // is excluded from the middleware matcher and mounts `<ClerkProvider>`.
  await page.goto("/auth/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "password", identifier, password }
  });

  // Confirm the session sticks on a protected route before snapshotting cookies.
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await mkdir(dirname(STORAGE_STATE), { recursive: true });
  await context.storageState({ path: STORAGE_STATE });
  await browser.close();
}

import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Shared snapshot harness for the visual-regression suite.
 *
 * Page-load screenshots are only useful if they're byte-stable across the dev
 * machine and Linux CI. These helpers centralize the determinism work so every
 * spec gets the same treatment:
 *
 *  - Wait for the authenticated app shell + the page's data to settle (no open
 *    skeletons/spinners) instead of racing `networkidle`, which never resolves
 *    on the polling/SPA routes.
 *  - Kill animations and transitions (Recharts, the dagre DAG, Radix popovers)
 *    so a snapshot taken mid-transition can't drift.
 *  - Hide volatile chrome: relative timestamps, the Clerk avatar, the env badge.
 *
 * Baselines are Linux-generated (see scripts/visual-baselines.sh); never commit
 * a baseline produced on macOS/Windows — font hinting differs and every diff
 * will be noise.
 */

const SHELL_SELECTOR = "aside[aria-label='Primary']";
const LOADING_SELECTOR = "svg[role='status'], .animate-pulse";

/**
 * Injected before every screenshot. `visibility: hidden` (not `display: none`)
 * keeps layout boxes intact so hiding a timestamp can't reflow the page.
 */
const STABILIZE_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
  html { scroll-behavior: auto !important; }
  [data-testid='timestamp'],
  time,
  [data-testid='env-badge'],
  .cl-userButton-root img,
  .cl-avatarBox {
    visibility: hidden !important;
  }
`;

export interface SnapshotOptions {
  /**
   * Require the signed-in app shell before snapshotting. Defaults to true.
   * Set false for the auth pages, which render without the sidebar.
   */
  requireShell?: boolean;
  /** Capture the full scrollable page (default) vs. just the viewport. */
  fullPage?: boolean;
  /** Locators to paint over (e.g. third-party widgets we don't own). */
  mask?: Locator[];
  /** Override the global maxDiffPixelRatio for a known-noisy surface. */
  maxDiffPixelRatio?: number;
}

/**
 * Wait until the page has rendered its real, populated state: shell present,
 * network quiet (capped), and no loading skeletons/spinners on screen. Web
 * fonts are awaited last so glyph metrics are stable when we shoot.
 */
export async function waitForStable(page: Page, requireShell: boolean): Promise<void> {
  await page.waitForLoadState("load");

  if (requireShell) {
    // A logged-out session silently redirects to Clerk's sign-in page, where a
    // green snapshot would mask the fact that we never rendered the real app.
    await expect(page).not.toHaveURL(/\/auth\/sign-in/);
    await expect(page.locator(SHELL_SELECTOR)).toBeVisible();
  }

  // SPA/polling routes keep background requests open, so `networkidle` never
  // settles — cap the wait and fall back to the explicit loading-state check.
  await Promise.race([page.waitForLoadState("networkidle"), page.waitForTimeout(8000)]);

  // Web fonts must be ready before we shoot, or glyph metrics shift the layout.
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  // Best-effort: let initial skeletons/spinners detach. Pages that poll forever
  // (a running strategy) keep a spinner alive, so a timeout here is fine — use a
  // stable fixture status (completed) for those surfaces instead.
  try {
    await page.locator(LOADING_SELECTOR).first().waitFor({ state: "hidden", timeout: 8000 });
  } catch {
    /* A perpetually-polling page keeps a spinner mounted; snapshot anyway. */
  }
}

/** Inject the stabilizer stylesheet and give layout a beat to settle. */
async function stabilize(page: Page): Promise<void> {
  await page.addStyleTag({ content: STABILIZE_CSS });
  await page.waitForTimeout(300);
}

/** Stabilize the current page and assert a full-page (default) screenshot. */
export async function snapshot(page: Page, name: string, opts: SnapshotOptions = {}): Promise<void> {
  const { requireShell = true, fullPage = true, mask, maxDiffPixelRatio } = opts;
  await waitForStable(page, requireShell);
  await stabilize(page);
  await expect(page).toHaveScreenshot(name, {
    fullPage,
    animations: "disabled",
    caret: "hide",
    ...(mask ? { mask } : {}),
    ...(maxDiffPixelRatio === undefined ? {} : { maxDiffPixelRatio })
  });
}

/** Navigate to `path`, wait for stability, then snapshot. */
export async function gotoAndSnapshot(page: Page, path: string, name: string, opts: SnapshotOptions = {}): Promise<void> {
  await page.goto(path);
  await snapshot(page, name, opts);
}

/**
 * Snapshot a single element after the page is stable — for deep flows where the
 * interesting surface (a matrix grid, a compare panel) is one region of a long
 * page and a full-page shot would add unrelated noise.
 */
export async function snapshotLocator(page: Page, locator: Locator, name: string, opts: Omit<SnapshotOptions, "fullPage"> = {}): Promise<void> {
  const { requireShell = true, mask, maxDiffPixelRatio } = opts;
  await waitForStable(page, requireShell);
  await stabilize(page);
  await expect(locator).toHaveScreenshot(name, {
    animations: "disabled",
    caret: "hide",
    ...(mask ? { mask } : {}),
    ...(maxDiffPixelRatio === undefined ? {} : { maxDiffPixelRatio })
  });
}

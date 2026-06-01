import { test } from "../fixtures";
import { snapshot } from "./_helpers";

/**
 * Depth sweep: real interaction-driven journeys, snapshotting the meaningful
 * end state of each. These catch regressions that a page-load snapshot can't —
 * the matrix grid, an applied filter, a populated compare view, an expanded
 * builder — by actually driving the UI the way a user does.
 *
 * Selectors prefer accessible roles/names over CSS so they survive styling
 * changes (the thing we're trying to regression-test). The hermetic mock backend
 * is ID-aware, so every fetch these flows trigger resolves to real fixtures.
 */

test("flow: executions matrix view", async ({ page }) => {
  await page.goto("/executions");
  // Expand the batch, then switch the List/Matrix segmented control to Matrix.
  await page.getByRole("button", { name: /Bathroom benchmark run/ }).click();
  await page.getByRole("radio", { name: "Matrix" }).click();
  await snapshot(page, "flow-executions-matrix.png");
});

test("flow: audit two-run compare", async ({ page }) => {
  await page.goto("/audit/compare");
  // Expand the run group, then select two completed runs to trigger the compare.
  await page.getByRole("button", { name: /Group grp_1/ }).click();
  const completedRuns = page.getByRole("button", { name: /completed/ });
  await completedRuns.nth(0).click();
  await completedRuns.nth(1).click();
  // CompareView fetches /strategy-runs/compare and renders once both are picked.
  await page.getByRole("heading", { name: "Compare Runs" }).waitFor();
  await snapshot(page, "flow-audit-compare.png");
});

test("flow: generations rating filter", async ({ page }) => {
  await page.goto("/executions?tab=generations");
  // The Scene group's chips come first; clicking "Failed" applies the filter via URL.
  await page.getByRole("link", { name: "Failed", exact: true }).first().click();
  await page.waitForURL(/scene_accuracy_rating=FAILED/);
  await snapshot(page, "flow-generations-filter.png");
});

test("flow: strategy builder add step", async ({ page }) => {
  await page.goto("/strategies/new");
  // Add a generation step so the builder shows a populated step card (model
  // dropdowns are filled from the mocked provider-model catalog).
  await page.getByRole("button", { name: "Add Generation Step" }).click();
  await snapshot(page, "flow-strategy-builder.png");
});

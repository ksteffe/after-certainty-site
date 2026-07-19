import { expect, test } from "@playwright/test";

import { dismissCookieBanner } from "./fixtures/consent";

const mainContent = "#main";

test.describe("global search", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await dismissCookieBanner(context, baseURL ?? "http://127.0.0.1:3000");
  });

  test("known concept query links to the concept page", async ({ page }) => {
    await page.goto("/search?q=certainty", { waitUntil: "domcontentloaded" });
    await expect(page.locator(mainContent)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Search" })).toBeVisible();

    const conceptLink = page.locator('a[href="/explore/concepts/certainty"]').first();
    await expect(conceptLink).toBeVisible({ timeout: 15_000 });

    await conceptLink.click();
    await expect(page).toHaveURL(/\/explore\/concepts\/certainty/);
    await expect(page.getByRole("heading", { level: 1, name: "Certainty" })).toBeVisible();
  });

  test("type filter is reflected in the URL", async ({ page }) => {
    await page.goto("/search?q=trust", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: "Search" })).toBeVisible();

    const bookFilter = page.getByRole("button", { name: "Book", exact: true });
    await expect(bookFilter).toBeVisible({ timeout: 15_000 });
    await bookFilter.click();
    await expect(page).toHaveURL(/type=book/);
  });
});

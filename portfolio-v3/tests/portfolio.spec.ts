import { expect, test } from "@playwright/test";

test("terminal guides visitors and opens a source file", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Explore a quality engineer’s work." })).toBeVisible();
  const input = page.getByLabel("Ask the portfolio agent");
  await input.fill("/about");
  await input.press("Enter");
  await page.getByRole("button", { name: /Open portfolio\/profile\/about.md/ }).click();
  await expect(page).toHaveURL(/#\/ide\/profile\/about\.md$/);
  await expect(page.getByRole("heading", { name: "About me" })).toBeVisible();
});

test("IDE Explorer, editor tabs, and chat share Markdown documents", async ({ page }) => {
  await page.goto("/#/ide/README.md");
  await expect(page.getByRole("heading", { name: "Lakindu De Silva" })).toBeVisible();
  if ((page.viewportSize()?.width ?? 1200) < 768) {
    await page.getByRole("button", { name: "Explorer", exact: true }).last().click();
  }
  await page.getByRole("button", { name: "experience.md", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Experience" })).toBeVisible();
  if ((page.viewportSize()?.width ?? 1200) < 768) {
    await page.getByRole("button", { name: "Agent", exact: true }).last().click();
  }
  const chat = page.getByLabel("Ask a portfolio question");
  await chat.fill("Which tools does he use?");
  await chat.press("Enter");
  await expect(page.getByRole("button", { name: /portfolio\/toolbox\/tools.md/ })).toBeVisible();
  if ((page.viewportSize()?.width ?? 1200) < 768) {
    await page.getByRole("button", { name: "Editor", exact: true }).last().click();
  }
  await expect(page.getByRole("heading", { name: "Experience" })).toBeVisible();
});

test("mobile workspace uses focused panels without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/ide/README.md");
  await page.getByRole("button", { name: "Agent", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "Ask Lakindu’s portfolio" })).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test("unknown prompts are rejected without executing them", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("Ask the portfolio agent");
  await input.fill("rm -rf /");
  await input.press("Enter");
  await expect(page.getByText(/only answer questions covered by this portfolio/)).toBeVisible();
});

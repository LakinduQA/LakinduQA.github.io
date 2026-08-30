import { expect, test } from "@playwright/test";

test("terminal streams a complete experience document and opens its source", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Lakindu Portfolio Codex startup")).toBeVisible();
  const input = page.getByLabel("Terminal command");
  await input.fill("/experience");
  await input.press("Enter");
  await expect(page.getByText("Reading portfolio/career/experience.md")).toBeVisible();
  await expect(input).toBeDisabled();
  await page.getByRole("button", { name: /Show now/ }).click();
  await expect(page.getByRole("heading", { name: /Experience/ })).toBeVisible();
  await expect(page.getByText("Independent QA project work")).toBeVisible();
  await expect(page.getByText(/Designing and documenting end-to-end/)).toBeVisible();
  await expect(input).toBeEnabled();
  await page.getByRole("button", { name: /Open in IDE/ }).click();
  await expect(page).toHaveURL(/#\/ide\/career\/experience\.md$/);
  await expect(page.getByRole("heading", { name: "Experience", exact: true })).toBeVisible();
});

test("natural-language matching prints the same full document", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("Terminal command");
  await input.fill("What experience does Lakindu have?");
  await input.press("Enter");
  await page.getByRole("button", { name: /Show now/ }).click();
  await expect(page.getByText("Independent QA project work")).toBeVisible();
  await expect(page.getByText("portfolio/career/experience.md", { exact: true })).toBeVisible();
});

test("mobile terminal has no horizontal overflow and touch controls work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const input = page.getByLabel("Terminal command");
  await input.fill("/projects");
  await input.press("Enter");
  await expect(page.getByRole("button", { name: /Cancel/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Show now/ })).toBeVisible();
  await page.getByRole("button", { name: /Cancel/ }).click();
  await expect(page.getByText(/Command cancelled after/)).toBeVisible();
  await expect(input).toBeEnabled();

  await input.fill("/contact");
  await input.press("Enter");
  await page.getByRole("button", { name: /Show now/ }).click();
  await expect(page.getByText("Direct links")).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test("IDE Explorer, editor tabs, chat, and integrated terminal remain connected", async ({ page }) => {
  await page.goto("/#/ide/README.md");
  await expect(page.getByRole("heading", { name: "Lakindu De Silva" })).toBeVisible();
  if ((page.viewportSize()?.width ?? 1200) < 768) await page.getByRole("button", { name: "Explorer", exact: true }).last().click();
  await page.getByRole("button", { name: "experience.md", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Experience", exact: true })).toBeVisible();

  if ((page.viewportSize()?.width ?? 1200) < 768) await page.getByRole("button", { name: "Agent", exact: true }).last().click();
  const chat = page.getByLabel("Ask a portfolio question");
  await chat.fill("Which tools does he use?");
  await chat.press("Enter");
  await expect(page.getByRole("button", { name: /portfolio\/toolbox\/tools.md/ })).toBeVisible();

  if ((page.viewportSize()?.width ?? 1200) < 768) {
    await page.getByRole("button", { name: "Terminal", exact: true }).last().click();
  } else {
    await page.getByRole("button", { name: "Terminal" }).last().click();
  }
  const integratedTerminal = page.getByLabel("Integrated terminal");
  await expect(integratedTerminal.getByText("read-only session")).toBeVisible();
  await integratedTerminal.getByLabel("Terminal command").fill("/skills");
  await integratedTerminal.getByLabel("Terminal command").press("Enter");
  await integratedTerminal.getByRole("button", { name: /Show now/ }).click();
  await expect(integratedTerminal.getByRole("heading", { name: /Skills/ })).toBeVisible();
});

test("unknown prompts are rejected without executing them", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("Terminal command");
  await input.fill("rm -rf /");
  await input.press("Enter");
  await expect(page.getByText("Matching portfolio context")).toBeVisible();
  await page.getByRole("button", { name: /Show now/ }).click();
  await expect(page.getByText(/only answer questions covered by this portfolio/).first()).toBeVisible();
});

import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const articlesMarkdown = readFileSync(new URL("../src/content/portfolio/writing/articles.md", import.meta.url), "utf8");
const portfolioConfigMarkdown = readFileSync(new URL("../src/content/portfolio/_config.md", import.meta.url), "utf8");
const curatedArticleHeadings = [...articlesMarkdown.matchAll(/^###\s+(.+)$/gm)].map((match) => match[1].trim());
const curatedArticleUrls = [...articlesMarkdown.matchAll(/^- URL: \[[^\]]+\]\(([^)]+)\)$/gm)].map((match) => match[1]);

function sectionIsPublished(id: string): boolean {
  return portfolioConfigMarkdown.match(new RegExp(`^\\| publish\\.${id} \\| (true|false) \\|$`, "m"))?.[1] === "true";
}

async function finishInitialProfile(page: Page) {
  const terminal = page.locator('[data-app-surface="terminal"]');
  const heading = terminal.getByRole("heading", { name: "Lakindu De Silva" });
  const showNow = terminal.getByRole("button", { name: /Show now/ }).first();
  await expect.poll(async () => await heading.isVisible() || await showNow.isVisible(), { timeout: 15000 }).toBe(true);
  if (await showNow.isVisible()) await showNow.click();
  await expect(heading).toBeVisible();
  await expect(terminal.getByLabel("Terminal command")).toBeEnabled();
}

test.beforeEach(async ({ context }) => {
  await Promise.all([
    context.route("https://api.github.com/**", (route) => route.abort()),
    context.route("https://fonts.googleapis.com/**", (route) => route.abort()),
    context.route("https://fonts.gstatic.com/**", (route) => route.abort()),
  ]);
});

test("JavaScript-disabled visitors receive the semantic static profile", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await Promise.all([
    context.route("https://api.github.com/**", (route) => route.abort()),
    context.route("https://fonts.googleapis.com/**", (route) => route.abort()),
    context.route("https://fonts.gstatic.com/**", (route) => route.abort()),
  ]);
  const page = await context.newPage();
  await page.goto("/");

  const profile = page.locator('[data-static-profile="true"]');
  await expect(profile).toBeVisible();
  await expect(profile.getByRole("heading", { name: "Lakindu De Silva", exact: true })).toBeVisible();
  await expect(profile.getByRole("heading", { name: "Quality Engineer", exact: true })).toBeVisible();
  await expect(profile).toContainText("Focused on system behaviour, risk, automation, APIs, data, and performance");
  const portrait = profile.getByRole("img", { name: "Portrait of Lakindu De Silva, Quality Engineer" });
  await expect(portrait).toHaveAttribute("src", "/media/lakindu-de-silva-quality-engineer.jpg");
  await expect(portrait).toHaveAttribute("width", "1200");
  await expect(portrait).toHaveAttribute("height", "1661");
  for (const name of ["GitHub", "LinkedIn", "Medium"]) await expect(profile.getByRole("link", { name })).toBeVisible();
  await expect(page.getByLabel("Assert loading intro")).toBeHidden();
  await context.close();
});

test("welcome portrait keeps its responsive desktop and mobile proportions", async ({ page }) => {
  await page.goto("/#/ide/README.md");
  const portrait = page.getByRole("img", { name: "Portrait of Lakindu De Silva, Quality Engineer" });
  await expect(portrait).toBeVisible();

  const box = await portrait.boundingBox();
  const viewport = page.viewportSize();
  const expectedRatio = (viewport?.width ?? 1200) < 768 ? 1 / 1.12 : 0.8;

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(Math.abs(box!.width / box!.height - expectedRatio)).toBeLessThan(0.02);
  expect(box!.height).toBeLessThan(viewport!.height);
});

test("standalone intro types Assert and hands off to the rendered terminal", async ({ page }) => {
  await page.goto("/");

  const intro = page.getByLabel("Assert loading intro");
  await expect(intro).toBeVisible();
  await expect(page.locator("#assert-intro-reload")).toBeHidden();
  await expect(intro).toContainText("lakindu@portfolio:~$");
  await expect(intro).not.toContainText(/PowerShell|Windows/i);
  await expect(page.locator("#root")).toHaveAttribute("aria-hidden", "true");
  expect(await page.locator("#root").evaluate((element) => element.inert)).toBe(true);

  await expect(page.locator("#assert-intro-command")).toHaveText("assert");
  await expect(page.locator("#assert-intro-initializing")).toBeVisible();
  await expect(page.locator("#assert-intro-prompt")).toBeVisible();
  await expect(page.getByRole("img", { name: "Assert" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Assert" })).toContainText(">_");
  const asciiRows = (await page.getByRole("img", { name: "Assert" }).textContent())!.split("\n");
  expect(asciiRows).toHaveLength(6);
  expect(asciiRows[5]).toContain("/_/     \\_\\ |_____");
  await expect(intro).toContainText("LOCAL AGENT | PORTFOLIO WORKSPACE | READ-ONLY MODE");
  await expect(intro).toContainText("reading workspace");
  await expect(intro).toContainText("discovering portfolio");
  await expect(intro).toContainText("indexing knowledge");
  await expect(intro).toContainText("preparing terminal");
  await expect(intro).toContainText("Ready.");
  await expect(intro).toContainText("entering ~/portfolio");
  await expect(page.locator("#assert-intro-prompt .assert-intro-cursor")).toBeHidden();
  await expect(page.locator("#assert-intro-entering .assert-intro-cursor")).toBeVisible();
  await expect(page.locator("#assert-intro .assert-intro-cursor:visible")).toHaveCount(1);
  await expect(page.locator(".assert-intro-window, .assert-intro-dots")).toHaveCount(0);
  const statusRowHeights = await page.locator(".assert-intro-statuses li").evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height));
  expect(Math.max(...statusRowHeights)).toBeLessThanOrEqual(24);

  const introGeometry = await page.evaluate(() => {
    const terminal = document.getElementById("assert-intro");
    const utility = document.querySelector(".assert-intro-utilitybar");
    const session = document.querySelector(".assert-intro-session");
    const terminalStyle = getComputedStyle(terminal!);
    const utilityBox = utility!.getBoundingClientRect();
    const sessionBox = session!.getBoundingClientRect();
    return {
      background: terminalStyle.backgroundColor,
      fontFamily: terminalStyle.fontFamily,
      utilityHeight: utilityBox.height,
      sessionLeft: sessionBox.left,
      sessionWidth: sessionBox.width,
    };
  });
  await expect(intro).toBeHidden({ timeout: 3000 });
  const introDuration = Number(await page.locator("#root").getAttribute("data-assert-intro-duration"));
  expect(introDuration).toBeGreaterThanOrEqual(2400);
  expect(introDuration).toBeLessThan(2800);

  await expect(page.locator("#root")).not.toHaveAttribute("aria-hidden", "true");
  await expect(page.getByLabel("Assert portfolio agent startup")).toBeVisible();
  const transcript = page.getByLabel("Terminal transcript");
  await expect(transcript.getByRole("heading")).toHaveCount(0);
  await expect(page.getByText("Reading portfolio/README.md")).toBeVisible({ timeout: 1200 });
  await expect(page.getByText("Matching portfolio context")).toBeVisible({ timeout: 1200 });
  await expect(page.getByText("Formatting terminal output")).toBeVisible({ timeout: 1200 });
  await expect(transcript.getByRole("heading")).toHaveCount(0);
  await expect(page.getByLabel("Terminal command")).toBeFocused({ timeout: 15000 });
  const terminalGeometry = await page.evaluate(() => {
    const terminal = document.querySelector(".agent-terminal");
    const utility = document.querySelector(".terminal-utilitybar");
    const session = document.querySelector(".terminal-session");
    const terminalStyle = getComputedStyle(terminal!);
    const utilityBox = utility!.getBoundingClientRect();
    const sessionBox = session!.getBoundingClientRect();
    return {
      background: terminalStyle.backgroundColor,
      fontFamily: terminalStyle.fontFamily,
      utilityHeight: utilityBox.height,
      sessionLeft: sessionBox.left,
      sessionWidth: sessionBox.width,
    };
  });
  expect(terminalGeometry.background).toBe(introGeometry.background);
  expect(terminalGeometry.fontFamily).toBe(introGeometry.fontFamily);
  expect(Math.abs(terminalGeometry.utilityHeight - introGeometry.utilityHeight)).toBeLessThanOrEqual(1);
  expect(Math.abs(terminalGeometry.sessionLeft - introGeometry.sessionLeft)).toBeLessThanOrEqual(1);
  expect(Math.abs(terminalGeometry.sessionWidth - introGeometry.sessionWidth)).toBeLessThanOrEqual(1);
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test("standalone intro can be skipped by its control or Escape", async ({ page }) => {
  await page.goto("/#terminal");
  await expect(page.getByLabel("Assert loading intro")).toBeVisible();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.getByLabel("Assert loading intro")).toBeHidden({ timeout: 1000 });
  await expect(page.getByLabel("Assert portfolio agent startup")).toBeVisible();

  await page.goto("/");
  await expect(page.getByLabel("Assert loading intro")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Assert loading intro")).toBeHidden({ timeout: 1000 });
  await expect(page.getByLabel("Terminal command")).toBeFocused();
});

test("reduced motion bypasses intro typing and staged transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.getByLabel("Assert loading intro")).toBeHidden({ timeout: 1000 });
  const root = page.locator("#root");
  await expect(root).toHaveAttribute("data-assert-intro-motion", "reduced");
  await expect(root).toHaveAttribute("data-assert-intro-stage", "ready");
  await expect(root).toHaveAttribute("data-assert-intro-typed", "assert");
  const introDuration = Number(await root.getAttribute("data-assert-intro-duration"));
  expect(introDuration).toBeGreaterThanOrEqual(150);
  expect(introDuration).toBeLessThan(1000);
  await expect(page.getByLabel("Assert portfolio agent startup")).toBeVisible();
});

test("education publication flag controls commands, content, Explorer entries, and deep links", async ({ page }) => {
  await page.goto("/#/ide/career/education.md");

  if (sectionIsPublished("education")) {
    await expect(page.getByRole("heading", { name: "Education", exact: true })).toBeVisible();
    if ((page.viewportSize()?.width ?? 1200) < 768) {
      await page.getByRole("button", { name: "Explorer", exact: true }).last().click();
    }
    await expect(page.getByRole("button", { name: "education.md", exact: true })).toBeVisible();
    return;
  }

  await expect(page.getByLabel("Assert portfolio agent startup")).toBeVisible();
  await finishInitialProfile(page);
  await expect(page.getByLabel("Terminal transcript")).not.toContainText("undergraduate");

  const input = page.getByLabel("Terminal command");
  await input.fill("/education");
  await input.press("Enter");
  await page.getByRole("button", { name: /Show now/ }).click();
  await expect(page.getByText(/only answer questions covered by this portfolio/).first()).toBeVisible();

  await input.fill("/help");
  await input.press("Enter");
  await expect(page.getByLabel("Terminal transcript").locator("code", { hasText: "/education" })).toHaveCount(0);

  await page.getByRole("button", { name: "Switch to IDE" }).click();
  if ((page.viewportSize()?.width ?? 1200) < 768) {
    await page.getByRole("button", { name: "Explorer", exact: true }).last().click();
  }
  await expect(page.getByRole("button", { name: "education.md", exact: true })).toHaveCount(0);
  await expect(page.getByText("undergraduate", { exact: false })).toHaveCount(0);
});

test("writing uses the ordered curated article catalog from Markdown", async ({ page }) => {
  await page.goto("/#/ide/writing/articles.md");

  if (!sectionIsPublished("writing")) {
    await expect(page.getByLabel("Assert portfolio agent startup")).toBeVisible();
    await finishInitialProfile(page);
    await page.getByRole("button", { name: "Switch to IDE" }).click();
    if ((page.viewportSize()?.width ?? 1200) < 768) {
      await page.getByRole("button", { name: "Explorer", exact: true }).last().click();
    }
    await expect(page.getByRole("button", { name: "articles.md", exact: true })).toHaveCount(0);
    return;
  }

  await expect(page.getByRole("heading", { name: "Writing", exact: true })).toBeVisible();
  const articleHeadings = page.locator(".markdown-viewer h3");
  expect(curatedArticleHeadings.length).toBeGreaterThan(0);
  expect(curatedArticleUrls).toHaveLength(curatedArticleHeadings.length);
  await expect(articleHeadings).toHaveCount(curatedArticleHeadings.length);
  await expect(articleHeadings.first()).toHaveText(curatedArticleHeadings[0]);
  await expect(page.getByRole("link", { name: "Read on Medium" }).first()).toHaveAttribute(
    "href",
    curatedArticleUrls[0],
  );

  await page.getByRole("button", { name: "README.md", exact: true }).first().click();
  await expect(page.getByText(`${curatedArticleHeadings.length} articles`, { exact: false })).toBeVisible();
});

test("terminal streams a complete experience document and opens its source", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Assert portfolio agent startup")).toBeVisible();
  const banner = page.getByLabel("Assert portfolio agent startup").locator(".terminal-boot-box");
  await expect(banner).toContainText(">_ ASSERT");
  const bannerBox = await banner.evaluate((element) => {
    const style = getComputedStyle(element);
    return { rightWidth: style.borderRightWidth, rightStyle: style.borderRightStyle, client: element.clientWidth, scroll: element.scrollWidth };
  });
  expect(bannerBox.rightWidth).toBe("1px");
  expect(bannerBox.rightStyle).toBe("solid");
  expect(bannerBox.client).toBeGreaterThanOrEqual(bannerBox.scroll);
  const input = page.getByLabel("Terminal command");
  await finishInitialProfile(page);
  await expect(page.getByLabel("Terminal transcript").getByText(/Lakindu De Silva is a Quality Engineer/)).toBeVisible();
  await input.fill("/experience");
  await input.press("Enter");
  await expect(page.getByText("Reading portfolio/career/experience.md")).toBeVisible();
  await expect(input).toBeDisabled();
  await page.getByRole("button", { name: /Show now/ }).click();
  await expect(page.getByRole("heading", { name: /Experience/ })).toBeVisible();
  await expect(page.getByText(/Promoted to Associate QA Engineer/)).toBeVisible();
  await expect(page.getByText(/Own end-to-end STLC activities/)).toBeVisible();
  await expect(input).toBeEnabled();
  await page.getByRole("button", { name: "Open in IDE: portfolio/career/experience.md" }).click();
  await expect(page).toHaveURL(/#\/ide\/career\/experience\.md$/);
  await expect(page.getByRole("heading", { name: "Experience", exact: true })).toBeVisible();
});

test("natural-language matching prints the same full document", async ({ page }) => {
  await page.goto("/");
  await finishInitialProfile(page);
  const input = page.getByLabel("Terminal command");
  await input.fill("What experience does Lakindu have?");
  await input.press("Enter");
  await page.getByRole("button", { name: /Show now/ }).click();
  await expect(page.getByText(/Promoted to Associate QA Engineer/)).toBeVisible();
  await expect(page.getByText("portfolio/career/experience.md", { exact: true })).toBeVisible();
});

test("terminal transcript scrolls backward and offers a persistent IDE switch", async ({ page }) => {
  await page.goto("/");
  await finishInitialProfile(page);
  await expect(page.getByRole("button", { name: "Switch to IDE" })).toBeVisible();
  const input = page.getByLabel("Terminal command");
  await input.fill("/projects");
  await input.press("Enter");
  await page.getByRole("button", { name: /Show now/ }).click();
  const transcript = page.getByLabel("Terminal transcript");
  const dimensions = await transcript.evaluate((element) => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  await transcript.evaluate((element) => { element.scrollTop = 0; element.dispatchEvent(new Event("scroll")); });
  await expect(page.getByRole("button", { name: "Jump to latest" })).toBeVisible();
  await page.getByRole("button", { name: "Switch to IDE" }).click();
  await expect(page).toHaveURL(/#\/ide\/README\.md$/);
});

test("full terminal preserves README, completed output, draft input, and scroll position across IDE switching", async ({ page }) => {
  await page.goto("/");
  await finishInitialProfile(page);

  const surface = page.locator('[data-app-surface="terminal"]');
  const transcript = surface.getByLabel("Terminal transcript");
  const input = surface.getByLabel("Terminal command");
  await input.fill("/experience");
  await input.press("Enter");
  await surface.getByRole("button", { name: /Show now/ }).click();
  await expect(transcript.getByText(/Promoted to Associate QA Engineer/)).toBeVisible();

  await input.fill("unfinished portfolio question");
  const scrollTopBeforeSwitch = await transcript.evaluate((element) => {
    element.scrollTop = Math.floor((element.scrollHeight - element.clientHeight) / 2);
    element.dispatchEvent(new Event("scroll"));
    return element.scrollTop;
  });
  expect(scrollTopBeforeSwitch).toBeGreaterThan(0);

  await surface.getByRole("button", { name: "Switch to IDE" }).click();
  await expect(surface).toBeHidden();
  await page.getByRole("button", { name: "Switch to terminal" }).click();

  await expect(surface).toBeVisible();
  await expect(input).toHaveValue("unfinished portfolio question");
  await expect(input).toBeFocused();
  await expect(transcript.getByText(/Promoted to Associate QA Engineer/)).toBeVisible();
  await expect(surface.locator(".terminal-command").filter({ hasText: "read portfolio/README.md" })).toHaveCount(1);
  expect(await transcript.evaluate((element) => element.scrollTop)).toBe(scrollTopBeforeSwitch);
});

test("cleared full-terminal transcript stays clear across IDE switching", async ({ page }) => {
  await page.goto("/");
  await finishInitialProfile(page);

  const surface = page.locator('[data-app-surface="terminal"]');
  const input = surface.getByLabel("Terminal command");
  await input.fill("/clear");
  await input.press("Enter");
  await expect(surface.locator(".terminal-entry")).toHaveCount(0);

  await surface.getByRole("button", { name: "Switch to IDE" }).click();
  await page.getByRole("button", { name: "Switch to terminal" }).click();
  await expect(surface.locator(".terminal-entry")).toHaveCount(0);
  await expect(input).toBeFocused();
});

test("a full-terminal command can finish while the retained surface is hidden", async ({ page }) => {
  await page.goto("/");
  await finishInitialProfile(page);

  const surface = page.locator('[data-app-surface="terminal"]');
  const input = surface.getByLabel("Terminal command");
  await input.fill("/experience");
  await input.press("Enter");
  const commandEntry = surface.locator(".terminal-entry").filter({ hasText: "/experience" }).last();
  await expect(commandEntry).toHaveAttribute("data-state", "thinking");

  await surface.getByRole("button", { name: "Switch to IDE" }).click();
  await expect(surface).toBeHidden();
  await expect(commandEntry).toHaveAttribute("data-state", "completed", { timeout: 15000 });
  await page.getByRole("button", { name: "Switch to terminal" }).click();
  await expect(commandEntry.getByText(/Promoted to Associate QA Engineer/)).toBeVisible();
});

test("direct IDE deep links defer the first README run and do not repeat it on later terminal visits", async ({ page }) => {
  await page.goto("/#/ide/profile/about.md");
  const surface = page.locator('[data-app-surface="terminal"]');
  await expect(surface).toHaveCount(0);

  await page.getByRole("button", { name: "Switch to terminal" }).click();
  await finishInitialProfile(page);
  const automaticReadmeCommands = surface.locator(".terminal-command").filter({ hasText: "read portfolio/README.md" });
  await expect(automaticReadmeCommands).toHaveCount(1);

  await surface.getByRole("button", { name: "Switch to IDE" }).click();
  await page.getByRole("button", { name: "Switch to terminal" }).click();
  await expect(automaticReadmeCommands).toHaveCount(1);
});

test("Ask Assert opens the chat extension and focuses its composer", async ({ page }) => {
  await page.goto("/#/ide/README.md");
  await page.getByRole("button", { name: "Ask Assert" }).click();
  await expect(page.getByLabel("Assert portfolio extension")).toBeVisible();
  await expect(page.getByLabel("Ask a portfolio question")).toBeFocused();

  const agentButton = (page.viewportSize()?.width ?? 1200) < 768
    ? page.getByLabel("Mobile workspace").getByRole("button", { name: "Agent" })
    : page.getByLabel("Workspace views").getByRole("button", { name: "Assert" });
  await agentButton.click();
  await expect(page.getByLabel("Assert portfolio extension")).toBeHidden();
  await agentButton.click();
  await expect(page.getByLabel("Assert portfolio extension")).toBeVisible();
  await expect(page.getByLabel("Ask a portfolio question")).toBeFocused();
});

test("the IDE terminal activity button toggles the panel and focuses its prompt", async ({ page }) => {
  await page.goto("/#/ide/README.md");
  const terminalButton = (page.viewportSize()?.width ?? 1200) < 768
    ? page.getByLabel("Mobile workspace").getByRole("button", { name: "Terminal" })
    : page.getByLabel("Workspace views").getByRole("button", { name: "Terminal" });
  const integratedTerminal = page.getByLabel("Integrated terminal");

  await terminalButton.click();
  await expect(integratedTerminal).toBeVisible();
  await expect(integratedTerminal.getByLabel("Terminal command")).toBeFocused();
  await terminalButton.click();
  await expect(integratedTerminal).toBeHidden();
  await terminalButton.click();
  await expect(integratedTerminal).toBeVisible();
  await expect(integratedTerminal.getByLabel("Terminal command")).toBeFocused();
});

test("IDE workspace and chat session survive terminal round trips", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/#/ide/README.md");
  const mobile = (page.viewportSize()?.width ?? 1200) < 768;
  const ideSurface = page.locator('[data-app-surface="ide"]');
  const ideShell = ideSurface.locator(".ide-shell");
  const fullTerminal = page.locator('[data-app-surface="terminal"]');

  if (mobile) await page.getByLabel("Mobile workspace").getByRole("button", { name: "Agent" }).click();
  const chatInput = ideSurface.getByLabel("Ask a portfolio question");
  const chatConversation = ideSurface.getByLabel("Assert conversation");
  await ideSurface.getByLabel("Model profile").selectOption("Claude Fable 5");
  await chatInput.fill("write me a weather forecast");
  await chatInput.press("Enter");
  const activeReply = chatConversation.locator(".chat-message--agent").last();
  await expect(activeReply).toHaveAttribute("data-state", "thinking");

  await ideSurface.getByRole("button", { name: "Switch to terminal" }).click();
  await expect(ideSurface).toBeHidden();
  await expect(activeReply).toHaveAttribute("data-state", "error");
  await fullTerminal.getByRole("button", { name: "Switch to IDE" }).click();

  await expect(ideSurface).toBeVisible();
  await expect(activeReply).toContainText("I can only answer questions covered by this portfolio");
  await chatInput.fill("/experience");
  await chatInput.press("Enter");
  await ideSurface.getByLabel("Chat response controls").getByText("Show now").click();
  await expect(chatConversation.getByText(/Promoted to Associate QA Engineer/)).toBeVisible();
  await expect(chatInput).toBeFocused();
  await chatInput.fill("unfinished follow-up");
  const previousScrollTop = await chatConversation.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
    return element.scrollTop;
  });
  await expect(ideSurface.getByRole("button", { name: "Jump to latest" })).toBeVisible();

  await ideSurface.getByRole("button", { name: "Close Assert" }).click();
  await expect(ideSurface.getByLabel("Assert portfolio extension")).toBeHidden();
  const agentButton = mobile
    ? ideSurface.getByLabel("Mobile workspace").getByRole("button", { name: "Agent" })
    : ideSurface.getByLabel("Workspace views").getByRole("button", { name: "Assert" });
  await agentButton.click();
  await expect(ideSurface.getByLabel("Assert portfolio extension")).toBeVisible();
  await expect(chatInput).toHaveValue("unfinished follow-up");
  await expect(ideSurface.getByLabel("Model profile")).toHaveValue("Claude Fable 5");
  expect(await chatConversation.evaluate((element) => element.scrollTop)).toBe(previousScrollTop);

  if (mobile) await ideSurface.getByLabel("Mobile workspace").getByRole("button", { name: "Explorer" }).click();
  const careerFolder = ideSurface.locator(".folder-row", { hasText: "career" });
  await careerFolder.click();
  await expect(ideSurface.getByRole("button", { name: "experience.md", exact: true })).toHaveCount(0);

  const terminalButton = mobile
    ? ideSurface.getByLabel("Mobile workspace").getByRole("button", { name: "Terminal" })
    : ideSurface.getByLabel("Workspace views").getByRole("button", { name: "Terminal" });
  await terminalButton.click();
  const integratedTerminal = ideSurface.getByLabel("Integrated terminal");
  await integratedTerminal.getByLabel("Terminal command").fill("/help");
  await integratedTerminal.getByLabel("Terminal command").press("Enter");
  await expect(integratedTerminal.getByText("/experience", { exact: true })).toBeVisible();
  if (!mobile) {
    const separator = ideSurface.getByRole("separator", { name: "Resize terminal panel" });
    await separator.focus();
    await separator.press("ArrowUp");
  }
  const workspaceStyle = await ideShell.getAttribute("style");

  await ideSurface.getByRole("button", { name: "Switch to terminal" }).click();
  await fullTerminal.getByRole("button", { name: "Switch to IDE" }).click();
  await expect(integratedTerminal).toBeVisible();
  await expect(integratedTerminal.getByText("/experience", { exact: true })).toBeVisible();
  await expect(ideShell).toHaveAttribute("style", workspaceStyle ?? "");
  await expect(ideSurface.getByRole("button", { name: "experience.md", exact: true })).toHaveCount(0);

  if (!await ideSurface.getByLabel("Assert portfolio extension").isVisible()) await agentButton.click();
  await expect(chatInput).toHaveValue("unfinished follow-up");
  await ideSurface.getByRole("button", { name: "New chat" }).click();
  await expect(chatInput).toHaveValue("");
  await expect(chatInput).toBeFocused();
  await expect(ideSurface.getByLabel("Model profile")).toHaveValue("Claude Fable 5");
  await expect(chatConversation.getByText(/Promoted to Associate QA Engineer/)).toHaveCount(0);
});

test("hard refresh starts a fresh IDE and chat session", async ({ page }) => {
  await page.goto("/#/ide/README.md");
  const mobile = (page.viewportSize()?.width ?? 1200) < 768;
  const ideSurface = page.locator('[data-app-surface="ide"]');
  if (mobile) await ideSurface.getByLabel("Mobile workspace").getByRole("button", { name: "Agent" }).click();

  const input = ideSurface.getByLabel("Ask a portfolio question");
  await ideSurface.getByLabel("Model profile").selectOption("Claude Fable 5");
  await input.fill("/help");
  await input.press("Enter");
  await input.fill("draft before refresh");
  await page.reload();

  if (mobile) await ideSurface.getByLabel("Mobile workspace").getByRole("button", { name: "Agent" }).click();
  await expect(ideSurface.getByLabel("Ask a portfolio question")).toHaveValue("");
  await expect(ideSurface.getByLabel("Model profile")).toHaveValue("Assert 2.0");
  await expect(ideSurface.getByLabel("Assert conversation").getByText("/help", { exact: true })).toHaveCount(0);
  await expect(ideSurface.getByLabel("Integrated terminal")).toBeHidden();
});

test("the first paint hides the skip link and IDE navigation switches back to terminal", async ({ page }) => {
  await page.goto("/");
  const skipLink = page.getByRole("link", { name: "Skip to portfolio content" });

  if ((page.viewportSize()?.width ?? 1200) >= 768) {
    const initialBox = await skipLink.boundingBox();
    expect(initialBox).not.toBeNull();
    expect(initialBox!.y + initialBox!.height).toBeLessThanOrEqual(0);
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
  } else {
    await expect(skipLink).toBeHidden();
  }

  await page.goto("/#/ide/README.md");
  await expect(page.getByLabel("Assert loading intro")).toBeHidden();
  await expect(page.locator("#root")).not.toHaveAttribute("aria-hidden", "true");
  await page.getByRole("button", { name: "Switch to terminal" }).click();
  await expect(page).toHaveURL(/#terminal$/);
  await expect(page.getByLabel("Assert loading intro")).toBeHidden();
  await expect(page.getByLabel("Assert portfolio agent startup")).toBeVisible();
});

test("mobile terminal has no horizontal overflow and touch controls work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await finishInitialProfile(page);
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
  await expect(page.getByText("Get in touch")).toBeVisible();
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
  await page.getByLabel("Model profile").selectOption("Claude Fable 5");
  await chat.fill("Which tools does he use?");
  await chat.press("Enter");
  await expect(page.getByText("Reading portfolio/toolbox/tools.md")).toBeVisible();
  await page.getByLabel("Chat response controls").getByText("Show now").click();
  await expect(page.getByLabel("Assert conversation").getByText("Claude Fable 5", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /portfolio\/toolbox\/tools.md/ })).toBeVisible();

  await page.getByRole("button", { name: "Close Assert" }).click();
  await expect(page.getByLabel("Assert portfolio extension")).toBeHidden();
  if ((page.viewportSize()?.width ?? 1200) < 768) await page.getByRole("button", { name: "Agent", exact: true }).last().click();
  else await page.getByRole("button", { name: "Assert" }).click();
  await expect(page.getByLabel("Assert portfolio extension")).toBeVisible();

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

  if ((page.viewportSize()?.width ?? 1200) >= 768) {
    const separator = page.getByRole("separator", { name: "Resize terminal panel" });
    const before = await integratedTerminal.boundingBox();
    await separator.focus();
    await separator.press("ArrowUp");
    const after = await integratedTerminal.boundingBox();
    expect(after!.height).toBeGreaterThan(before!.height);
    await page.getByRole("button", { name: "Maximize terminal panel" }).click();
    const maximized = await integratedTerminal.boundingBox();
    expect(maximized!.height).toBeGreaterThan(after!.height);
    await page.getByRole("button", { name: "Restore terminal panel" }).click();
  }
});

test("unknown prompts are rejected without executing them", async ({ page }) => {
  await page.goto("/");
  await finishInitialProfile(page);
  const input = page.getByLabel("Terminal command");
  await input.fill("rm -rf /");
  await input.press("Enter");
  await expect(page.getByText("Matching portfolio context")).toBeVisible();
  await page.getByRole("button", { name: /Show now/ }).click();
  await expect(page.getByText(/only answer questions covered by this portfolio/).first()).toBeVisible();
});

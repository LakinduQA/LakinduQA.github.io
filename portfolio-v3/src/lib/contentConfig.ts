export const portfolioTextSettingKeys = [
  "identity.name",
  "identity.role",
  "identity.headline",
  "identity.summary",
  "identity.introduction",
  "agent.name",
  "agent.mark",
  "agent.welcome",
  "agent.defaultModel",
  "agent.models",
  "portrait.src",
  "portrait.alt",
  "portrait.label",
  "portrait.caption",
  "contact.email",
  "contact.website",
  "contact.github",
  "contact.linkedin",
  "contact.medium",
  "seo.title",
  "seo.description",
  "seo.socialDescription",
  "seo.image",
  "seo.knowsAbout",
] as const;

export const publishablePortfolioDocumentIds = [
  "about",
  "experience",
  "education",
  "skills",
  "tools",
  "projects",
  "writing",
  "resume",
  "contact",
] as const;

export type PublishablePortfolioDocumentId = typeof publishablePortfolioDocumentIds[number];
export type PortfolioDocumentId = "home" | PublishablePortfolioDocumentId;
export type PortfolioTextSettingKey = typeof portfolioTextSettingKeys[number];
export type PortfolioPublicationKey = `publish.${PublishablePortfolioDocumentId}`;
export type PortfolioSettingKey = PortfolioTextSettingKey | PortfolioPublicationKey;
export type PortfolioPublication = Readonly<Record<PublishablePortfolioDocumentId, boolean>>;
export type PortfolioSettings = Readonly<
  Record<PortfolioTextSettingKey, string> & Record<PortfolioPublicationKey, boolean>
>;

export const portfolioPublicationKeys = publishablePortfolioDocumentIds.map(
  (id) => `publish.${id}` as PortfolioPublicationKey,
);
export const portfolioSettingKeys = [...portfolioPublicationKeys, ...portfolioTextSettingKeys] as const;

function cellsFor(row: string): string[] {
  const cells: string[] = [];
  let value = "";
  let escaped = false;
  for (const character of row.trim().replace(/^\|/, "").replace(/\|$/, "")) {
    if (escaped) {
      value += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === "|") {
      cells.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  if (escaped) value += "\\";
  cells.push(value.trim());
  return cells;
}

export function parsePortfolioSettings(markdown: string): PortfolioSettings {
  const allowed = new Set<string>(portfolioSettingKeys);
  const values = new Map<string, string>();
  const rows = markdown.replace(/\r/g, "").split("\n");

  for (const row of rows) {
    if (!row.trim().startsWith("|")) continue;
    const [key, value] = cellsFor(row);
    if (!key || key.toLowerCase() === "key" || /^-+$/.test(key)) continue;
    if (!allowed.has(key)) throw new Error(`Unknown portfolio configuration key: ${key}`);
    if (values.has(key)) throw new Error(`Duplicate portfolio configuration key: ${key}`);
    if (!value) throw new Error(`Portfolio configuration value is empty: ${key}`);
    values.set(key, value);
  }

  const missing = portfolioSettingKeys.filter((key) => !values.has(key));
  if (missing.length) throw new Error(`Missing portfolio configuration keys: ${missing.join(", ")}`);

  for (const key of portfolioPublicationKeys) {
    const value = values.get(key)!;
    if (value !== "true" && value !== "false") {
      throw new Error(`Portfolio publication flag must be exactly true or false: ${key}`);
    }
  }

  const models = values.get("agent.models")!.split(",").map((model) => model.trim()).filter(Boolean);
  if (!models.includes(values.get("agent.defaultModel")!)) {
    throw new Error("Portfolio default model must be included in agent.models");
  }

  let website: URL;
  let seoImage: URL;
  try {
    website = new URL(values.get("contact.website")!);
  } catch {
    throw new Error("Portfolio website must be an absolute URL: contact.website");
  }
  try {
    seoImage = new URL(values.get("seo.image")!);
  } catch {
    throw new Error("Portfolio SEO image must be an absolute URL: seo.image");
  }
  if (seoImage.protocol !== "https:") {
    throw new Error("Portfolio SEO image must use HTTPS: seo.image");
  }
  if (seoImage.origin !== website.origin) {
    throw new Error("Portfolio SEO image must use the configured portfolio origin: seo.image");
  }
  const portraitUrl = new URL(values.get("portrait.src")!, website);
  if (seoImage.href !== portraitUrl.href) {
    throw new Error("Portfolio SEO image must match the configured portrait path: seo.image");
  }

  const settings = Object.fromEntries([
    ...portfolioTextSettingKeys.map((key) => [key, values.get(key)!]),
    ...portfolioPublicationKeys.map((key) => [key, values.get(key) === "true"]),
  ]) as PortfolioSettings;

  return Object.fromEntries(
    Object.entries(settings).map(([key, value]) => [
      key,
      typeof value === "string" ? resolvePublicationConditionals(value, settings) : value,
    ]),
  ) as PortfolioSettings;
}

export function getPortfolioPublication(settings: PortfolioSettings): PortfolioPublication {
  return Object.fromEntries(
    publishablePortfolioDocumentIds.map((id) => [id, settings[`publish.${id}`]]),
  ) as PortfolioPublication;
}

export function isPortfolioDocumentPublished(
  id: PortfolioDocumentId,
  settingsOrPublication: PortfolioSettings | PortfolioPublication,
): boolean {
  if (id === "home") return true;
  return `publish.${id}` in settingsOrPublication
    ? (settingsOrPublication as PortfolioSettings)[`publish.${id}`]
    : (settingsOrPublication as PortfolioPublication)[id];
}

export function resolvePublicationConditionals(
  content: string,
  settingsOrPublication: PortfolioSettings | PortfolioPublication,
): string {
  const publication = "publish.about" in settingsOrPublication
    ? getPortfolioPublication(settingsOrPublication as PortfolioSettings)
    : settingsOrPublication as PortfolioPublication;
  const resolved = content.replace(
    /\{\{#if\s+([a-z][\w-]*)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, id: string, body: string) => {
      if (!publishablePortfolioDocumentIds.includes(id as PublishablePortfolioDocumentId)) {
        throw new Error(`Unknown portfolio publication conditional: ${id}`);
      }
      return publication[id as PublishablePortfolioDocumentId] ? body : "";
    },
  );
  const unresolved = resolved.match(/\{\{#if\b[^}]*\}\}|\{\{\/if\}\}/)?.[0];
  if (unresolved) throw new Error(`Unresolved portfolio publication conditional: ${unresolved}`);
  return resolved;
}

export function resolveContentTokens(markdown: string, settings: PortfolioSettings): string {
  const conditionalContent = resolvePublicationConditionals(markdown, settings);
  const resolved = conditionalContent.replace(/\{\{([a-zA-Z][\w.-]*)\}\}/g, (_match, key: string) => {
    if (!portfolioTextSettingKeys.includes(key as PortfolioTextSettingKey)) {
      throw new Error(`Unknown portfolio content token: ${key}`);
    }
    return settings[key as PortfolioTextSettingKey];
  });
  const unresolved = resolved.match(/\{\{[^}]+\}\}/)?.[0];
  if (unresolved) throw new Error(`Unresolved portfolio content token: ${unresolved}`);
  return resolved;
}

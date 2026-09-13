import { describe, expect, it } from "vitest";
import configMarkdown from "../content/portfolio/_config.md?raw";
import { curatedArticles } from "../data/articles";
import { createPortfolioMarkdown, portfolioMarkdown } from "../data/content";
import { createPortfolioDocuments, createPortfolioFolders } from "../data/documents";
import { featuredProjects } from "../data/projects";
import { createAgentWelcome, createSlashCommands, resolveAgentQuery } from "./agent";
import { getPortfolioPublication, parsePortfolioSettings, publishablePortfolioDocumentIds, resolveContentTokens } from "./contentConfig";

function withPublicationFlag(markdown: string, id: string, value: boolean): string {
  return markdown.replace(new RegExp(`^\\| publish\\.${id} .*?$`, "m"), `| publish.${id} | ${value} |`);
}

function withAllSectionsPublished(markdown: string): string {
  return publishablePortfolioDocumentIds.reduce(
    (configured, id) => withPublicationFlag(configured, id, true),
    markdown,
  );
}

describe("portfolio Markdown configuration", () => {
  it("loads the verified identity and Assert branding", () => {
    const settings = parsePortfolioSettings(configMarkdown);

    expect(settings["identity.name"]).toBe("Lakindu De Silva");
    expect(settings["identity.role"]).toBe("Quality Engineer");
    expect(settings["agent.name"]).toBe("Assert");
    expect(settings["agent.mark"]).toBe(">_ ASSERT");
    expect(settings["agent.models"].split(",").map((model) => model.trim())).toContain(settings["agent.defaultModel"]);
    expect(Object.values(getPortfolioPublication(settings)).every((value) => typeof value === "boolean")).toBe(true);
    expect(resolveContentTokens("{{identity.name}} — {{identity.role}}", settings)).toBe(
      "Lakindu De Silva — Quality Engineer",
    );
  });

  it("rejects unknown, duplicate, empty, and missing keys", () => {
    expect(() => parsePortfolioSettings(`${configMarkdown}\n| identity.nickname | Laki |`)).toThrow(
      "Unknown portfolio configuration key: identity.nickname",
    );
    expect(() => parsePortfolioSettings(`${configMarkdown}\n| agent.name | Duplicate |`)).toThrow(
      "Duplicate portfolio configuration key: agent.name",
    );
    expect(() => parsePortfolioSettings(configMarkdown.replace("| identity.role | Quality Engineer |", "| identity.role | |"))).toThrow(
      "Portfolio configuration value is empty: identity.role",
    );
    expect(() => parsePortfolioSettings(configMarkdown.replace(/^\| agent\.name .*$/m, ""))).toThrow(
      "Missing portfolio configuration keys: agent.name",
    );
    expect(() => parsePortfolioSettings(`${configMarkdown}\n| publish.timeline | true |`)).toThrow(
      "Unknown portfolio configuration key: publish.timeline",
    );
    expect(() => parsePortfolioSettings(configMarkdown.replace(/^\| publish\.education .*$/m, ""))).toThrow(
      "Missing portfolio configuration keys: publish.education",
    );
    expect(() => parsePortfolioSettings(configMarkdown.replace(/^\| publish\.education .*$/m, "| publish.education | False |"))).toThrow(
      "Portfolio publication flag must be exactly true or false: publish.education",
    );
  });

  it("supports escaped pipes and rejects invalid content tokens", () => {
    const escaped = configMarkdown.replace(/^\| agent\.welcome .*$/m, "| agent.welcome | Left \\| right |");
    expect(parsePortfolioSettings(escaped)["agent.welcome"]).toBe("Left | right");

    const settings = parsePortfolioSettings(configMarkdown);
    expect(() => resolveContentTokens("{{identity.nickname}}", settings)).toThrow(
      "Unknown portfolio content token: identity.nickname",
    );
    expect(() => resolveContentTokens("{{ identity.name }}", settings)).toThrow(
      "Unresolved portfolio content token: {{ identity.name }}",
    );
    expect(() => resolveContentTokens("{{#if timeline}}Soon{{/if}}", settings)).toThrow(
      "Unknown portfolio publication conditional: timeline",
    );
    expect(() => resolveContentTokens("{{#if education}}Soon", settings)).toThrow(
      "Unresolved portfolio publication conditional: {{#if education}}",
    );
  });

  it("requires the default model to exist in the configured model list", () => {
    expect(() => parsePortfolioSettings(configMarkdown.replace(/^\| agent\.defaultModel .*$/m, "| agent.defaultModel | Missing Model |"))).toThrow(
      "Portfolio default model must be included in agent.models",
    );
  });

  it("requires a secure same-origin SEO image that matches the portrait path", () => {
    expect(() => parsePortfolioSettings(configMarkdown.replace(/^\| seo\.image .*$/m, ""))).toThrow(
      "Missing portfolio configuration keys: seo.image",
    );
    expect(() => parsePortfolioSettings(configMarkdown.replace(/^\| seo\.image .*$/m, "| seo.image | |"))).toThrow(
      "Portfolio configuration value is empty: seo.image",
    );
    expect(() => parsePortfolioSettings(configMarkdown.replace(/^\| seo\.image .*$/m, "| seo.image | not-a-url |"))).toThrow(
      "Portfolio SEO image must be an absolute URL: seo.image",
    );
    expect(() => parsePortfolioSettings(configMarkdown.replace(/^\| seo\.image .*$/m, "| seo.image | http://lakinduqa.github.io/media/lakindu-de-silva-quality-engineer.jpg |"))).toThrow(
      "Portfolio SEO image must use HTTPS: seo.image",
    );
    expect(() => parsePortfolioSettings(configMarkdown.replace(/^\| seo\.image .*$/m, "| seo.image | https://example.com/media/lakindu-de-silva-quality-engineer.jpg |"))).toThrow(
      "Portfolio SEO image must use the configured portfolio origin: seo.image",
    );
    expect(() => parsePortfolioSettings(configMarkdown.replace(/^\| seo\.image .*$/m, "| seo.image | https://lakinduqa.github.io/media/different.jpg |"))).toThrow(
      "Portfolio SEO image must match the configured portrait path: seo.image",
    );
    expect(parsePortfolioSettings(configMarkdown)["seo.image"]).toBe(
      "https://lakinduqa.github.io/media/lakindu-de-silva-quality-engineer.jpg",
    );
  });

  it("keeps the detailed employment timeline in the dedicated experience and resume documents", () => {
    const settings = parsePortfolioSettings(withAllSectionsPublished(configMarkdown));
    const documents = createPortfolioDocuments(settings);
    const experience = documents.find((document) => document.path === "portfolio/career/experience.md");
    const resume = documents.find((document) => document.path === "portfolio/resume/resume.md");
    const otherDocuments = documents.filter((document) => ![
      "portfolio/career/experience.md",
      "portfolio/resume/resume.md",
    ].includes(document.path));

    expect(experience?.markdown).toContain("Associate QA Engineer");
    expect(experience?.markdown).toContain("Codimite · September 2026–Present");
    expect(experience?.markdown).toContain("Intern QA Engineer");
    expect(experience?.markdown).toContain("Codimite · March 2026–September 2026");
    expect(resume?.markdown).toContain("Associate QA Engineer");
    expect(resume?.markdown).toContain("Codimite · September 2026–Present");
    expect(resume?.markdown).toContain("Intern QA Engineer");
    expect(resume?.markdown).toContain("Codimite · March 2026–September 2026");
    for (const document of otherDocuments) {
      expect(document.markdown, document.path).not.toMatch(/Codimite · (September 2026–Present|March 2026–September 2026)/);
      expect(document.markdown, document.path).not.toContain("{{");
    }
  });

  it("derives project and article cards from their Markdown documents", () => {
    const projectHeadings = [...portfolioMarkdown.projects.matchAll(/^###\s+(.+)$/gm)].map((match) => match[1]);
    const articleHeadings = [...portfolioMarkdown.articles.matchAll(/^###\s+(.+)$/gm)].map((match) => match[1]);

    expect(featuredProjects.map((project) => project.name)).toEqual(projectHeadings);
    expect(featuredProjects.length).toBeGreaterThan(0);
    expect(featuredProjects.every((project) => project.category && project.description && project.url)).toBe(true);
    expect(curatedArticles.map((article) => article.title)).toEqual(articleHeadings);
    expect(curatedArticles.length).toBeGreaterThan(0);
    expect(curatedArticles.every((article) => article.category && article.description && article.url && article.publishedAt)).toBe(true);
    expect(portfolioMarkdown.projects).not.toContain("{{");
    expect(portfolioMarkdown.articles).not.toContain("{{");
  });

  it("removes disabled education from content, discovery, routing, and agent wording", () => {
    const settings = parsePortfolioSettings(withPublicationFlag(configMarkdown, "education", false));
    const markdown = createPortfolioMarkdown(settings);
    const documents = createPortfolioDocuments(settings, markdown);
    const documentMap = new Map(documents.map((document) => [document.path, document]));

    expect(documents.some((document) => document.id === "education")).toBe(false);
    expect(documentMap.has("portfolio/career/education.md")).toBe(false);
    expect(createSlashCommands(documents).some(({ command }) => command === "/education")).toBe(false);
    expect(markdown.resume).not.toContain("## Education");
    expect(markdown.resume).not.toContain("undergraduate");
    expect(markdown.about).not.toContain("undergraduate");
    expect(markdown.readme).not.toContain("undergraduate");

    for (const query of ["/education", "What is Lakindu studying?", "university", "NIBM"]) {
      expect(resolveAgentQuery(query, "dark", documents).kind, query).toBe("error");
    }
    expect(resolveAgentQuery("/help", "dark", documents).message).not.toContain("education");
    expect(resolveAgentQuery("not a portfolio topic", "dark", documents).message).not.toContain("education");
    expect(createAgentWelcome(documents)).not.toContain("education");
  });

  it("restores every education surface when its publication flag is enabled", () => {
    const settings = parsePortfolioSettings(
      withPublicationFlag(configMarkdown, "education", true),
    );
    const markdown = createPortfolioMarkdown(settings);
    const documents = createPortfolioDocuments(settings, markdown);
    const commands = createSlashCommands(documents);

    expect(documents.some((document) => document.id === "education")).toBe(true);
    expect(commands.some(({ command }) => command === "/education")).toBe(true);
    expect(resolveAgentQuery("/education", "dark", documents).documentPath).toBe("portfolio/career/education.md");
    expect(resolveAgentQuery("What is Lakindu studying?", "dark", documents).documentPath).toBe("portfolio/career/education.md");
    expect(resolveAgentQuery("/help", "dark", documents).message).toContain("education");
    expect(createAgentWelcome(documents)).toContain("education");
    expect(markdown.resume).toContain("## Education");
    expect(markdown.resume).toContain("Higher National Diploma in Information Systems");
    expect(markdown.resume).toContain("GPA: 4.0 · Distinction");
    expect(markdown.about).not.toContain("undergraduate");
    expect(markdown.readme).not.toContain("undergraduate");
    expect(settings["seo.description"]).not.toContain("undergraduate");
  });

  it("removes folders that have no published documents", () => {
    const settings = parsePortfolioSettings(
      withPublicationFlag(withPublicationFlag(configMarkdown, "experience", false), "education", false),
    );
    const documents = createPortfolioDocuments(settings);

    expect(createPortfolioFolders(documents).some(({ folder }) => folder === "career")).toBe(false);
  });
});

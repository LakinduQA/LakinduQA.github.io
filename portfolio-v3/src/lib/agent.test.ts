import { describe, expect, it } from "vitest";
import { portfolioDocumentMap } from "../data/documents";
import { resolveAgentQuery } from "./agent";
import { extractMarkdownSection } from "./markdown";

describe("portfolio agent", () => {
  it("resolves slash commands to Markdown summaries", () => {
    const result = resolveAgentQuery("/experience");
    expect(result.kind).toBe("document");
    expect(result.documentPath).toBe("portfolio/career/experience.md");
    expect(result.message).toContain("Quality Engineering Intern at Codimite");
  });

  it("resolves bounded natural-language questions", () => {
    const result = resolveAgentQuery("Which tools does he use?");
    expect(result.documentPath).toBe("portfolio/toolbox/tools.md");
    expect(result.message).toContain("Playwright");
  });

  it("rejects unrelated prompts with useful suggestions", () => {
    const result = resolveAgentQuery("write me a weather forecast");
    expect(result.kind).toBe("error");
    expect(result.message).toContain("only answer questions covered by this portfolio");
    expect(result.suggestions?.length).toBeGreaterThan(0);
  });

  it("does not accept overlong input", () => {
    const result = resolveAgentQuery("x".repeat(301));
    expect(result.kind).toBe("error");
    expect(result.message).toContain("too long");
  });

  it("extracts summaries from every registered document", () => {
    for (const document of portfolioDocumentMap.values()) {
      expect(extractMarkdownSection(document.markdown, "Summary"), document.path).toBeTruthy();
    }
  });

  it("returns explicit workspace actions", () => {
    expect(resolveAgentQuery("/ide").action).toBe("enter-ide");
    expect(resolveAgentQuery("/theme").action).toBe("toggle-theme");
    expect(resolveAgentQuery("/clear").action).toBe("clear");
  });
});

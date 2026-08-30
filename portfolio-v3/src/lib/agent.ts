import { portfolioDocuments, ROOT_DOCUMENT_PATH } from "../data/documents";
import type { AgentResponse, PortfolioDocument, Theme } from "../types";
import { extractMarkdownSection, plainTextFromMarkdown } from "./markdown";

export const slashCommands = [
  { command: "/about", description: "Meet Lakindu" },
  { command: "/experience", description: "View quality engineering experience" },
  { command: "/education", description: "Review education" },
  { command: "/skills", description: "Explore testing capabilities" },
  { command: "/tools", description: "See tools and technologies" },
  { command: "/projects", description: "Browse selected work" },
  { command: "/writing", description: "Read articles and notes" },
  { command: "/resume", description: "Open the resume summary" },
  { command: "/contact", description: "Find contact details" },
  { command: "/ide", description: "Switch to the portfolio IDE" },
  { command: "/theme", description: "Toggle the color theme" },
  { command: "/help", description: "Show everything you can ask" },
  { command: "/clear", description: "Clear this conversation" },
] as const;

export const exampleQuestions = ["What experience does Lakindu have?", "Which tools does he use?", "Show me his projects"];

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(input: string): string {
  return input.toLowerCase().trim().replace(/[?!.,]/g, "").replace(/\s+/g, " ");
}

function scoreDocument(document: PortfolioDocument, input: string): number {
  return document.aliases.reduce((score, alias) => {
    const normalizedAlias = normalize(alias);
    if (input === normalizedAlias) return Math.max(score, 100 + normalizedAlias.length);
    if (input.includes(normalizedAlias)) return Math.max(score, 50 + normalizedAlias.length);
    return score;
  }, 0);
}

function documentResponse(document: PortfolioDocument, input: string): AgentResponse {
  const section = extractMarkdownSection(document.markdown, "Summary");
  if (!section) {
    return {
      id: makeId(), kind: "error", input,
      message: `I found ${document.path}, but its Summary section is unavailable. Try another topic.`,
      suggestions: ["/about", "/projects", "/contact"],
    };
  }

  return {
    id: makeId(), kind: "document", input,
    message: plainTextFromMarkdown(section),
    documentPath: document.path,
    suggestions: document.id === "projects" ? ["/tools", "/experience", "/contact"] : ["/projects", "/skills", "/contact"],
  };
}

export function resolveAgentQuery(rawInput: string, _theme: Theme = "dark"): AgentResponse {
  void _theme;
  const input = rawInput.trim();
  if (!input) return { id: makeId(), kind: "error", message: "Ask a question or choose one of the guided commands.", suggestions: ["/about", "/projects", "/help"] };
  if (input.length > 300) return { id: makeId(), kind: "error", input, message: "That question is too long for this portfolio guide. Please ask one short question about Lakindu.", suggestions: exampleQuestions };

  const normalized = normalize(input);
  if (normalized === "/clear") return { id: makeId(), kind: "system", input, message: "Conversation cleared.", action: "clear" };
  if (normalized === "/ide" || normalized === "/ui") return { id: makeId(), kind: "system", input, message: "Opening the portfolio workspace…", documentPath: ROOT_DOCUMENT_PATH, action: "enter-ide" };
  if (normalized === "/theme") return { id: makeId(), kind: "system", input, message: "Theme changed.", action: "toggle-theme" };
  if (normalized === "/help" || normalized === "help") {
    return {
      id: makeId(), kind: "system", input,
      message: "I can guide you through Lakindu’s profile, experience, education, skills, tools, projects, writing, resume, and contact details. Use a slash command or ask a short question in your own words.",
      suggestions: ["/about", "/experience", "/projects", "/tools", "/contact", "/ide"],
    };
  }

  const slashName = normalized.startsWith("/") ? normalized.slice(1).split(" ")[0] : undefined;
  const directDocument = slashName ? portfolioDocuments.find((document) => document.id === slashName) : undefined;
  if (directDocument) return documentResponse(directDocument, input);

  const ranked = portfolioDocuments
    .map((document) => ({ document, score: scoreDocument(document, normalized) }))
    .sort((a, b) => b.score - a.score);
  if (ranked[0]?.score) return documentResponse(ranked[0].document, input);

  return {
    id: makeId(), kind: "error", input,
    message: "I can only answer questions covered by this portfolio. Ask about Lakindu’s experience, education, skills, tools, projects, writing, resume, or contact details.",
    suggestions: exampleQuestions,
  };
}

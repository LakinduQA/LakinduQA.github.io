import { portfolioDocuments, ROOT_DOCUMENT_PATH } from "../data/documents";
import { portfolioSettings } from "../data/settings";
import type { AgentResponse, PortfolioDocument, Theme } from "../types";
import { extractMarkdownSection, plainTextFromMarkdown } from "./markdown";

const documentCommandDescriptions = {
  home: "Open the portfolio welcome",
  about: "Meet Lakindu",
  experience: "View quality engineering experience",
  education: "Review education",
  skills: "Explore testing capabilities",
  tools: "See tools and technologies",
  projects: "Browse selected work",
  writing: "Read articles and notes",
  resume: "Open the resume summary",
  contact: "Find contact details",
} as const;

const systemCommands = [
  { command: "/ide", description: "Switch to the portfolio IDE" },
  { command: "/theme", description: "Toggle the color theme" },
  { command: "/help", description: "Show everything you can ask" },
  { command: "/clear", description: "Clear this conversation" },
] as const;

const documentQuestions = {
  home: "Who is Lakindu?",
  about: "Tell me about Lakindu",
  experience: "What experience does Lakindu have?",
  education: "What is Lakindu studying?",
  skills: "What are Lakindu’s testing skills?",
  tools: "Which tools does he use?",
  projects: "Show me his projects",
  writing: "What does Lakindu write about?",
  resume: "Show me Lakindu’s resume",
  contact: "How can I contact Lakindu?",
} as const;

const documentTopicLabels = {
  home: "welcome",
  about: "profile",
  experience: "experience",
  education: "education",
  skills: "skills",
  tools: "tools",
  projects: "projects",
  writing: "writing",
  resume: "resume",
  contact: "contact details",
} as const;

export function createSlashCommands(documents: PortfolioDocument[]) {
  const documentCommands = documents
    .filter((document) => document.id !== "home")
    .map((document) => ({ command: `/${document.id}`, description: documentCommandDescriptions[document.id] }));
  return [...documentCommands, ...systemCommands];
}

export function createExampleQuestions(documents: PortfolioDocument[]): string[] {
  const preferredOrder = ["experience", "tools", "projects", "about", "skills", "contact"];
  return [...documents]
    .filter((document) => document.id !== "home")
    .sort((left, right) => {
      const leftIndex = preferredOrder.indexOf(left.id);
      const rightIndex = preferredOrder.indexOf(right.id);
      return (leftIndex < 0 ? preferredOrder.length : leftIndex) - (rightIndex < 0 ? preferredOrder.length : rightIndex);
    })
    .slice(0, 3)
    .map((document) => documentQuestions[document.id]);
}

export const slashCommands = createSlashCommands(portfolioDocuments);
export const exampleQuestions = createExampleQuestions(portfolioDocuments);

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

function preferredSuggestions(documents: PortfolioDocument[], ids: string[], limit = 3): string[] {
  const publishedIds = new Set(documents.map((document) => document.id));
  return ids.filter((id) => publishedIds.has(id as PortfolioDocument["id"])).slice(0, limit).map((id) => `/${id}`);
}

function topicList(documents: PortfolioDocument[]): string {
  const topics = documents.filter((document) => document.id !== "home").map((document) => documentTopicLabels[document.id]);
  if (topics.length === 0) return "the published portfolio topics";
  if (topics.length === 1) return topics[0];
  return `${topics.slice(0, -1).join(", ")}, or ${topics.at(-1)}`;
}

export function createAgentWelcome(documents: PortfolioDocument[]): string {
  return `Ask me about Lakindu’s ${topicList(documents)}. ${portfolioSettings["agent.welcome"]}`;
}

export const portfolioAgentWelcome = createAgentWelcome(portfolioDocuments);

function documentResponse(document: PortfolioDocument, input: string, documents: PortfolioDocument[]): AgentResponse {
  const section = extractMarkdownSection(document.markdown, "Summary");
  if (!section) {
    return {
      id: makeId(), kind: "error", input,
      message: `I found ${document.path}, but its Summary section is unavailable. Try another topic.`,
      suggestions: preferredSuggestions(documents, ["about", "projects", "contact"]),
    };
  }

  return {
    id: makeId(), kind: "document", input,
    message: plainTextFromMarkdown(section),
    documentPath: document.path,
    document,
    suggestions: document.id === "projects"
      ? preferredSuggestions(documents, ["tools", "experience", "contact"])
      : preferredSuggestions(documents, ["projects", "skills", "contact"]),
  };
}

export function resolveAgentQuery(
  rawInput: string,
  _theme: Theme = "dark",
  documents: PortfolioDocument[] = portfolioDocuments,
): AgentResponse {
  void _theme;
  const questions = createExampleQuestions(documents);
  const input = rawInput.trim();
  if (!input) return { id: makeId(), kind: "error", message: "Ask a question or choose one of the guided commands.", suggestions: [...preferredSuggestions(documents, ["about", "projects"]), "/help"] };
  if (input.length > 300) return { id: makeId(), kind: "error", input, message: "That question is too long for this portfolio guide. Please ask one short question about Lakindu.", suggestions: questions };

  const normalized = normalize(input);
  if (normalized === "/clear") return { id: makeId(), kind: "system", input, message: "Conversation cleared.", action: "clear" };
  if (normalized === "/ide" || normalized === "/ui") return { id: makeId(), kind: "system", input, message: "Opening the portfolio workspace…", documentPath: ROOT_DOCUMENT_PATH, action: "enter-ide" };
  if (normalized.startsWith("/ide ")) {
    const requestedId = normalized.slice(5).trim().replace(/\.md$/, "");
    const requestedDocument = documents.find((document) => document.id === requestedId || document.shortTitle.replace(/\.md$/, "") === requestedId);
    if (requestedDocument) {
      return { id: makeId(), kind: "system", input, message: `Opening ${requestedDocument.path}…`, documentPath: requestedDocument.path, document: requestedDocument, action: "enter-ide" };
    }
  }
  if (normalized === "/theme") return { id: makeId(), kind: "system", input, message: "Theme changed.", action: "toggle-theme" };
  if (normalized === "/help" || normalized === "help") {
    return {
      id: makeId(), kind: "system", input,
      message: `I can guide you through Lakindu’s ${topicList(documents)}. Use a slash command or ask a short question in your own words.`,
      suggestions: [...preferredSuggestions(documents, ["about", "experience", "projects", "tools", "contact"], 5), "/ide"],
    };
  }

  const slashName = normalized.startsWith("/") ? normalized.slice(1).split(" ")[0] : undefined;
  const directDocument = slashName ? documents.find((document) => document.id === slashName) : undefined;
  if (directDocument) return documentResponse(directDocument, input, documents);

  const ranked = documents
    .map((document) => ({ document, score: scoreDocument(document, normalized) }))
    .sort((a, b) => b.score - a.score);
  if (ranked[0]?.score) return documentResponse(ranked[0].document, input, documents);

  return {
    id: makeId(), kind: "error", input,
    message: `I can only answer questions covered by this portfolio. Ask about Lakindu’s ${topicList(documents)}.`,
    suggestions: questions,
  };
}

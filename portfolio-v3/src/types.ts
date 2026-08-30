export type AppMode = "terminal" | "ide";
export type Theme = "dark" | "light";
export type WorkspacePanel = "explorer" | "editor" | "chat" | "terminal";

export interface LinkItem { label: string; url: string }
export interface Project {
  name: string;
  repo: string;
  category: string;
  description: string;
  tags: string[];
  url: string;
  featured: boolean;
  stars?: number;
  updatedAt?: string;
}
export interface Article { title: string; description: string; url: string; category: string; publishedAt?: string }
export interface SkillGroup { title: string; skills: string[] }

export interface PortfolioDocument {
  id: string;
  path: string;
  title: string;
  shortTitle: string;
  folder: string;
  icon: "markdown" | "person" | "career" | "tools" | "projects" | "writing" | "resume" | "contact";
  aliases: string[];
  markdown: string;
}

export interface AgentResponse {
  id: string;
  kind: "document" | "system" | "error";
  input?: string;
  message: string;
  documentPath?: string;
  suggestions?: string[];
  action?: "enter-ide" | "clear" | "toggle-theme";
}

export interface ChatMessage {
  id: string;
  role: "visitor" | "agent";
  text: string;
  documentPath?: string;
  suggestions?: string[];
  error?: boolean;
}

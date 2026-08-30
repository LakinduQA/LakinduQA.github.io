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
  document?: PortfolioDocument;
  suggestions?: string[];
  action?: "enter-ide" | "clear" | "toggle-theme";
}

export type TerminalRunState = "idle" | "thinking" | "streaming" | "completed" | "cancelled" | "error";

export type TerminalInlineToken = {
  type: "text" | "emphasis" | "strong" | "code" | "link";
  text: string;
  href?: string;
};

export interface TerminalOutputBlock {
  id: string;
  type: "heading" | "paragraph" | "list" | "code" | "link" | "spacer" | "divider";
  content: string;
  level?: number;
  ordered?: boolean;
  language?: string;
  href?: string;
  tokens?: TerminalInlineToken[];
}

export interface TerminalExecutionMetrics {
  startedAt: number;
  elapsedMs: number;
  linesPrinted: number;
}

export interface TerminalTranscriptEntry {
  id: string;
  command: string;
  state: TerminalRunState;
  phase?: string;
  response: AgentResponse;
  blocks: TerminalOutputBlock[];
  activeBlock?: TerminalOutputBlock;
  metrics: TerminalExecutionMetrics;
}

export interface ChatMessage {
  id: string;
  role: "visitor" | "agent";
  text: string;
  documentPath?: string;
  suggestions?: string[];
  error?: boolean;
}

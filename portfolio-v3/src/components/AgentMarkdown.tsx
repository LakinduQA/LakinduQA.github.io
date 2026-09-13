import { type ReactNode } from "react";
import { parseTerminalInline } from "../lib/terminalMarkdown";
import type { TerminalOutputBlock } from "../types";

function tokensFor(block: TerminalOutputBlock): ReactNode {
  return (block.tokens ?? parseTerminalInline(block.content)).map((token, index) => {
    const key = `${block.id}-${index}`;
    if (token.type === "link") return <a key={key} href={token.href} target="_blank" rel="noreferrer">{token.text} <span aria-hidden="true">↗</span><span className="terminal-link-destination">{token.href}</span></a>;
    if (token.type === "code") return <code key={key}>{token.text}</code>;
    if (token.type === "strong") return <strong key={key}>{token.text}</strong>;
    if (token.type === "emphasis") return <em key={key}>{token.text}</em>;
    return <span key={key}>{token.text}</span>;
  });
}

export function AgentMarkdownBlock({ block, active = false }: { block: TerminalOutputBlock; active?: boolean }) {
  const content = tokensFor(block);
  const cursor = active ? <span className="terminal-stream-cursor" aria-hidden="true" /> : null;
  if (block.type === "spacer") return <div className="terminal-output-spacer" aria-hidden="true" />;
  if (block.type === "divider") return <div className="terminal-output-divider" aria-hidden="true">────────────────────────────────</div>;
  if (block.type === "heading") return <div className={`terminal-output-heading terminal-output-heading--${block.level ?? 2}`} role="heading" aria-level={block.level ?? 2}><span className="terminal-heading-mark" aria-hidden="true">{"#".repeat(block.level ?? 2)}</span> {content}{cursor}</div>;
  if (block.type === "list") return <div className="terminal-output-list"><span aria-hidden="true">{block.ordered ? "1." : "•"}</span><div>{content}{cursor}</div></div>;
  if (block.type === "code") return <pre className="terminal-output-code"><span className="terminal-code-language">{block.language || "text"}</span><code>{block.content}</code>{cursor}</pre>;
  if (block.type === "link") return <div className="terminal-output-link">{content}{cursor}</div>;
  return <p className="terminal-output-paragraph">{content}{cursor}</p>;
}

import type { TerminalInlineToken, TerminalOutputBlock } from "../types";

let blockSequence = 0;

function block(type: TerminalOutputBlock["type"], content = "", extra: Partial<TerminalOutputBlock> = {}): TerminalOutputBlock {
  blockSequence += 1;
  return { id: `terminal-block-${blockSequence}`, type, content, ...extra };
}

export function parseTerminalInline(value: string): TerminalInlineToken[] {
  const tokens: TerminalInlineToken[] = [];
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > cursor) tokens.push({ type: "text", text: value.slice(cursor, match.index) });
    if (match[2] && match[3]) tokens.push({ type: "link", text: match[2], href: match[3] });
    else if (match[4]) tokens.push({ type: "code", text: match[4] });
    else if (match[5] || match[6]) tokens.push({ type: "strong", text: match[5] ?? match[6] });
    else tokens.push({ type: "emphasis", text: match[7] ?? match[8] });
    cursor = pattern.lastIndex;
  }
  if (cursor < value.length) tokens.push({ type: "text", text: value.slice(cursor) });
  return tokens.length ? tokens : [{ type: "text", text: value }];
}

export function parseMarkdownForTerminal(markdown: string | null | undefined): TerminalOutputBlock[] {
  if (!markdown || !markdown.trim()) return [block("paragraph", "Document is empty or unavailable.")];

  const lines = markdown.replace(/\r/g, "").split("\n");
  const blocks: TerminalOutputBlock[] = [];
  let paragraph: string[] = [];
  let inCode = false;
  let codeLanguage = "";
  let codeLines: string[] = [];

  const flushParagraph = () => {
    const content = paragraph.join(" ").trim();
    if (content) blocks.push(block("paragraph", content, { tokens: parseTerminalInline(content) }));
    paragraph = [];
  };
  const flushCode = () => {
    blocks.push(block("code", codeLines.join("\n"), { language: codeLanguage }));
    codeLines = [];
    codeLanguage = "";
  };

  for (const sourceLine of lines) {
    const line = sourceLine.trimEnd();
    if (line.trim().startsWith("```")) {
      flushParagraph();
      if (inCode) flushCode();
      else codeLanguage = line.trim().slice(3).trim();
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeLines.push(sourceLine);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      if (blocks.at(-1)?.type !== "spacer") blocks.push(block("spacer"));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const listItem = line.match(/^\s*(?:(\d+)\.|[-*+])\s+(.+)$/);
    const divider = /^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line);
    const standaloneLink = line.trim().match(/^\[([^\]]+)\]\(([^)]+)\)$/);

    if (heading) {
      flushParagraph();
      blocks.push(block("heading", heading[2], { level: heading[1].length, tokens: parseTerminalInline(heading[2]) }));
    } else if (divider) {
      flushParagraph();
      blocks.push(block("divider"));
    } else if (listItem) {
      flushParagraph();
      blocks.push(block("list", listItem[2], { ordered: Boolean(listItem[1]), tokens: parseTerminalInline(listItem[2]) }));
    } else if (standaloneLink) {
      flushParagraph();
      blocks.push(block("link", standaloneLink[1], { href: standaloneLink[2], tokens: [{ type: "link", text: standaloneLink[1], href: standaloneLink[2] }] }));
    } else {
      paragraph.push(line.trim());
    }
  }

  flushParagraph();
  if (inCode || codeLines.length) flushCode();
  while (blocks.at(-1)?.type === "spacer") blocks.pop();
  return blocks.length ? blocks : [block("paragraph", "Document is empty or unavailable.")];
}

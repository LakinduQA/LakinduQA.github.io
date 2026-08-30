import type { TerminalOutputBlock } from "../types";

export const THINKING_PHASES = ["Reading", "Matching portfolio context", "Formatting terminal output"] as const;

export function deterministicThinkingDelay(markdownLength: number): number {
  return Math.min(1800, Math.max(1100, 1100 + Math.round(markdownLength * 0.72)));
}

export function terminalLineCount(blocks: TerminalOutputBlock[]): number {
  return blocks.reduce((count, item) => {
    if (item.type === "spacer") return count + 1;
    if (item.type === "code") return count + Math.max(1, item.content.split("\n").length);
    return count + 1;
  }, 0);
}

export function streamSlices(content: string, blockType: TerminalOutputBlock["type"]): string[] {
  if (!content) return [""];
  if (blockType !== "paragraph") return [content];
  const words = content.split(/\s+/);
  const size = 7;
  const slices: string[] = [];
  for (let index = size; index < words.length; index += size) slices.push(words.slice(0, index).join(" "));
  slices.push(content);
  return slices;
}

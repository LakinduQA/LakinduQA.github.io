import { describe, expect, it } from "vitest";
import { parseMarkdownForTerminal, parseTerminalInline } from "./terminalMarkdown";
import { deterministicThinkingDelay, streamSlices, terminalLineCount } from "./terminalRuntime";

describe("terminal Markdown parser", () => {
  it("parses headings, paragraphs, lists, code, links, and dividers", () => {
    const blocks = parseMarkdownForTerminal(`# Title\n\nA **bold** paragraph with [Docs](https://example.com) and \`code\`.\n\n- First\n1. Second\n\n---\n\n\`\`\`ts\nconst ok = true;\n\`\`\``);
    expect(blocks.map((block) => block.type)).toEqual(expect.arrayContaining(["heading", "paragraph", "list", "divider", "code"]));
    expect(blocks.find((block) => block.type === "code")?.language).toBe("ts");
    expect(blocks.find((block) => block.type === "paragraph")?.tokens).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "strong", text: "bold" }),
      expect.objectContaining({ type: "link", href: "https://example.com" }),
      expect.objectContaining({ type: "code", text: "code" }),
    ]));
  });

  it("returns a safe error block for missing or malformed content", () => {
    expect(parseMarkdownForTerminal(undefined)[0].content).toMatch(/unavailable/);
    const malformed = parseMarkdownForTerminal("```ts\nconst unfinished = true");
    expect(malformed.at(-1)?.type).toBe("code");
  });

  it("creates deterministic bounded delays and paragraph word slices", () => {
    expect(deterministicThinkingDelay(0)).toBe(1100);
    expect(deterministicThinkingDelay(100_000)).toBe(1800);
    expect(streamSlices("one two three four five six seven eight nine", "paragraph")).toEqual([
      "one two three four five six seven",
      "one two three four five six seven eight nine",
    ]);
    expect(streamSlices("Heading", "heading")).toEqual(["Heading"]);
  });

  it("counts terminal lines including code and spacing", () => {
    const blocks = parseMarkdownForTerminal("# Title\n\n```\na\nb\n```");
    expect(terminalLineCount(blocks)).toBeGreaterThanOrEqual(4);
    expect(parseTerminalInline("plain")).toEqual([{ type: "text", text: "plain" }]);
  });
});

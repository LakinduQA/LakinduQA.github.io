function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractMarkdownSection(markdown: string, heading: string): string | undefined {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const headingPattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "i");
  const start = lines.findIndex((line) => headingPattern.test(line.trim()));
  if (start < 0) return undefined;

  const section: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,2}\s+/.test(line.trim())) break;
    section.push(line);
  }

  const value = section.join("\n").trim();
  return value || undefined;
}

export function plainTextFromMarkdown(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

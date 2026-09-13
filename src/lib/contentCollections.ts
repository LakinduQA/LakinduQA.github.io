import type { Article, Project } from "../types";

function sections(markdown: string): Array<{ title: string; body: string }> {
  const matches = [...markdown.replace(/\r/g, "").matchAll(/^###\s+(.+)$/gm)];
  return matches.map((match, index) => ({
    title: match[1].trim(),
    body: markdown.slice((match.index ?? 0) + match[0].length, matches[index + 1]?.index ?? markdown.length).trim(),
  }));
}

function field(body: string, label: string): string | undefined {
  return body.match(new RegExp(`^-\\s+${label}:\\s+(.+)$`, "im"))?.[1].trim();
}

function link(value: string | undefined): { label: string; url: string } | undefined {
  const match = value?.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  return match ? { label: match[1], url: match[2] } : undefined;
}

function description(body: string): string {
  return body.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("- ")).join(" ");
}

export function parseProjects(markdown: string): Project[] {
  return sections(markdown).map(({ title, body }) => {
    const repository = link(field(body, "Repository"));
    if (!repository) throw new Error(`Project is missing a Repository link: ${title}`);
    const repo = repository.url.replace(/\/$/, "").split("/").pop();
    if (!repo) throw new Error(`Project has an invalid Repository link: ${title}`);
    return {
      name: title,
      repo,
      category: field(body, "Category") ?? "Quality engineering",
      description: description(body),
      tags: (field(body, "Tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
      url: repository.url,
      featured: true,
    };
  });
}

export function parseArticles(markdown: string): Article[] {
  return sections(markdown).map(({ title, body }) => {
    const articleLink = link(field(body, "URL"));
    if (!articleLink) throw new Error(`Article is missing a URL: ${title}`);
    return {
      title,
      description: description(body),
      url: articleLink.url,
      category: field(body, "Category") ?? "Quality engineering",
      publishedAt: field(body, "Published"),
    };
  });
}

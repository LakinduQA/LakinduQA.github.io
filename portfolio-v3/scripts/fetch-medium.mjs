import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const feedUrl = "https://medium.com/feed/@lakindudesilva007";
const outputPath = resolve("dist", "data", "medium.json");

function decode(value = "") {
  return value
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function field(item, tag) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decode(match?.[1]);
}

function parseFeed(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 8).map((match) => {
    const item = match[1];
    const content = field(item, "content:encoded");
    return {
      title: field(item, "title"),
      description: content.slice(0, 180) + (content.length > 180 ? "…" : ""),
      url: field(item, "link"),
      category: field(item, "category") || "Quality engineering",
      publishedAt: field(item, "pubDate"),
    };
  }).filter((article) => article.title && article.url);
}

await mkdir(resolve("dist", "data"), { recursive: true });

try {
  const response = await fetch(feedUrl, { headers: { "User-Agent": "LakinduPortfolio/3.0" } });
  if (!response.ok) throw new Error(`Medium returned ${response.status}`);
  const articles = parseFeed(await response.text());
  if (!articles.length) throw new Error("Medium feed contained no articles");
  await writeFile(outputPath, JSON.stringify(articles, null, 2));
  console.log(`Medium snapshot: ${articles.length} articles`);
} catch (error) {
  await writeFile(outputPath, "[]\n");
  console.warn(`Medium snapshot unavailable; bundled fallback will be used (${error.message})`);
}

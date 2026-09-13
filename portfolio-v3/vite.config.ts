import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin, type ResolvedConfig } from "vite";
import { parsePortfolioSettings } from "./src/lib/contentConfig";
import {
  buildProfilePageJsonLd,
  buildRobotsTxt,
  buildSitemapXml,
  googleSiteVerification,
  inspectJpeg,
  portraitHeight,
  portraitWidth,
  renderPortfolioHtml,
} from "./src/lib/seo";

const configurationPath = fileURLToPath(new URL("./src/content/portfolio/_config.md", import.meta.url));
const settings = parsePortfolioSettings(readFileSync(configurationPath, "utf8"));

function countMatches(value: string, pattern: RegExp): number {
  return [...value.matchAll(pattern)].length;
}

function assertExactlyOne(html: string, pattern: RegExp, label: string): void {
  const count = countMatches(html, pattern);
  if (count !== 1) throw new Error(`Production HTML must contain exactly one ${label}; found ${count}`);
}

function verifyProductionOutput(outputDirectory: string): void {
  const html = readFileSync(resolve(outputDirectory, "index.html"), "utf8");
  const robots = readFileSync(resolve(outputDirectory, "robots.txt"), "utf8");
  const sitemap = readFileSync(resolve(outputDirectory, "sitemap.xml"), "utf8");
  const portrait = readFileSync(resolve(outputDirectory, settings["portrait.src"]));
  const image = inspectJpeg(portrait);

  if (html.includes("{{")) throw new Error("Production HTML contains an unresolved template token");
  if (/education/i.test(html)) throw new Error("Production metadata or static profile contains education wording");
  if (/<meta\s+[^>]*(?:name|property)=["']keywords["']/i.test(html)) {
    throw new Error("Production HTML must not contain a keywords meta tag");
  }

  assertExactlyOne(html, /<title>[^<]+<\/title>/gi, "title");
  assertExactlyOne(html, /<link\s+rel=["']canonical["'][^>]*>/gi, "canonical link");
  for (const name of ["description", "author", "google-site-verification", "twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) {
    assertExactlyOne(html, new RegExp(`<meta\\s+[^>]*name=["']${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`, "gi"), `${name} metadata`);
  }
  for (const property of ["og:type", "og:url", "og:title", "og:description", "og:site_name", "og:locale", "og:image", "og:image:secure_url", "og:image:type", "og:image:width", "og:image:height", "og:image:alt"]) {
    assertExactlyOne(html, new RegExp(`<meta\\s+[^>]*property=["']${property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`, "gi"), `${property} metadata`);
  }
  for (const value of [settings["seo.title"], settings["seo.description"], settings["seo.socialDescription"], settings["seo.image"], settings["identity.name"], settings["identity.role"], settings["portrait.alt"], googleSiteVerification]) {
    if (!html.includes(value.replace(/&/g, "&amp;").replace(/"/g, "&quot;"))) {
      throw new Error(`Production HTML is missing configured SEO content: ${value}`);
    }
  }
  if (!html.includes('data-static-profile="true"')) throw new Error("Production HTML is missing the static profile snapshot");
  if (!html.includes(`src="/${settings["portrait.src"]}"`) || !html.includes(`width="${portraitWidth}"`) || !html.includes(`height="${portraitHeight}"`)) {
    throw new Error("Static portrait markup does not use the configured image and intrinsic dimensions");
  }

  const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
  if (!jsonLdMatch) throw new Error("Production HTML is missing JSON-LD");
  const actualJsonLd = JSON.parse(jsonLdMatch[1]);
  if (JSON.stringify(actualJsonLd) !== JSON.stringify(buildProfilePageJsonLd(settings))) {
    throw new Error("Production ProfilePage JSON-LD does not match the configured graph");
  }

  if (robots !== buildRobotsTxt(settings)) throw new Error("Production robots.txt does not match portfolio configuration");
  if (sitemap !== buildSitemapXml(settings)) throw new Error("Production sitemap.xml does not match portfolio configuration");
  if (image.width !== portraitWidth || image.height !== portraitHeight) {
    throw new Error(`Portrait dimensions must be ${portraitWidth}x${portraitHeight}; found ${image.width}x${image.height}`);
  }
  if (!image.progressive) throw new Error("Portrait must use progressive JPEG encoding");
  if (image.metadataMarkers.length) throw new Error("Portrait contains retained metadata segments");
}

function portfolioSeoPlugin(): Plugin {
  let resolvedConfig: ResolvedConfig;
  return {
    name: "portfolio-seo",
    configResolved(config: ResolvedConfig) {
      resolvedConfig = config;
    },
    transformIndexHtml(html: string) {
      return renderPortfolioHtml(html, settings);
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "robots.txt", source: buildRobotsTxt(settings) });
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: buildSitemapXml(settings) });
    },
    closeBundle() {
      if (resolvedConfig.command !== "build") return;
      verifyProductionOutput(resolve(resolvedConfig.root, resolvedConfig.build.outDir));
    },
  };
}

export default defineConfig({
  plugins: [react(), portfolioSeoPlugin()],
  base: "/",
  build: { sourcemap: true, target: "es2020" },
});

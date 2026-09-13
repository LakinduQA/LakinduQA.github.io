import type { PortfolioSettings, PortfolioTextSettingKey } from "./contentConfig";
import { portfolioTextSettingKeys } from "./contentConfig";

export const portraitWidth = 1200;
export const portraitHeight = 1661;
export const googleSiteVerification = "dO4eFPMtvHbfTNPqoY8zkGnM1XNC778ci9Ug_Z_XPsU";

export function buildProfilePageJsonLd(settings: PortfolioSettings) {
  const pageId = new URL("#profile-page", settings["contact.website"]).href;
  const personId = new URL("#person", settings["contact.website"]).href;
  const imageId = new URL("#primary-image", settings["contact.website"]).href;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": pageId,
        url: settings["contact.website"],
        name: settings["seo.title"],
        description: settings["seo.description"],
        primaryImageOfPage: { "@id": imageId },
        mainEntity: { "@id": personId },
      },
      {
        "@type": "ImageObject",
        "@id": imageId,
        url: settings["seo.image"],
        contentUrl: settings["seo.image"],
        width: portraitWidth,
        height: portraitHeight,
        caption: settings["portrait.alt"],
      },
      {
        "@type": "Person",
        "@id": personId,
        name: settings["identity.name"],
        alternateName: settings["portrait.label"],
        jobTitle: settings["identity.role"],
        description: settings["identity.introduction"],
        url: settings["contact.website"],
        image: { "@id": imageId },
        sameAs: [settings["contact.github"], settings["contact.linkedin"], settings["contact.medium"]],
        knowsAbout: settings["seo.knowsAbout"].split(",").map((topic) => topic.trim()).filter(Boolean),
      },
    ],
  };
}

export function serializeProfilePageJsonLd(settings: PortfolioSettings): string {
  return JSON.stringify(buildProfilePageJsonLd(settings))
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeXml(value: string): string {
  return escapeHtml(value).replace(/'/g, "&apos;");
}

export function renderPortfolioHtml(html: string, settings: PortfolioSettings): string {
  const values: Record<PortfolioTextSettingKey, string> = Object.fromEntries(
    portfolioTextSettingKeys.map((key) => [key, settings[key]]),
  ) as Record<PortfolioTextSettingKey, string>;
  const rendered = html
    .replace("{{seo.jsonLd}}", serializeProfilePageJsonLd(settings))
    .replace(/\{\{([a-zA-Z][\w.-]*)\}\}/g, (_match, key: string) => {
      if (!portfolioTextSettingKeys.includes(key as PortfolioTextSettingKey)) {
        throw new Error(`Unknown index.html portfolio token: ${key}`);
      }
      return escapeHtml(values[key as PortfolioTextSettingKey]);
    });
  const unresolved = rendered.match(/\{\{[^}]+\}\}/)?.[0];
  if (unresolved) throw new Error(`Unresolved index.html portfolio token: ${unresolved}`);
  return rendered;
}

export function buildRobotsTxt(settings: PortfolioSettings): string {
  const sitemapUrl = new URL("sitemap.xml", settings["contact.website"]).href;
  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`;
}

export function buildSitemapXml(settings: PortfolioSettings): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    "  <url>",
    `    <loc>${escapeXml(settings["contact.website"])}</loc>`,
    "    <image:image>",
    `      <image:loc>${escapeXml(settings["seo.image"])}</image:loc>`,
    "    </image:image>",
    "  </url>",
    "</urlset>",
    "",
  ].join("\n");
}

export interface JpegInspection {
  width: number;
  height: number;
  progressive: boolean;
  metadataMarkers: number[];
}

export function inspectJpeg(bytes: Uint8Array): JpegInspection {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error("Portrait is not a JPEG file");
  }

  let offset = 2;
  let width = 0;
  let height = 0;
  let progressive = false;
  const metadataMarkers: number[] = [];
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

  while (offset + 3 < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 1 >= bytes.length) break;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      throw new Error("Portrait contains an invalid JPEG segment");
    }
    if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) metadataMarkers.push(marker);
    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      progressive = marker === 0xc2;
    }
    offset += segmentLength;
  }

  if (!width || !height) throw new Error("Portrait JPEG dimensions could not be read");
  return { width, height, progressive, metadataMarkers };
}

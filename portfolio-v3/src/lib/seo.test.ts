import { describe, expect, it } from "vitest";
import configMarkdown from "../content/portfolio/_config.md?raw";
import { parsePortfolioSettings } from "./contentConfig";
import {
  buildProfilePageJsonLd,
  buildRobotsTxt,
  buildSitemapXml,
  portraitHeight,
  portraitWidth,
  renderPortfolioHtml,
} from "./seo";

const settings = parsePortfolioSettings(configMarkdown);

describe("portfolio SEO generation", () => {
  it("builds a connected ProfilePage, Person, and ImageObject graph", () => {
    const structuredData = buildProfilePageJsonLd(settings);
    const graph = structuredData["@graph"];
    const page = graph.find((node) => node["@type"] === "ProfilePage");
    const person = graph.find((node) => node["@type"] === "Person");
    const image = graph.find((node) => node["@type"] === "ImageObject");

    expect(page).toMatchObject({
      "@id": "https://lakinduqa.github.io/#profile-page",
      url: settings["contact.website"],
      name: settings["seo.title"],
      description: settings["seo.description"],
      primaryImageOfPage: { "@id": "https://lakinduqa.github.io/#primary-image" },
      mainEntity: { "@id": "https://lakinduqa.github.io/#person" },
    });
    expect(person).toMatchObject({
      "@id": "https://lakinduqa.github.io/#person",
      name: settings["identity.name"],
      alternateName: settings["portrait.label"],
      jobTitle: settings["identity.role"],
      image: { "@id": "https://lakinduqa.github.io/#primary-image" },
      sameAs: [settings["contact.github"], settings["contact.linkedin"], settings["contact.medium"]],
    });
    expect(image).toMatchObject({
      "@id": "https://lakinduqa.github.io/#primary-image",
      contentUrl: settings["seo.image"],
      width: portraitWidth,
      height: portraitHeight,
      caption: settings["portrait.alt"],
    });
    expect(JSON.stringify(structuredData)).not.toMatch(/education|dateCreated|dateModified/i);
  });

  it("renders configuration tokens and rejects unknown index tokens", () => {
    const template = "<title>{{seo.title}}</title><p>{{identity.name}}</p><script>{{seo.jsonLd}}</script>";
    const rendered = renderPortfolioHtml(template, settings);

    expect(rendered).toContain(`<title>${settings["seo.title"]}</title>`);
    expect(rendered).toContain('"@type":"ProfilePage"');
    expect(rendered).not.toContain("{{");
    expect(() => renderPortfolioHtml("{{identity.nickname}}", settings)).toThrow(
      "Unknown index.html portfolio token: identity.nickname",
    );
  });

  it("generates one canonical image-aware sitemap and matching robots directive", () => {
    expect(buildRobotsTxt(settings)).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://lakinduqa.github.io/sitemap.xml\n",
    );
    const sitemap = buildSitemapXml(settings);
    expect(sitemap.match(/<url>/g)).toHaveLength(1);
    expect(sitemap.match(/<loc>https:\/\/lakinduqa\.github\.io\/<\/loc>/g)).toHaveLength(1);
    expect(sitemap.match(/<image:loc>https:\/\/lakinduqa\.github\.io\/media\/lakindu-de-silva-quality-engineer\.jpg<\/image:loc>/g)).toHaveLength(1);
  });
});

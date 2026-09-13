import type { PortfolioDocument } from "../types";
import { isPortfolioDocumentPublished } from "../lib/contentConfig";
import type { PortfolioSettings } from "../lib/contentConfig";
import { createPortfolioMarkdown, portfolioMarkdown } from "./content";
import type { PortfolioMarkdown } from "./content";
import { portfolioSettings } from "./settings";

export const ROOT_DOCUMENT_PATH = "portfolio/README.md";

function completeDocumentCatalog(markdown: PortfolioMarkdown): PortfolioDocument[] {
  return [
    { id: "home", path: ROOT_DOCUMENT_PATH, title: "Welcome", shortTitle: "README.md", folder: "", icon: "markdown", aliases: ["home", "welcome", "who is lakindu"], markdown: markdown.readme },
    { id: "about", path: "portfolio/profile/about.md", title: "About Lakindu", shortTitle: "about.md", folder: "profile", icon: "person", aliases: ["about", "who are you", "tell me about lakindu", "profile", "background"], markdown: markdown.about },
    { id: "experience", path: "portfolio/career/experience.md", title: "Experience", shortTitle: "experience.md", folder: "career", icon: "career", aliases: ["experience", "work experience", "career", "job", "codimite", "where does lakindu work"], markdown: markdown.experience },
    { id: "education", path: "portfolio/career/education.md", title: "Education", shortTitle: "education.md", folder: "career", icon: "career", aliases: ["education", "study", "studying", "university", "degree", "nibm", "coventry", "gpa"], markdown: markdown.education },
    { id: "skills", path: "portfolio/toolbox/skills.md", title: "Skills", shortTitle: "skills.md", folder: "toolbox", icon: "tools", aliases: ["skills", "capabilities", "testing skills", "what can lakindu do"], markdown: markdown.skills },
    { id: "tools", path: "portfolio/toolbox/tools.md", title: "Tools and technologies", shortTitle: "tools.md", folder: "toolbox", icon: "tools", aliases: ["tools", "technologies", "tech stack", "playwright", "jmeter", "postman", "burp suite"], markdown: markdown.tools },
    { id: "projects", path: "portfolio/work/projects.md", title: "Projects", shortTitle: "projects.md", folder: "work", icon: "projects", aliases: ["projects", "portfolio work", "repositories", "github projects", "show me the projects"], markdown: markdown.projects },
    { id: "writing", path: "portfolio/writing/articles.md", title: "Writing", shortTitle: "articles.md", folder: "writing", icon: "writing", aliases: ["writing", "articles", "blog", "medium", "posts"], markdown: markdown.articles },
    { id: "resume", path: "portfolio/resume/resume.md", title: "Resume", shortTitle: "resume.md", folder: "resume", icon: "resume", aliases: ["resume", "cv", "curriculum vitae", "download resume"], markdown: markdown.resume },
    { id: "contact", path: "portfolio/contact/contact.md", title: "Contact", shortTitle: "contact.md", folder: "contact", icon: "contact", aliases: ["contact", "email", "linkedin", "github", "hire", "reach lakindu"], markdown: markdown.contact },
  ];
}

export function createPortfolioDocuments(
  settings: PortfolioSettings,
  markdown = createPortfolioMarkdown(settings),
): PortfolioDocument[] {
  return completeDocumentCatalog(markdown).filter((document) => isPortfolioDocumentPublished(document.id, settings));
}

export function createPortfolioFolders(documents: PortfolioDocument[]): Array<{ folder: string; documents: PortfolioDocument[] }> {
  const folderOrder = ["profile", "career", "toolbox", "work", "writing", "resume", "contact"];
  return folderOrder
    .map((folder) => ({ folder, documents: documents.filter((document) => document.folder === folder) }))
    .filter(({ documents: folderDocuments }) => folderDocuments.length > 0);
}

export const portfolioDocuments = createPortfolioDocuments(portfolioSettings, portfolioMarkdown);
export const portfolioFolders = createPortfolioFolders(portfolioDocuments);

export const portfolioDocumentMap = new Map(portfolioDocuments.map((document) => [document.path, document]));

import readme from "../content/portfolio/README.md?raw";
import about from "../content/portfolio/profile/about.md?raw";
import experience from "../content/portfolio/career/experience.md?raw";
import education from "../content/portfolio/career/education.md?raw";
import skills from "../content/portfolio/toolbox/skills.md?raw";
import tools from "../content/portfolio/toolbox/tools.md?raw";
import projects from "../content/portfolio/work/projects.md?raw";
import articles from "../content/portfolio/writing/articles.md?raw";
import resume from "../content/portfolio/resume/resume.md?raw";
import contact from "../content/portfolio/contact/contact.md?raw";
import type { PortfolioDocument } from "../types";

export const ROOT_DOCUMENT_PATH = "portfolio/README.md";

export const portfolioDocuments: PortfolioDocument[] = [
  { id: "home", path: ROOT_DOCUMENT_PATH, title: "Welcome", shortTitle: "README.md", folder: "", icon: "markdown", aliases: ["home", "welcome", "lakindu", "who is lakindu"], markdown: readme },
  { id: "about", path: "portfolio/profile/about.md", title: "About Lakindu", shortTitle: "about.md", folder: "profile", icon: "person", aliases: ["about", "who are you", "tell me about lakindu", "profile", "background"], markdown: about },
  { id: "experience", path: "portfolio/career/experience.md", title: "Experience", shortTitle: "experience.md", folder: "career", icon: "career", aliases: ["experience", "work experience", "career", "job", "codimite", "where does lakindu work"], markdown: experience },
  { id: "education", path: "portfolio/career/education.md", title: "Education", shortTitle: "education.md", folder: "career", icon: "career", aliases: ["education", "study", "university", "degree", "nibm", "coventry", "gpa"], markdown: education },
  { id: "skills", path: "portfolio/toolbox/skills.md", title: "Skills", shortTitle: "skills.md", folder: "toolbox", icon: "tools", aliases: ["skills", "capabilities", "testing skills", "what can lakindu do"], markdown: skills },
  { id: "tools", path: "portfolio/toolbox/tools.md", title: "Tools and technologies", shortTitle: "tools.md", folder: "toolbox", icon: "tools", aliases: ["tools", "technologies", "tech stack", "playwright", "jmeter", "postman", "burp suite"], markdown: tools },
  { id: "projects", path: "portfolio/work/projects.md", title: "Projects", shortTitle: "projects.md", folder: "work", icon: "projects", aliases: ["projects", "portfolio work", "repositories", "github projects", "show me the projects"], markdown: projects },
  { id: "writing", path: "portfolio/writing/articles.md", title: "Writing", shortTitle: "articles.md", folder: "writing", icon: "writing", aliases: ["writing", "articles", "blog", "medium", "posts"], markdown: articles },
  { id: "resume", path: "portfolio/resume/resume.md", title: "Resume", shortTitle: "resume.md", folder: "resume", icon: "resume", aliases: ["resume", "cv", "curriculum vitae", "download resume"], markdown: resume },
  { id: "contact", path: "portfolio/contact/contact.md", title: "Contact", shortTitle: "contact.md", folder: "contact", icon: "contact", aliases: ["contact", "email", "linkedin", "github", "hire", "reach lakindu"], markdown: contact },
];

export const portfolioDocumentMap = new Map(portfolioDocuments.map((document) => [document.path, document]));

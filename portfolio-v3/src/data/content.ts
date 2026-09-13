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
import { resolveContentTokens } from "../lib/contentConfig";
import type { PortfolioSettings } from "../lib/contentConfig";
import { portfolioSettings } from "./settings";

const rawPortfolioMarkdown = { readme, about, experience, education, skills, tools, projects, articles, resume, contact } as const;

export type PortfolioMarkdown = Readonly<Record<keyof typeof rawPortfolioMarkdown, string>>;

export function createPortfolioMarkdown(settings: PortfolioSettings): PortfolioMarkdown {
  return Object.fromEntries(
    Object.entries(rawPortfolioMarkdown).map(([id, markdown]) => [id, resolveContentTokens(markdown, settings)]),
  ) as PortfolioMarkdown;
}

export const portfolioMarkdown = createPortfolioMarkdown(portfolioSettings);

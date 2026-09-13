import { parseProjects } from "../lib/contentCollections";
import { portfolioMarkdown } from "./content";

export const featuredProjects = parseProjects(portfolioMarkdown.projects);

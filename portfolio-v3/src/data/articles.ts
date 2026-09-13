import { parseArticles } from "../lib/contentCollections";
import { portfolioMarkdown } from "./content";

export const curatedArticles = parseArticles(portfolioMarkdown.articles);

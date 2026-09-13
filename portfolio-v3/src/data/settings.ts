import configurationMarkdown from "../content/portfolio/_config.md?raw";
import { parsePortfolioSettings } from "../lib/contentConfig";

export const portfolioSettings = parsePortfolioSettings(configurationMarkdown);

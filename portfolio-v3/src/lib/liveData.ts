import { fallbackArticles } from "../data/articles";
import { featuredProjects } from "../data/projects";
import type { Article, Project } from "../types";

interface GitHubRepository {
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  updated_at: string;
}

export interface LiveResult<T> {
  data: T;
  source: "live" | "fallback";
}

async function fetchWithTimeout(url: string, timeoutMs = 5500): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function loadProjects(): Promise<LiveResult<Project[]>> {
  try {
    const response = await fetchWithTimeout("https://api.github.com/users/LakinduQA/repos?per_page=100&sort=updated");
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const repositories = (await response.json()) as GitHubRepository[];
    if (!Array.isArray(repositories)) throw new Error("Unexpected GitHub response");

    const byName = new Map(repositories.map((repo) => [repo.name.toLowerCase(), repo]));
    const merged = featuredProjects.map((project) => {
      const live = byName.get(project.repo.toLowerCase());
      return live ? {
        ...project,
        url: live.html_url || project.url,
        description: live.description || project.description,
        stars: live.stargazers_count,
        updatedAt: live.updated_at,
      } : project;
    });
    return { data: merged, source: "live" };
  } catch {
    return { data: featuredProjects, source: "fallback" };
  }
}

export async function loadArticles(): Promise<LiveResult<Article[]>> {
  try {
    const response = await fetchWithTimeout(`${import.meta.env.BASE_URL}data/medium.json`, 3500);
    if (!response.ok) throw new Error("Medium snapshot unavailable");
    const articles = (await response.json()) as Article[];
    if (!Array.isArray(articles) || articles.length === 0) throw new Error("Medium snapshot empty");
    return { data: articles, source: "live" };
  } catch {
    return { data: fallbackArticles, source: "fallback" };
  }
}

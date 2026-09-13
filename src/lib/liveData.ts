import { featuredProjects } from "../data/projects";
import { portfolioSettings } from "../data/settings";
import type { Project } from "../types";

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
    const account = new URL(portfolioSettings["contact.github"]).pathname.split("/").filter(Boolean)[0];
    if (!account) throw new Error("GitHub profile URL has no account name");
    const response = await fetchWithTimeout(`https://api.github.com/users/${encodeURIComponent(account)}/repos?per_page=100&sort=updated`);
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const repositories = (await response.json()) as GitHubRepository[];
    if (!Array.isArray(repositories)) throw new Error("Unexpected GitHub response");

    const byName = new Map(repositories.map((repo) => [repo.name.toLowerCase(), repo]));
    const merged = featuredProjects.map((project) => {
      const live = byName.get(project.repo.toLowerCase());
      return live ? {
        ...project,
        url: live.html_url || project.url,
        stars: live.stargazers_count,
        updatedAt: live.updated_at,
      } : project;
    });
    return { data: merged, source: "live" };
  } catch {
    return { data: featuredProjects, source: "fallback" };
  }
}

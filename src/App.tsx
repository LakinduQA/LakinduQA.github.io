import { useEffect, useState } from "react";
import { IdeWorkspace } from "./components/IdeWorkspace";
import { Terminal } from "./components/Terminal";
import { portfolioDocumentMap, ROOT_DOCUMENT_PATH } from "./data/documents";
import { curatedArticles } from "./data/articles";
import { featuredProjects } from "./data/projects";
import { loadProjects } from "./lib/liveData";
import type { AppMode, Theme } from "./types";

function documentFromHash(): string | undefined {
  const prefix = "#/ide/";
  if (!window.location.hash.startsWith(prefix)) return undefined;
  const path = decodeURIComponent(window.location.hash.slice(prefix.length));
  const fullPath = `portfolio/${path}`;
  return portfolioDocumentMap.has(fullPath) ? fullPath : undefined;
}

export default function App() {
  const initialDocument = documentFromHash();
  const [mode, setMode] = useState<AppMode>(initialDocument ? "ide" : "terminal");
  const [terminalMounted, setTerminalMounted] = useState(() => !initialDocument);
  const [ideMounted, setIdeMounted] = useState(() => Boolean(initialDocument));
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem("portfolio-theme") === "light" ? "light" : "dark");
  const [activePath, setActivePath] = useState(initialDocument ?? ROOT_DOCUMENT_PATH);
  const [openTabs, setOpenTabs] = useState<string[]>(() => initialDocument && initialDocument !== ROOT_DOCUMENT_PATH ? [ROOT_DOCUMENT_PATH, initialDocument] : [ROOT_DOCUMENT_PATH]);
  const [projectCount, setProjectCount] = useState(featuredProjects.length);
  const articleCount = curatedArticles.length;
  const [dataSource, setDataSource] = useState<"live" | "fallback">("fallback");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("portfolio-theme", theme);
  }, [theme]);

  useEffect(() => {
    void loadProjects().then((projects) => {
      setProjectCount(projects.data.length);
      setDataSource(projects.source === "live" ? "live" : "fallback");
    });
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const path = documentFromHash();
      if (!path) return;
      setIdeMounted(true);
      setMode("ide");
      setActivePath(path);
      setOpenTabs((current) => current.includes(path) ? current : [...current, path]);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const openDocument = (path: string) => {
    if (!portfolioDocumentMap.has(path)) return;
    setIdeMounted(true);
    setMode("ide");
    setActivePath(path);
    setOpenTabs((current) => current.includes(path) ? current : [...current, path]);
    const routePath = path.replace(/^portfolio\//, "");
    window.history.replaceState(null, "", `#/ide/${encodeURI(routePath)}`);
  };

  const enterIde = () => openDocument(ROOT_DOCUMENT_PATH);
  const enterTerminal = () => {
    setTerminalMounted(true);
    setMode("terminal");
    window.history.replaceState(null, "", "#terminal");
  };
  const toggleTheme = () => setTheme((current) => current === "dark" ? "light" : "dark");

  const closeTab = (path: string) => {
    setOpenTabs((current) => {
      const next = current.filter((tab) => tab !== path);
      if (path === activePath) {
        const fallback = next[next.length - 1] ?? ROOT_DOCUMENT_PATH;
        setActivePath(fallback);
        const routePath = fallback.replace(/^portfolio\//, "");
        window.history.replaceState(null, "", `#/ide/${encodeURI(routePath)}`);
        return next.length ? next : [ROOT_DOCUMENT_PATH];
      }
      return next.length ? next : [ROOT_DOCUMENT_PATH];
    });
  };

  return (
    <div className={`app app--${mode}`}>
      {terminalMounted && (
        <div className="app-surface" data-app-surface="terminal" hidden={mode !== "terminal"}>
          <Terminal active={mode === "terminal"} theme={theme} onOpenDocument={openDocument} onEnterIde={enterIde} onToggleTheme={toggleTheme} />
        </div>
      )}
      {ideMounted && (
        <div className="app-surface" data-app-surface="ide" hidden={mode !== "ide"}>
          <IdeWorkspace active={mode === "ide"} activePath={activePath} openTabs={openTabs} theme={theme} projectCount={projectCount} articleCount={articleCount} dataSource={dataSource} onOpenDocument={openDocument} onCloseTab={closeTab} onTerminalMode={enterTerminal} onToggleTheme={toggleTheme} />
        </div>
      )}
    </div>
  );
}

import { ArrowRight, Bot, BriefcaseBusiness, FileText, FolderGit2, TerminalSquare } from "lucide-react";
import { portfolioDocumentMap } from "../data/documents";
import { portfolioSettings } from "../data/settings";

interface WelcomeEditorProps {
  projectCount: number;
  articleCount: number;
  onOpenDocument: (path: string) => void;
  onOpenChat: () => void;
  onOpenTerminal: () => void;
}

export function WelcomeEditor({ projectCount, articleCount, onOpenDocument, onOpenChat, onOpenTerminal }: WelcomeEditorProps) {
  const starts = [
    { icon: <FileText size={18} />, label: "About me", detail: "profile/about.md", path: "portfolio/profile/about.md" },
    { icon: <BriefcaseBusiness size={18} />, label: "Experience", detail: "career/experience.md", path: "portfolio/career/experience.md" },
    { icon: <FolderGit2 size={18} />, label: "Selected projects", detail: `${projectCount} featured repositories`, path: "portfolio/work/projects.md" },
  ].filter((item) => portfolioDocumentMap.has(item.path));
  const workspaceDetails = [
    portfolioDocumentMap.has("portfolio/work/projects.md") ? `${projectCount} projects` : undefined,
    portfolioDocumentMap.has("portfolio/writing/articles.md") ? `${articleCount || "curated"} articles` : undefined,
    "one guided agent",
  ].filter(Boolean).join(" · ");
  const toolsPath = "portfolio/toolbox/tools.md";
  return (
    <div className="welcome-editor">
      <div className="welcome-main">
        <div className="welcome-copy">
          <div className="welcome-kicker"><span /> PORTFOLIO WORKSPACE</div>
          <h1>{portfolioSettings["identity.name"]}</h1>
          <h2>{portfolioSettings["identity.role"]}</h2>
          <p>{portfolioSettings["identity.summary"]}</p>
          <div className="welcome-actions">
            <button className="primary-action" onClick={onOpenChat}><Bot size={16} /> Ask {portfolioSettings["agent.name"]}</button>
            <button onClick={onOpenTerminal}><TerminalSquare size={16} /> Open terminal</button>
          </div>
        </div>
        <figure className="welcome-portrait"><img src={`${import.meta.env.BASE_URL}${portfolioSettings["portrait.src"]}`} alt={portfolioSettings["portrait.alt"]} width={1200} height={1661} /><figcaption><span>{portfolioSettings["portrait.label"]}</span><strong>{portfolioSettings["portrait.caption"]}</strong></figcaption></figure>
      </div>
      <div className="welcome-sections">
        <section><h3>Start</h3>{starts.map((item) => <button className="welcome-link" key={item.path} onClick={() => onOpenDocument(item.path)}><span>{item.icon}</span><div><strong>{item.label}</strong><small>{item.detail}</small></div><ArrowRight size={14} /></button>)}</section>
        <section className="workspace-readme"><h3>Workspace</h3><div><span className="workspace-mark">&gt;_</span><p><strong>lakindu-portfolio</strong><br />{workspaceDetails}</p></div>{portfolioDocumentMap.has(toolsPath) && <button onClick={() => onOpenDocument(toolsPath)}>Explore the toolkit <ArrowRight size={13} /></button>}</section>
      </div>
    </div>
  );
}

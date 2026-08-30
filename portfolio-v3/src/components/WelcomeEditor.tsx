import { ArrowRight, Bot, BriefcaseBusiness, FileText, FolderGit2, TerminalSquare } from "lucide-react";
import { profile } from "../data/profile";

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
  ];
  return (
    <div className="welcome-editor">
      <div className="welcome-main">
        <div className="welcome-copy">
          <div className="welcome-kicker"><span /> PORTFOLIO WORKSPACE</div>
          <h1>{profile.name}</h1>
          <h2>{profile.role}</h2>
          <p>{profile.summary}</p>
          <div className="welcome-actions">
            <button className="primary-action" onClick={onOpenChat}><Bot size={16} /> Ask the portfolio</button>
            <button onClick={onOpenTerminal}><TerminalSquare size={16} /> Open terminal</button>
          </div>
        </div>
        <figure className="welcome-portrait"><img src={`${import.meta.env.BASE_URL}profile-lakindu.jpeg`} alt="Lakindu De Silva speaking at the Young Protégé 2025 Final Summit" /><figcaption><span>Current focus</span><strong>Quality engineering with evidence</strong></figcaption></figure>
      </div>
      <div className="welcome-sections">
        <section><h3>Start</h3>{starts.map((item) => <button className="welcome-link" key={item.path} onClick={() => onOpenDocument(item.path)}><span>{item.icon}</span><div><strong>{item.label}</strong><small>{item.detail}</small></div><ArrowRight size={14} /></button>)}</section>
        <section className="workspace-readme"><h3>Workspace</h3><div><span className="workspace-mark">&gt;_</span><p><strong>lakindu-portfolio</strong><br />{projectCount} projects · {articleCount || "curated"} articles · one guided agent</p></div><button onClick={() => onOpenDocument("portfolio/toolbox/tools.md")}>Explore the toolkit <ArrowRight size={13} /></button></section>
      </div>
    </div>
  );
}

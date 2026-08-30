import { Bot, ChevronDown, ChevronRight, Files, FileText, Folder, FolderOpen, GitBranch, Moon, PanelBottom, PanelRightClose, Printer, Sun, TerminalSquare, X } from "lucide-react";
import { useMemo, useState } from "react";
import { portfolioDocumentMap, portfolioDocuments, ROOT_DOCUMENT_PATH } from "../data/documents";
import type { Theme, WorkspacePanel } from "../types";
import { MarkdownViewer } from "./MarkdownViewer";
import { PortfolioChat } from "./PortfolioChat";
import { Terminal } from "./Terminal";
import { WelcomeEditor } from "./WelcomeEditor";

interface IdeWorkspaceProps {
  activePath: string;
  openTabs: string[];
  theme: Theme;
  projectCount: number;
  articleCount: number;
  dataSource: "live" | "fallback";
  onOpenDocument: (path: string) => void;
  onCloseTab: (path: string) => void;
  onTerminalMode: () => void;
  onToggleTheme: () => void;
}

const folderOrder = ["profile", "career", "toolbox", "work", "writing", "resume", "contact"];

export function IdeWorkspace({ activePath, openTabs, theme, projectCount, articleCount, dataSource, onOpenDocument, onCloseTab, onTerminalMode, onToggleTheme }: IdeWorkspaceProps) {
  const [folders, setFolders] = useState(() => new Set(folderOrder));
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<WorkspacePanel>("editor");
  const activeDocument = portfolioDocumentMap.get(activePath) ?? portfolioDocumentMap.get(ROOT_DOCUMENT_PATH)!;

  const folderDocuments = useMemo(() => folderOrder.map((folder) => ({ folder, documents: portfolioDocuments.filter((document) => document.folder === folder) })), []);

  const openFromPanel = (path: string) => { onOpenDocument(path); setMobilePanel("editor"); };
  const toggleFolder = (folder: string) => setFolders((current) => { const next = new Set(current); if (next.has(folder)) next.delete(folder); else next.add(folder); return next; });

  return (
    <div className="ide-shell" data-mobile-panel={mobilePanel} data-explorer-open={explorerOpen} data-chat-open={chatOpen} data-terminal-open={terminalOpen}>
      <header className="ide-titlebar">
        <div className="ide-titlebar__brand"><span>&gt;_</span></div>
        <div className="ide-menu"><button>File</button><button>View</button><button onClick={() => setMobilePanel("chat")}>Agent</button></div>
        <div className="ide-title">{activeDocument.shortTitle} — lakindu-portfolio</div>
        <div className="ide-titlebar__actions"><button onClick={onToggleTheme} aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button><button onClick={onTerminalMode}><TerminalSquare size={15} /><span>Terminal mode</span></button></div>
      </header>

      <div className="ide-workbench">
        <nav className="activity-bar" aria-label="Workspace views">
          <div>
            <button className={explorerOpen && mobilePanel === "explorer" ? "active" : ""} onClick={() => { setExplorerOpen((value) => !value); setMobilePanel("explorer"); }} aria-label="Explorer"><Files /></button>
            <button className={chatOpen && mobilePanel === "chat" ? "active" : ""} onClick={() => { setChatOpen(true); setMobilePanel("chat"); }} aria-label="Portfolio agent"><Bot /></button>
            <button className={terminalOpen && mobilePanel === "terminal" ? "active" : ""} onClick={() => { setTerminalOpen(true); setMobilePanel("terminal"); }} aria-label="Terminal"><TerminalSquare /></button>
          </div>
          <button onClick={onToggleTheme} aria-label="Toggle theme">{theme === "dark" ? <Moon /> : <Sun />}</button>
        </nav>

        <aside className="explorer-panel" aria-label="Explorer">
          <header className="panel-header"><span>EXPLORER</span><button aria-label="Close Explorer" onClick={() => { setExplorerOpen(false); setMobilePanel("editor"); }}><X size={14} /></button></header>
          <div className="explorer-root"><ChevronDown size={14} /> LAKINDU-PORTFOLIO</div>
          <div className="file-tree">
            <button className={`file-row file-row--root ${activePath === ROOT_DOCUMENT_PATH ? "active" : ""}`} onClick={() => openFromPanel(ROOT_DOCUMENT_PATH)}><FileText size={15} className="md-icon" /> README.md</button>
            {folderDocuments.map(({ folder, documents }) => (
              <div key={folder} className="tree-folder">
                <button className="folder-row" onClick={() => toggleFolder(folder)}>{folders.has(folder) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{folders.has(folder) ? <FolderOpen size={15} /> : <Folder size={15} />}<span>{folder}</span></button>
                {folders.has(folder) && <div>{documents.map((document) => <button className={`file-row ${activePath === document.path ? "active" : ""}`} key={document.path} onClick={() => openFromPanel(document.path)}><FileText size={14} className="md-icon" /><span>{document.shortTitle}</span></button>)}</div>}
              </div>
            ))}
          </div>
        </aside>

        <section className="editor-panel" aria-label="Editor">
          <div className="editor-tabs" role="tablist" aria-label="Open files">
            {openTabs.map((path) => { const document = portfolioDocumentMap.get(path); if (!document) return null; return <div role="tab" aria-selected={path === activePath} className={`editor-tab ${path === activePath ? "active" : ""}`} key={path}><button onClick={() => onOpenDocument(path)}><FileText size={14} className="md-icon" />{document.shortTitle}</button><button className="tab-close" aria-label={`Close ${document.shortTitle}`} onClick={() => onCloseTab(path)}><X size={13} /></button></div>; })}
          </div>
          <div className="editor-breadcrumbs"><span>portfolio</span>{activeDocument.folder && <><ChevronRight size={13} /><span>{activeDocument.folder}</span></>}<ChevronRight size={13} /><strong>{activeDocument.shortTitle}</strong><div className="editor-tools">{activeDocument.id === "resume" && <button onClick={() => window.print()}><Printer size={14} /> Print</button>}<button onClick={() => setChatOpen((value) => !value)} aria-label="Toggle chat"><PanelRightClose size={14} /></button></div></div>
          <main className="editor-content" id="main-content">
            {activeDocument.path === ROOT_DOCUMENT_PATH ? <WelcomeEditor projectCount={projectCount} articleCount={articleCount} onOpenDocument={openFromPanel} onOpenChat={() => { setChatOpen(true); setMobilePanel("chat"); }} onOpenTerminal={() => { setTerminalOpen(true); setMobilePanel("terminal"); }} /> : <MarkdownViewer markdown={activeDocument.markdown} />}
          </main>
        </section>

        <aside className="chat-panel"><PortfolioChat theme={theme} onOpenDocument={openFromPanel} onToggleTheme={onToggleTheme} /></aside>
      </div>

      <section className="ide-terminal-panel" aria-label="Integrated terminal">
        <header><div><button className="active">PORTFOLIO AGENT</button><button>OUTPUT</button></div><button aria-label="Close terminal panel" onClick={() => { setTerminalOpen(false); setMobilePanel("editor"); }}><X size={14} /></button></header>
        <Terminal compact theme={theme} onOpenDocument={openFromPanel} onEnterIde={() => setMobilePanel("editor")} onToggleTheme={onToggleTheme} />
      </section>

      <footer className="status-bar"><div><span><GitBranch size={13} /> portfolio-v3</span><span>Markdown</span></div><div><span>{dataSource === "live" ? "Live project data" : "Curated data"}</span><button onClick={() => setTerminalOpen((value) => !value)}><PanelBottom size={13} /> Terminal</button></div></footer>

      <nav className="mobile-workspace-nav" aria-label="Mobile workspace">
        <button className={mobilePanel === "explorer" ? "active" : ""} onClick={() => { setExplorerOpen(true); setMobilePanel("explorer"); }}><Files /><span>Explorer</span></button>
        <button className={mobilePanel === "editor" ? "active" : ""} onClick={() => setMobilePanel("editor")}><FileText /><span>Editor</span></button>
        <button className={mobilePanel === "chat" ? "active" : ""} onClick={() => { setChatOpen(true); setMobilePanel("chat"); }}><Bot /><span>Agent</span></button>
        <button className={mobilePanel === "terminal" ? "active" : ""} onClick={() => { setTerminalOpen(true); setMobilePanel("terminal"); }}><TerminalSquare /><span>Terminal</span></button>
      </nav>
    </div>
  );
}

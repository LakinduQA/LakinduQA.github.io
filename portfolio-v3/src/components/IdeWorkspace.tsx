import { Bot, ChevronDown, ChevronRight, Files, FileText, Folder, FolderOpen, GitBranch, Maximize2, Minimize2, Moon, PanelBottom, PanelRightClose, Printer, Sun, TerminalSquare, X } from "lucide-react";
import { type CSSProperties, type PointerEvent, useRef, useState } from "react";
import { portfolioDocumentMap, portfolioFolders, ROOT_DOCUMENT_PATH } from "../data/documents";
import { portfolioSettings } from "../data/settings";
import type { Theme, WorkspacePanel } from "../types";
import { MarkdownViewer } from "./MarkdownViewer";
import { PortfolioChat } from "./PortfolioChat";
import { Terminal } from "./Terminal";
import { WelcomeEditor } from "./WelcomeEditor";

interface IdeWorkspaceProps {
  active?: boolean;
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

export function IdeWorkspace({ active = true, activePath, openTabs, theme, projectCount, articleCount, dataSource, onOpenDocument, onCloseTab, onTerminalMode, onToggleTheme }: IdeWorkspaceProps) {
  const [folders, setFolders] = useState(() => new Set(portfolioFolders.map(({ folder }) => folder)));
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatFocusRequest, setChatFocusRequest] = useState(0);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalFocusRequest, setTerminalFocusRequest] = useState(0);
  const [terminalHeight, setTerminalHeight] = useState(245);
  const [terminalMaximized, setTerminalMaximized] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<WorkspacePanel>("editor");
  const terminalResizeStart = useRef<{ y: number; height: number } | null>(null);
  const activeDocument = portfolioDocumentMap.get(activePath) ?? portfolioDocumentMap.get(ROOT_DOCUMENT_PATH)!;

  const openFromPanel = (path: string) => { onOpenDocument(path); setMobilePanel("editor"); };
  const openChatAndFocus = () => { setChatOpen(true); setMobilePanel("chat"); setChatFocusRequest((request) => request + 1); };
  const openTerminalAndFocus = () => { setTerminalOpen(true); setMobilePanel("terminal"); setTerminalFocusRequest((request) => request + 1); };
  const toggleFolder = (folder: string) => setFolders((current) => { const next = new Set(current); if (next.has(folder)) next.delete(folder); else next.add(folder); return next; });
  const resizeTerminal = (event: PointerEvent<HTMLDivElement>) => {
    const start = terminalResizeStart.current;
    if (!start || terminalMaximized) return;
    const maximum = Math.max(245, window.innerHeight - 150);
    setTerminalHeight(Math.min(maximum, Math.max(170, start.height + start.y - event.clientY)));
  };
  const resizeTerminalByKeyboard = (direction: 1 | -1) => {
    setTerminalMaximized(false);
    setTerminalHeight((current) => Math.min(Math.max(245, window.innerHeight - 150), Math.max(170, current + direction * 28)));
  };
  const closeChat = () => { setChatOpen(false); setMobilePanel("editor"); };
  const closeTerminal = () => { setTerminalOpen(false); setTerminalMaximized(false); setMobilePanel("editor"); };
  const isMobileWorkspace = () => window.matchMedia?.("(max-width: 767px)").matches ?? false;
  const mobileWorkspace = isMobileWorkspace();
  const chatActive = active && chatOpen && (!mobileWorkspace || mobilePanel === "chat");
  const terminalActive = active && terminalOpen && (!mobileWorkspace || mobilePanel === "terminal");
  const toggleChat = () => {
    const active = isMobileWorkspace() ? chatOpen && mobilePanel === "chat" : chatOpen;
    if (active) closeChat(); else openChatAndFocus();
  };
  const toggleTerminal = () => {
    const active = isMobileWorkspace() ? terminalOpen && mobilePanel === "terminal" : terminalOpen;
    if (active) closeTerminal(); else openTerminalAndFocus();
  };

  return (
    <div className="ide-shell" data-mobile-panel={mobilePanel} data-explorer-open={explorerOpen} data-chat-open={chatOpen} data-terminal-open={terminalOpen} data-terminal-maximized={terminalMaximized} style={{ "--terminal-height": `${terminalHeight}px` } as CSSProperties}>
      <header className="ide-titlebar">
        <div className="ide-titlebar__brand"><span>&gt;_</span></div>
        <div className="ide-menu"><button>File</button><button>View</button><button onClick={openChatAndFocus}>Agent</button></div>
        <div className="ide-title">{activeDocument.shortTitle} — lakindu-portfolio</div>
        <div className="ide-titlebar__actions"><button onClick={onToggleTheme} aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button><button onClick={onTerminalMode} aria-label="Switch to terminal"><TerminalSquare size={15} /><span>Switch to terminal</span></button></div>
      </header>

      <div className="ide-workbench">
        <nav className="activity-bar" aria-label="Workspace views">
          <div>
            <button className={explorerOpen && mobilePanel === "explorer" ? "active" : ""} onClick={() => { setExplorerOpen((value) => !value); setMobilePanel("explorer"); }} aria-label="Explorer"><Files /></button>
            <button className={chatOpen && mobilePanel === "chat" ? "active" : ""} onClick={toggleChat} aria-label={portfolioSettings["agent.name"]}><Bot /></button>
            <button className={terminalOpen && mobilePanel === "terminal" ? "active" : ""} onClick={toggleTerminal} aria-label="Terminal"><TerminalSquare /></button>
          </div>
          <button onClick={onToggleTheme} aria-label="Toggle theme">{theme === "dark" ? <Moon /> : <Sun />}</button>
        </nav>

        <aside className="explorer-panel" aria-label="Explorer">
          <header className="panel-header"><span>EXPLORER</span><button aria-label="Close Explorer" onClick={() => { setExplorerOpen(false); setMobilePanel("editor"); }}><X size={14} /></button></header>
          <div className="explorer-root"><ChevronDown size={14} /> LAKINDU-PORTFOLIO</div>
          <div className="file-tree">
            <button className={`file-row file-row--root ${activePath === ROOT_DOCUMENT_PATH ? "active" : ""}`} onClick={() => openFromPanel(ROOT_DOCUMENT_PATH)}><FileText size={15} className="md-icon" /> README.md</button>
            {portfolioFolders.map(({ folder, documents }) => (
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
            {activeDocument.path === ROOT_DOCUMENT_PATH ? <WelcomeEditor projectCount={projectCount} articleCount={articleCount} onOpenDocument={openFromPanel} onOpenChat={openChatAndFocus} onOpenTerminal={openTerminalAndFocus} /> : <MarkdownViewer markdown={activeDocument.markdown} />}
          </main>
        </section>

        <aside className="chat-panel"><PortfolioChat active={chatActive} theme={theme} focusRequest={chatFocusRequest} onOpenDocument={openFromPanel} onToggleTheme={onToggleTheme} onClose={closeChat} /></aside>
      </div>

      <section className="ide-terminal-panel" aria-label="Integrated terminal">
        <div className="terminal-resize-handle" role="separator" aria-label="Resize terminal panel" aria-orientation="horizontal" tabIndex={0}
          onPointerDown={(event) => { if (terminalMaximized) return; terminalResizeStart.current = { y: event.clientY, height: terminalHeight }; event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={resizeTerminal}
          onPointerUp={(event) => { terminalResizeStart.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }}
          onKeyDown={(event) => { if (event.key === "ArrowUp") { event.preventDefault(); resizeTerminalByKeyboard(1); } if (event.key === "ArrowDown") { event.preventDefault(); resizeTerminalByKeyboard(-1); } }} />
        <header><div><button className="active">TERMINAL</button><span>{portfolioSettings["agent.name"].toLowerCase()}-agent</span></div><div className="terminal-panel-actions"><button aria-label={terminalMaximized ? "Restore terminal panel" : "Maximize terminal panel"} onClick={() => setTerminalMaximized((value) => !value)}>{terminalMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button><button aria-label="Close terminal panel" onClick={closeTerminal}><X size={14} /></button></div></header>
        <Terminal active={terminalActive} compact theme={theme} focusRequest={terminalFocusRequest} onOpenDocument={openFromPanel} onEnterIde={closeTerminal} onToggleTheme={onToggleTheme} />
      </section>

      <footer className="status-bar"><div><span><GitBranch size={13} /> portfolio-v3</span><span>Markdown</span></div><div><span>{dataSource === "live" ? "Live project data" : "Curated data"}</span><button onClick={toggleTerminal}><PanelBottom size={13} /> Terminal</button></div></footer>

      <nav className="mobile-workspace-nav" aria-label="Mobile workspace">
        <button className={mobilePanel === "explorer" ? "active" : ""} onClick={() => { setExplorerOpen(true); setMobilePanel("explorer"); }}><Files /><span>Explorer</span></button>
        <button className={mobilePanel === "editor" ? "active" : ""} onClick={() => setMobilePanel("editor")}><FileText /><span>Editor</span></button>
        <button className={mobilePanel === "chat" ? "active" : ""} onClick={toggleChat}><Bot /><span>Agent</span></button>
        <button className={mobilePanel === "terminal" ? "active" : ""} onClick={toggleTerminal}><TerminalSquare /><span>Terminal</span></button>
      </nav>
    </div>
  );
}

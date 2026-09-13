import { ArrowDown, Command, ExternalLink, FastForward, Moon, Square, Sun, TerminalSquare } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { portfolioSettings } from "../data/settings";
import { resolveAgentQuery, slashCommands } from "../lib/agent";
import { parseMarkdownForTerminal, parseTerminalInline } from "../lib/terminalMarkdown";
import { deterministicThinkingDelay, streamSlices, terminalLineCount } from "../lib/terminalRuntime";
import type { AgentResponse, TerminalOutputBlock, TerminalRunState, TerminalTranscriptEntry, Theme } from "../types";
import { AgentMarkdownBlock } from "./AgentMarkdown";

interface TerminalProps {
  theme: Theme;
  active?: boolean;
  compact?: boolean;
  focusRequest?: number;
  onOpenDocument: (path: string) => void;
  onEnterIde: () => void;
  onToggleTheme: () => void;
}

interface ActiveRun {
  id: string;
  response: AgentResponse;
  fullBlocks: TerminalOutputBlock[];
  frames: Array<{ blockIndex: number; content: string }>;
  frameIndex: number;
  startedAt: number;
}

const phaseLabels = ["Matching portfolio context", "Formatting terminal output"];
const INITIAL_PROFILE_DELAY_MS = 500;
const INTRO_COMPLETE_EVENT = "portfolio:intro-complete";

function formatElapsed(elapsedMs: number): string {
  return `${(elapsedMs / 1000).toFixed(2)}s`;
}

function createFrames(blocks: TerminalOutputBlock[]) {
  return blocks.flatMap((block, blockIndex) => streamSlices(block.content, block.type).map((content) => ({ blockIndex, content })));
}

export function Terminal({ theme, active = true, compact = false, focusRequest = 0, onOpenDocument, onEnterIde, onToggleTheme }: TerminalProps) {
  const agentName = portfolioSettings["agent.name"];
  const agentMark = portfolioSettings["agent.mark"];
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<TerminalTranscriptEntry[]>([]);
  const [runState, setRunState] = useState<TerminalRunState>("idle");
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [jumpVisible, setJumpVisible] = useState(false);
  const [accessibleResult, setAccessibleResult] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRunRef = useRef<ActiveRun | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>>([]);
  const followOutputRef = useRef(true);
  const visitorStartedRef = useRef(false);
  const activeRef = useRef(active);
  const wasActiveRef = useRef(active);
  const themeRef = useRef(theme);
  const initialProfileStateRef = useRef<"idle" | "waiting" | "scheduled" | "attempted">("idle");

  activeRef.current = active;
  themeRef.current = theme;

  const running = runState === "thinking" || runState === "streaming";
  const matches = useMemo(() => {
    if (!suggestionsOpen || !input.startsWith("/")) return [];
    return slashCommands.filter((item) => item.command.startsWith(input.toLowerCase())).slice(0, 7);
  }, [input, suggestionsOpen]);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    timersRef.current = [];
  }, []);

  const updateEntry = useCallback((id: string, update: (entry: TerminalTranscriptEntry) => TerminalTranscriptEntry) => {
    setEntries((current) => current.map((entry) => entry.id === id ? update(entry) : entry));
  }, []);

  const completeActiveRun = useCallback((forceBlocks?: TerminalOutputBlock[]) => {
    const active = activeRunRef.current;
    if (!active) return;
    clearTimers();
    const elapsedMs = Math.max(1, Date.now() - active.startedAt);
    const finalState: TerminalRunState = active.response.kind === "error" ? "error" : "completed";
    const blocks = forceBlocks ?? active.fullBlocks;
    updateEntry(active.id, (entry) => ({
      ...entry,
      state: finalState,
      phase: undefined,
      blocks,
      activeBlock: undefined,
      metrics: { ...entry.metrics, elapsedMs, linesPrinted: terminalLineCount(blocks) },
    }));
    setAccessibleResult(active.response.kind === "document" && active.response.document
      ? `${active.response.document.title} loaded from ${active.response.document.path}. ${active.response.message}`
      : active.response.message);
    activeRunRef.current = null;
    setRunState(finalState);
    if (activeRef.current) requestAnimationFrame(() => inputRef.current?.focus());
  }, [clearTimers, updateEntry]);

  const cancelRun = useCallback(() => {
    const active = activeRunRef.current;
    if (!active) return;
    clearTimers();
    const elapsedMs = Math.max(1, Date.now() - active.startedAt);
    updateEntry(active.id, (entry) => ({
      ...entry,
      state: "cancelled",
      phase: undefined,
      activeBlock: undefined,
      metrics: { ...entry.metrics, elapsedMs, linesPrinted: terminalLineCount(entry.blocks) },
    }));
    activeRunRef.current = null;
    setRunState("cancelled");
    setAccessibleResult("Command cancelled.");
    if (activeRef.current) requestAnimationFrame(() => inputRef.current?.focus());
  }, [clearTimers, updateEntry]);

  const showNow = useCallback(() => {
    if (activeRunRef.current) completeActiveRun(activeRunRef.current.fullBlocks);
  }, [completeActiveRun]);

  const clearTranscript = useCallback(() => {
    if (activeRunRef.current) cancelRun();
    setEntries([]);
    setAccessibleResult("Transcript cleared.");
    setJumpVisible(false);
    followOutputRef.current = true;
  }, [cancelRun]);

  const beginStreaming = useCallback(() => {
    const active = activeRunRef.current;
    if (!active) return;
    setRunState("streaming");
    updateEntry(active.id, (entry) => ({ ...entry, state: "streaming", phase: "Streaming document" }));

    const advance = () => {
      const current = activeRunRef.current;
      if (!current) return;
      const frame = current.frames[current.frameIndex];
      if (!frame) {
        completeActiveRun();
        return;
      }
      const source = current.fullBlocks[frame.blockIndex];
      const activeBlock = { ...source, content: frame.content, tokens: parseTerminalInline(frame.content) };
      updateEntry(current.id, (entry) => ({
        ...entry,
        blocks: current.fullBlocks.slice(0, frame.blockIndex),
        activeBlock,
        metrics: { ...entry.metrics, elapsedMs: Math.max(1, Date.now() - current.startedAt) },
      }));
      current.frameIndex += 1;
      if (current.frameIndex >= current.frames.length) completeActiveRun();
    };

    advance();
    if (activeRunRef.current) timersRef.current.push(setInterval(advance, 52));
  }, [completeActiveRun, updateEntry]);

  const runAnimatedResponse = useCallback((command: string, response: AgentResponse) => {
    const fullBlocks = response.kind === "document"
      ? parseMarkdownForTerminal(response.document?.markdown)
      : [{ id: `${response.id}-message`, type: "paragraph" as const, content: response.message, tokens: parseTerminalInline(response.message) }];
    const startedAt = Date.now();
    const sourceLabel = response.documentPath ?? "portfolio index";
    const firstPhase = response.kind === "document" ? `Reading ${sourceLabel}` : "Matching portfolio context";
    const entry: TerminalTranscriptEntry = {
      id: response.id,
      command,
      state: "thinking",
      phase: firstPhase,
      response,
      blocks: [],
      metrics: { startedAt, elapsedMs: 0, linesPrinted: 0 },
    };
    const frames = createFrames(fullBlocks);
    activeRunRef.current = { id: response.id, response, fullBlocks, frames, frameIndex: 0, startedAt };
    setEntries((current) => [...current, entry]);
    setRunState("thinking");
    setAccessibleResult("");

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const delay = reducedMotion ? 80 : response.kind === "error" ? 720 : deterministicThinkingDelay(response.document?.markdown.length ?? response.message.length);
    if (!reducedMotion) {
      phaseLabels.forEach((phase, index) => {
        const timer = setTimeout(() => updateEntry(response.id, (current) => ({ ...current, phase })), Math.round(delay * ((index + 1) / 3)));
        timersRef.current.push(timer);
      });
      timersRef.current.push(setInterval(() => {
        updateEntry(response.id, (current) => ({ ...current, metrics: { ...current.metrics, elapsedMs: Math.max(1, Date.now() - startedAt) } }));
      }, 80));
    }
    timersRef.current.push(setTimeout(() => reducedMotion ? completeActiveRun(fullBlocks) : beginStreaming(), delay));
  }, [beginStreaming, completeActiveRun, updateEntry]);

  const runQuery = useCallback((rawQuery: string) => {
    if (activeRunRef.current) return;
    const query = rawQuery.trim();
    if (!query) return;
    visitorStartedRef.current = true;
    const response = resolveAgentQuery(query, theme);
    setInput("");
    setSuggestionsOpen(false);
    setSelectedSuggestion(0);
    setHistory((current) => [...current.filter((item) => item !== query), query]);
    setHistoryIndex(null);
    followOutputRef.current = true;
    setJumpVisible(false);

    if (response.action === "clear") {
      clearTranscript();
      return;
    }
    if (response.action === "toggle-theme") {
      onToggleTheme();
      const blocks = [{ id: `${response.id}-theme`, type: "paragraph" as const, content: "Theme toggled.", tokens: parseTerminalInline("Theme toggled.") }];
      setEntries((current) => [...current, { id: response.id, command: query, state: "completed", response, blocks, metrics: { startedAt: Date.now(), elapsedMs: 0, linesPrinted: 1 } }]);
      setRunState("completed");
      return;
    }
    if (response.action === "enter-ide") {
      if (response.documentPath && response.documentPath !== "portfolio/README.md") onOpenDocument(response.documentPath);
      else onEnterIde();
      return;
    }
    if (response.kind === "system") {
      const blocks: TerminalOutputBlock[] = [{ id: `${response.id}-system`, type: "paragraph", content: response.message, tokens: parseTerminalInline(response.message) }];
      if (query.toLowerCase() === "/help" || query.toLowerCase() === "help") {
        blocks.push({ id: `${response.id}-space`, type: "spacer", content: "" });
        slashCommands.forEach((item, index) => blocks.push({
          id: `${response.id}-command-${index}`,
          type: "list",
          content: `${item.command} — ${item.description}`,
          tokens: [{ type: "code", text: item.command }, { type: "text", text: ` — ${item.description}` }],
        }));
      }
      setEntries((current) => [...current, { id: response.id, command: query, state: "completed", response, blocks, metrics: { startedAt: Date.now(), elapsedMs: 0, linesPrinted: 1 } }]);
      setRunState("completed");
      return;
    }
    runAnimatedResponse(query, response);
  }, [clearTranscript, onEnterIde, onOpenDocument, onToggleTheme, runAnimatedResponse, theme]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (compact || initialProfileStateRef.current === "attempted") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleInitialProfile = () => {
      if (initialProfileStateRef.current === "scheduled" || initialProfileStateRef.current === "attempted") return;
      initialProfileStateRef.current = "scheduled";
      timer = setTimeout(() => {
        initialProfileStateRef.current = "attempted";
        if (visitorStartedRef.current || activeRunRef.current) return;
        runAnimatedResponse("read portfolio/README.md", resolveAgentQuery("/home", themeRef.current));
      }, INITIAL_PROFILE_DELAY_MS);
    };

    if (document.documentElement.classList.contains("assert-intro-active")) {
      initialProfileStateRef.current = "waiting";
      window.addEventListener(INTRO_COMPLETE_EVENT, scheduleInitialProfile, { once: true });
    } else {
      scheduleInitialProfile();
    }

    return () => {
      window.removeEventListener(INTRO_COMPLETE_EVENT, scheduleInitialProfile);
      if (timer) {
        clearTimeout(timer);
        if (initialProfileStateRef.current === "scheduled") initialProfileStateRef.current = "idle";
      } else if (initialProfileStateRef.current === "waiting") {
        initialProfileStateRef.current = "idle";
      }
    };
  }, [compact, runAnimatedResponse]);

  useEffect(() => {
    if (!active) return;
    const onWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        clearTranscript();
        return;
      }
      if (!activeRunRef.current) return;
      if (event.ctrlKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        cancelRun();
      } else if ((event.key === "Enter" || event.key === " ") && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        showNow();
      }
    };
    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [active, cancelRun, clearTranscript, showNow]);

  useEffect(() => {
    const log = logRef.current;
    if (log && followOutputRef.current) log.scrollTop = log.scrollHeight;
  }, [entries]);

  useEffect(() => {
    if (active && focusRequest > 0 && !running) inputRef.current?.focus();
  }, [active, focusRequest, running]);

  useEffect(() => {
    const wasActive = wasActiveRef.current;
    wasActiveRef.current = active;
    if (active && !wasActive && !running) requestAnimationFrame(() => inputRef.current?.focus());
  }, [active, running]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    runQuery(input);
  };

  const moveThroughHistory = (direction: -1 | 1) => {
    if (!history.length) return;
    if (direction === 1 && historyIndex === null) return;
    if (direction === 1 && historyIndex === history.length - 1) {
      setHistoryIndex(null);
      setInput("");
      setSuggestionsOpen(false);
      return;
    }
    const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex + direction);
    setHistoryIndex(nextIndex);
    setInput(history[nextIndex]);
    setSuggestionsOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey && event.key.toLowerCase() === "c") {
      event.preventDefault();
      if (activeRunRef.current) cancelRun();
      else setInput("");
      return;
    }
    if (event.ctrlKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      clearTranscript();
      return;
    }
    if (event.key === "ArrowUp") { event.preventDefault(); moveThroughHistory(-1); }
    if (event.key === "ArrowDown") { event.preventDefault(); moveThroughHistory(1); }
    if (event.key === "Tab" && matches.length) {
      event.preventDefault();
      setInput(matches[selectedSuggestion]?.command ?? matches[0].command);
      setSuggestionsOpen(false);
    }
    if (event.key === "Escape") setSuggestionsOpen(false);
  };

  const onLogScroll = () => {
    const log = logRef.current;
    if (!log) return;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 72;
    followOutputRef.current = nearBottom;
    setJumpVisible(!nearBottom);
  };

  const jumpToLatest = () => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
    followOutputRef.current = true;
    setJumpVisible(false);
  };

  return (
    <section className={`agent-terminal ${compact ? "agent-terminal--compact" : ""}`} aria-label={`${portfolioSettings["identity.name"]} portfolio terminal`}>
      {!compact && (
        <nav className="terminal-utilitybar" aria-label="Terminal actions">
          <span><TerminalSquare size={14} /> portfolio terminal</span>
          <div>
            <button type="button" onClick={onToggleTheme} aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}</button>
            <button type="button" onClick={onEnterIde}><Command size={14} /> Switch to IDE</button>
          </div>
        </nav>
      )}
      <div className="terminal-session">
        <div className="terminal-log" ref={logRef} onScroll={onLogScroll} role="log" aria-live="off" aria-label="Terminal transcript">
          {!compact ? (
            <div className="terminal-boot" aria-label={`${agentName} portfolio agent startup`}>
              <div className="terminal-boot-box">
                <span className="terminal-boot-mark">{agentMark}</span>
                <span>local agent · read-only portfolio workspace</span>
              </div>
              <dl><div><dt>workspace</dt><dd>~/portfolio</dd></div><div><dt>profile</dt><dd>{portfolioSettings["identity.role"]}</dd></div><div><dt>source</dt><dd>verified Markdown documents</dd></div></dl>
              <p>Type <button type="button" onClick={() => runQuery("/help")}>/help</button> for commands or ask a question.</p>
            </div>
          ) : <div className="terminal-compact-boot"><span>{agentMark}</span><span>read-only session</span></div>}

          {entries.map((entry) => (
            <article className={`terminal-entry terminal-entry--${entry.state}`} key={entry.id} data-state={entry.state}>
              <div className="terminal-command"><span aria-hidden="true">›</span><span>{entry.command}</span></div>
              {(entry.state === "thinking" || entry.state === "streaming") && (
                <div className="terminal-progress" role="status">
                  <span className="terminal-spinner" aria-hidden="true">⠋</span>
                  <span>{entry.phase}</span>
                  <time>{formatElapsed(entry.metrics.elapsedMs)}</time>
                </div>
              )}
              <div className="terminal-document-output">
                {entry.blocks.map((block) => <AgentMarkdownBlock key={block.id} block={block} />)}
                {entry.activeBlock && <AgentMarkdownBlock block={entry.activeBlock} active />}
              </div>
              {entry.state === "cancelled" && <div className="terminal-cancelled">^C  Command cancelled after {formatElapsed(entry.metrics.elapsedMs)}</div>}
              {(entry.state === "completed" || entry.state === "error") && entry.response.kind !== "system" && (
                <footer className="terminal-completion">
                  <div><span>{entry.state === "error" ? "error" : "done"}</span><span>{formatElapsed(entry.metrics.elapsedMs)}</span><span>{entry.metrics.linesPrinted} lines</span></div>
                  {entry.response.documentPath && <div className="terminal-source"><span>source</span><code>{entry.response.documentPath}</code><button type="button" aria-label={`Open in IDE: ${entry.response.documentPath}`} onClick={() => onOpenDocument(entry.response.documentPath!)}>Open in IDE <ExternalLink size={13} /></button></div>}
                  {entry.response.suggestions?.length ? <div className="terminal-next"><span>next</span>{entry.response.suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => runQuery(suggestion)}>{suggestion}</button>)}</div> : null}
                </footer>
              )}
            </article>
          ))}
        </div>

        {jumpVisible && <button type="button" className="jump-latest" onClick={jumpToLatest}><ArrowDown size={14} /> Jump to latest</button>}

        <div className="terminal-composer">
          {matches.length > 0 && (
            <div className="slash-menu" role="listbox" aria-label="Slash command completions">
              {matches.map((item, index) => <button type="button" role="option" aria-selected={selectedSuggestion === index} className={selectedSuggestion === index ? "selected" : ""} key={item.command} onMouseEnter={() => setSelectedSuggestion(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => { setInput(item.command); setSuggestionsOpen(false); inputRef.current?.focus(); }}><code>{item.command}</code><span>{item.description}</span></button>)}
            </div>
          )}
          {running && <div className="terminal-run-controls" aria-label="Running command controls"><button type="button" onClick={cancelRun}><Square size={12} /> Cancel <kbd>Ctrl C</kbd></button><button type="button" onClick={showNow}><FastForward size={13} /> Show now <kbd>Enter</kbd></button></div>}
          <form onSubmit={submit}>
            <span className="terminal-prompt-mark" aria-hidden="true">›</span>
            <label className="sr-only" htmlFor={compact ? "dock-command" : "terminal-command"}>Terminal command</label>
            <input ref={inputRef} id={compact ? "dock-command" : "terminal-command"} value={input} maxLength={300} disabled={running} onChange={(event) => { setInput(event.target.value); setSelectedSuggestion(0); setSuggestionsOpen(event.target.value.startsWith("/")); }} onKeyDown={onKeyDown} placeholder={running ? `${agentName} is working…` : `Ask ${agentName} about Lakindu or type / for commands`} autoComplete="off" spellCheck="false" autoFocus={!compact && active} />
            <button type="submit" aria-label="Run command" disabled={running || !input.trim()}><TerminalSquare size={16} /></button>
          </form>
          <div className="terminal-shortcuts" aria-hidden="true"><span>↑↓ history</span><span>tab complete</span><span>ctrl+l clear</span><span>ctrl+c cancel</span></div>
        </div>
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{accessibleResult}</div>
    </section>
  );
}

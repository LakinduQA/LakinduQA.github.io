import { ArrowDown, ExternalLink, FastForward, Square, TerminalSquare } from "lucide-react";
import { type FormEvent, type KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveAgentQuery, slashCommands } from "../lib/agent";
import { parseMarkdownForTerminal, parseTerminalInline } from "../lib/terminalMarkdown";
import { deterministicThinkingDelay, streamSlices, terminalLineCount } from "../lib/terminalRuntime";
import type { AgentResponse, TerminalOutputBlock, TerminalRunState, TerminalTranscriptEntry, Theme } from "../types";

interface TerminalProps {
  theme: Theme;
  compact?: boolean;
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

function formatElapsed(elapsedMs: number): string {
  return `${(elapsedMs / 1000).toFixed(2)}s`;
}

function tokensFor(block: TerminalOutputBlock): ReactNode {
  return (block.tokens ?? parseTerminalInline(block.content)).map((token, index) => {
    const key = `${block.id}-${index}`;
    if (token.type === "link") return <a key={key} href={token.href} target="_blank" rel="noreferrer">{token.text} <span aria-hidden="true">↗</span><span className="terminal-link-destination">{token.href}</span></a>;
    if (token.type === "code") return <code key={key}>{token.text}</code>;
    if (token.type === "strong") return <strong key={key}>{token.text}</strong>;
    if (token.type === "emphasis") return <em key={key}>{token.text}</em>;
    return <span key={key}>{token.text}</span>;
  });
}

function OutputBlock({ block, active = false }: { block: TerminalOutputBlock; active?: boolean }) {
  const content = tokensFor(block);
  const cursor = active ? <span className="terminal-stream-cursor" aria-hidden="true" /> : null;
  if (block.type === "spacer") return <div className="terminal-output-spacer" aria-hidden="true" />;
  if (block.type === "divider") return <div className="terminal-output-divider" aria-hidden="true">────────────────────────────────</div>;
  if (block.type === "heading") return <div className={`terminal-output-heading terminal-output-heading--${block.level ?? 2}`} role="heading" aria-level={block.level ?? 2}><span className="terminal-heading-mark">{"#".repeat(block.level ?? 2)}</span> {content}{cursor}</div>;
  if (block.type === "list") return <div className="terminal-output-list"><span aria-hidden="true">{block.ordered ? "1." : "•"}</span><div>{content}{cursor}</div></div>;
  if (block.type === "code") return <pre className="terminal-output-code"><span className="terminal-code-language">{block.language || "text"}</span><code>{block.content}</code>{cursor}</pre>;
  if (block.type === "link") return <div className="terminal-output-link">{content}{cursor}</div>;
  return <p className="terminal-output-paragraph">{content}{cursor}</p>;
}

function createFrames(blocks: TerminalOutputBlock[]) {
  return blocks.flatMap((block, blockIndex) => streamSlices(block.content, block.type).map((content) => ({ blockIndex, content })));
}

export function Terminal({ theme, compact = false, onOpenDocument, onEnterIde, onToggleTheme }: TerminalProps) {
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
    requestAnimationFrame(() => inputRef.current?.focus());
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
    requestAnimationFrame(() => inputRef.current?.focus());
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
  }, [cancelRun, clearTranscript, showNow]);

  useEffect(() => {
    const log = logRef.current;
    if (log && followOutputRef.current) log.scrollTop = log.scrollHeight;
  }, [entries]);

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
    <section className={`agent-terminal ${compact ? "agent-terminal--compact" : ""}`} aria-label="Lakindu portfolio terminal">
      <div className="terminal-session">
        <div className="terminal-log" ref={logRef} onScroll={onLogScroll} role="log" aria-live="off" aria-label="Terminal transcript">
          {!compact ? (
            <div className="terminal-boot" aria-label="Lakindu Portfolio Codex startup">
              <pre>{`╭──────────────────────────────────────────────╮\n│ >_ LAKINDU PORTFOLIO CODEX                   │\n│ local agent · read-only portfolio workspace  │\n╰──────────────────────────────────────────────╯`}</pre>
              <dl><div><dt>workspace</dt><dd>~/portfolio</dd></div><div><dt>profile</dt><dd>Quality Engineering Intern</dd></div><div><dt>source</dt><dd>verified Markdown documents</dd></div></dl>
              <p>Type <button type="button" onClick={() => runQuery("/help")}>/help</button> for commands or ask a question.</p>
            </div>
          ) : <div className="terminal-compact-boot"><span>&gt;_ portfolio</span><span>read-only session</span></div>}

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
                {entry.blocks.map((block) => <OutputBlock key={block.id} block={block} />)}
                {entry.activeBlock && <OutputBlock block={entry.activeBlock} active />}
              </div>
              {entry.state === "cancelled" && <div className="terminal-cancelled">^C  Command cancelled after {formatElapsed(entry.metrics.elapsedMs)}</div>}
              {(entry.state === "completed" || entry.state === "error") && entry.response.kind !== "system" && (
                <footer className="terminal-completion">
                  <div><span>{entry.state === "error" ? "error" : "done"}</span><span>{formatElapsed(entry.metrics.elapsedMs)}</span><span>{entry.metrics.linesPrinted} lines</span></div>
                  {entry.response.documentPath && <div className="terminal-source"><span>source</span><code>{entry.response.documentPath}</code><button type="button" onClick={() => onOpenDocument(entry.response.documentPath!)}>Open in IDE <ExternalLink size={13} /></button></div>}
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
            <input ref={inputRef} id={compact ? "dock-command" : "terminal-command"} value={input} maxLength={300} disabled={running} onChange={(event) => { setInput(event.target.value); setSelectedSuggestion(0); setSuggestionsOpen(event.target.value.startsWith("/")); }} onKeyDown={onKeyDown} placeholder={running ? "Command running…" : "Ask about Lakindu or type / for commands"} autoComplete="off" spellCheck="false" autoFocus={!compact} />
            <button type="submit" aria-label="Run command" disabled={running || !input.trim()}><TerminalSquare size={16} /></button>
          </form>
          <div className="terminal-shortcuts" aria-hidden="true"><span>↑↓ history</span><span>tab complete</span><span>ctrl+l clear</span><span>ctrl+c cancel</span></div>
        </div>
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{accessibleResult}</div>
    </section>
  );
}

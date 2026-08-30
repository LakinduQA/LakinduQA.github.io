import { ArrowRight, Bot, ChevronRight, Command, Moon, Sparkles, Sun } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useMemo, useState } from "react";
import { exampleQuestions, resolveAgentQuery, slashCommands } from "../lib/agent";
import type { AgentResponse, Theme } from "../types";

interface TerminalProps {
  theme: Theme;
  compact?: boolean;
  onOpenDocument: (path: string) => void;
  onEnterIde: () => void;
  onToggleTheme: () => void;
}

const initialResponse: AgentResponse = {
  id: "welcome",
  kind: "system",
  message: "I’m your guide to Lakindu’s portfolio. Ask about his work, skills, experience, or use a slash command to explore.",
  suggestions: ["/about", "/experience", "/projects", "/tools"],
};

export function Terminal({ theme, compact = false, onOpenDocument, onEnterIde, onToggleTheme }: TerminalProps) {
  const [input, setInput] = useState("");
  const [responses, setResponses] = useState<AgentResponse[]>([initialResponse]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);

  const matches = useMemo(() => {
    if (!input.startsWith("/")) return [];
    return slashCommands.filter((item) => item.command.startsWith(input.toLowerCase())).slice(0, 6);
  }, [input]);

  const runQuery = (query: string) => {
    const result = resolveAgentQuery(query, theme);
    setInput("");
    setSelectedSuggestion(0);
    if (result.action === "clear") { setResponses([initialResponse]); return; }
    if (result.action === "enter-ide") { onEnterIde(); return; }
    if (result.action === "toggle-theme") onToggleTheme();
    setResponses((current) => [...current, result]);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (input.trim()) runQuery(input);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!matches.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setSelectedSuggestion((current) => (current + 1) % matches.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setSelectedSuggestion((current) => (current - 1 + matches.length) % matches.length); }
    if (event.key === "Tab") { event.preventDefault(); setInput(matches[selectedSuggestion].command); }
    if (event.key === "Escape") setInput("");
  };

  return (
    <section className={`agent-terminal ${compact ? "agent-terminal--compact" : ""}`} aria-label="Lakindu portfolio agent">
      {!compact && (
        <header className="terminal-topbar">
          <div className="terminal-brand"><span>&gt;_</span> Lakindu.dev</div>
          <div className="terminal-topbar__actions">
            <button onClick={onToggleTheme} aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
            <button onClick={onEnterIde}><Command size={15} /> Open IDE</button>
          </div>
        </header>
      )}

      <div className="terminal-session">
        {!compact && (
          <div className="terminal-intro">
            <div className="terminal-intro__icon"><Bot size={27} /></div>
            <div>
              <span className="terminal-version">LAKINDU PORTFOLIO AGENT · LOCAL</span>
              <h1>Explore a quality engineer’s work.</h1>
              <p>Guided answers from verified portfolio files. No AI service, no shell access, and no technical knowledge required.</p>
            </div>
          </div>
        )}

        <div className="terminal-log" role="log" aria-live="polite">
          {responses.map((response) => (
            <div className={`agent-response agent-response--${response.kind}`} key={response.id}>
              {response.input && <div className="agent-query"><ChevronRight size={15} /> <span>{response.input}</span></div>}
              <div className="agent-answer"><Sparkles size={15} /><div><p>{response.message}</p>
                {response.documentPath && <button className="source-link" onClick={() => onOpenDocument(response.documentPath!)}>Open {response.documentPath} <ArrowRight size={13} /></button>}
                {response.suggestions?.length ? <div className="response-suggestions">{response.suggestions.map((suggestion) => <button key={suggestion} onClick={() => runQuery(suggestion)}>{suggestion}</button>)}</div> : null}
              </div></div>
            </div>
          ))}
        </div>

        <div className="terminal-composer">
          {matches.length > 0 && (
            <div className="slash-menu" role="listbox" aria-label="Slash commands">
              {matches.map((item, index) => <button type="button" role="option" aria-selected={selectedSuggestion === index} className={selectedSuggestion === index ? "selected" : ""} key={item.command} onMouseDown={(event) => event.preventDefault()} onClick={() => setInput(item.command)}><code>{item.command}</code><span>{item.description}</span></button>)}
            </div>
          )}
          <form onSubmit={submit}>
            <ChevronRight size={18} aria-hidden="true" />
            <label className="sr-only" htmlFor={compact ? "dock-command" : "terminal-command"}>Ask the portfolio agent</label>
            <input id={compact ? "dock-command" : "terminal-command"} value={input} maxLength={300} onChange={(event) => { setInput(event.target.value); setSelectedSuggestion(0); }} onKeyDown={onKeyDown} placeholder="Ask about Lakindu or type / for commands" autoComplete="off" spellCheck="false" />
            <button type="submit" aria-label="Send question"><ArrowRight size={17} /></button>
          </form>
          {!compact && <div className="terminal-hints"><span>Try asking</span>{exampleQuestions.map((question) => <button key={question} onClick={() => runQuery(question)}>{question}</button>)}</div>}
        </div>
      </div>
    </section>
  );
}

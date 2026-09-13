import { ArrowRight, FastForward, FileText, Plus, Send, Square, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { portfolioSettings } from "../data/settings";
import { exampleQuestions, portfolioAgentWelcome, resolveAgentQuery } from "../lib/agent";
import { parseMarkdownForTerminal, parseTerminalInline } from "../lib/terminalMarkdown";
import { deterministicThinkingDelay, streamSlices } from "../lib/terminalRuntime";
import type { AgentResponse, ChatMessage, TerminalOutputBlock, TerminalRunState, Theme } from "../types";
import { AgentMarkdownBlock } from "./AgentMarkdown";

interface PortfolioChatProps {
  active?: boolean;
  theme: Theme;
  focusRequest?: number;
  onOpenDocument: (path: string) => void;
  onToggleTheme: () => void;
  onClose: () => void;
}

interface RuntimeChatMessage extends ChatMessage {
  state?: TerminalRunState;
  phase?: string;
  elapsedMs?: number;
  blocks?: TerminalOutputBlock[];
  activeBlock?: TerminalOutputBlock;
  model?: string;
}

interface ActiveChatRun {
  id: string;
  response: AgentResponse;
  fullBlocks: TerminalOutputBlock[];
  frames: Array<{ blockIndex: number; content: string }>;
  frameIndex: number;
  startedAt: number;
}

const modelProfiles = portfolioSettings["agent.models"].split(",").map((model) => model.trim()).filter(Boolean);
const defaultModel = portfolioSettings["agent.defaultModel"];

const welcomeMessage: RuntimeChatMessage = {
  id: "chat-welcome",
  role: "agent",
  text: portfolioAgentWelcome,
  suggestions: exampleQuestions,
  state: "completed",
  model: defaultModel,
};

function elapsedLabel(milliseconds = 0): string {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

function createFrames(blocks: TerminalOutputBlock[]) {
  return blocks.flatMap((block, blockIndex) => streamSlices(block.content, block.type).map((content) => ({ blockIndex, content })));
}

export function PortfolioChat({ active = true, theme, focusRequest = 0, onOpenDocument, onToggleTheme, onClose }: PortfolioChatProps) {
  const agentName = portfolioSettings["agent.name"];
  const agentSymbol = portfolioSettings["agent.mark"].split(/\s+/, 1)[0];
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<RuntimeChatMessage[]>([welcomeMessage]);
  const [running, setRunning] = useState(false);
  const [accessibleResult, setAccessibleResult] = useState("");
  const [jumpVisible, setJumpVisible] = useState(false);
  const [resetFocusRequest, setResetFocusRequest] = useState(0);
  const activeRunRef = useRef<ActiveChatRun | null>(null);
  const activeRef = useRef(active);
  const wasActiveRef = useRef(active);
  const followOutputRef = useRef(true);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>>([]);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  activeRef.current = active;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    timersRef.current = [];
  }, []);

  const updateMessage = useCallback((id: string, update: (message: RuntimeChatMessage) => RuntimeChatMessage) => {
    setMessages((current) => current.map((message) => message.id === id ? update(message) : message));
  }, []);

  const completeRun = useCallback(() => {
    const active = activeRunRef.current;
    if (!active) return;
    clearTimers();
    const finalState: TerminalRunState = active.response.kind === "error" ? "error" : "completed";
    updateMessage(active.id, (message) => ({
      ...message,
      text: active.response.kind === "document" ? "" : active.response.message,
      blocks: active.response.kind === "document" ? active.fullBlocks : undefined,
      activeBlock: undefined,
      state: finalState,
      phase: undefined,
      elapsedMs: Math.max(1, Date.now() - active.startedAt),
      documentPath: active.response.documentPath,
      suggestions: active.response.suggestions,
      error: active.response.kind === "error",
    }));
    setAccessibleResult(active.response.message);
    activeRunRef.current = null;
    setRunning(false);
    if (activeRef.current) requestAnimationFrame(() => inputRef.current?.focus());
  }, [clearTimers, updateMessage]);

  const cancelRun = useCallback(() => {
    const active = activeRunRef.current;
    if (!active) return;
    clearTimers();
    updateMessage(active.id, (message) => ({
      ...message,
      state: "cancelled",
      phase: undefined,
      activeBlock: undefined,
      elapsedMs: Math.max(1, Date.now() - active.startedAt),
      suggestions: undefined,
      documentPath: undefined,
    }));
    activeRunRef.current = null;
    setRunning(false);
    setAccessibleResult("Chat response cancelled.");
    if (activeRef.current) requestAnimationFrame(() => inputRef.current?.focus());
  }, [clearTimers, updateMessage]);

  const resetChat = useCallback(() => {
    if (activeRunRef.current) {
      clearTimers();
      activeRunRef.current = null;
      setRunning(false);
    }
    followOutputRef.current = true;
    setJumpVisible(false);
    setMessages([{ ...welcomeMessage, model: selectedModel }]);
    setInput("");
    setAccessibleResult("New chat started.");
    setResetFocusRequest((request) => request + 1);
  }, [clearTimers, selectedModel]);

  const beginStreaming = useCallback(() => {
    const active = activeRunRef.current;
    if (!active) return;
    updateMessage(active.id, (message) => ({ ...message, state: "streaming", phase: "Writing grounded response" }));

    const advance = () => {
      const current = activeRunRef.current;
      if (!current) return;
      const frame = current.frames[current.frameIndex];
      if (!frame) {
        completeRun();
        return;
      }
      const source = current.fullBlocks[frame.blockIndex];
      const activeBlock = { ...source, content: frame.content, tokens: parseTerminalInline(frame.content) };
      updateMessage(current.id, (message) => ({
        ...message,
        text: "",
        blocks: current.fullBlocks.slice(0, frame.blockIndex),
        activeBlock,
        elapsedMs: Math.max(1, Date.now() - current.startedAt),
      }));
      current.frameIndex += 1;
      if (current.frameIndex >= current.frames.length) completeRun();
    };

    advance();
    if (activeRunRef.current) timersRef.current.push(setInterval(advance, 58));
  }, [completeRun, updateMessage]);

  const runAgentResponse = useCallback((response: AgentResponse) => {
    const startedAt = Date.now();
    const phase = response.documentPath ? `Reading ${response.documentPath}` : "Matching portfolio context";
    const agent: RuntimeChatMessage = {
      id: response.id,
      role: "agent",
      text: "",
      error: response.kind === "error",
      state: "thinking",
      phase,
      elapsedMs: 0,
      model: selectedModel,
    };
    const fullBlocks = response.kind === "document"
      ? parseMarkdownForTerminal(response.document?.markdown)
      : [{ id: `${response.id}-message`, type: "paragraph" as const, content: response.message, tokens: parseTerminalInline(response.message) }];
    const frames = createFrames(fullBlocks);
    activeRunRef.current = { id: response.id, response, fullBlocks, frames, frameIndex: 0, startedAt };
    setMessages((current) => [...current, agent]);
    setRunning(true);
    setAccessibleResult("");

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const delay = reducedMotion ? 80 : response.kind === "error" ? 650 : deterministicThinkingDelay(response.document?.markdown.length ?? response.message.length);
    if (!reducedMotion) {
      timersRef.current.push(setTimeout(() => updateMessage(response.id, (message) => ({ ...message, phase: "Matching portfolio context" })), Math.round(delay / 3)));
      timersRef.current.push(setTimeout(() => updateMessage(response.id, (message) => ({ ...message, phase: "Composing from verified Markdown" })), Math.round(delay * 2 / 3)));
      timersRef.current.push(setInterval(() => updateMessage(response.id, (message) => ({ ...message, elapsedMs: Math.max(1, Date.now() - startedAt) })), 80));
    }
    timersRef.current.push(setTimeout(() => reducedMotion ? completeRun() : beginStreaming(), delay));
  }, [beginStreaming, completeRun, selectedModel, updateMessage]);

  const ask = useCallback((question: string) => {
    const value = question.trim();
    if (!value || activeRunRef.current) return;
    const result = resolveAgentQuery(value, theme);
    if (result.action === "clear") {
      const text = "Use the New chat button to start a fresh conversation.";
      setMessages((current) => [
        ...current,
        { id: `${result.id}-visitor`, role: "visitor", text: value, state: "completed" },
        { id: result.id, role: "agent", text, state: "completed", model: selectedModel },
      ]);
      setInput("");
      setAccessibleResult(text);
      return;
    }

    const visitor: RuntimeChatMessage = { id: `${result.id}-visitor`, role: "visitor", text: value, state: "completed" };
    setMessages((current) => [...current, visitor]);
    setInput("");

    if (result.action === "toggle-theme") onToggleTheme();
    if (result.kind === "system") {
      const text = result.action === "enter-ide" ? "You are already in the portfolio IDE. Choose a file from Explorer or ask about a topic." : result.message;
      setMessages((current) => [...current, { id: result.id, role: "agent", text, state: "completed", documentPath: result.documentPath, suggestions: result.suggestions, model: selectedModel }]);
      setAccessibleResult(text);
      return;
    }
    runAgentResponse(result);
  }, [onToggleTheme, runAgentResponse, selectedModel, theme]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const scrollToLatest = useCallback(() => {
    const element = messagesRef.current;
    if (!element) return;
    followOutputRef.current = true;
    if (element.scrollTo) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    else element.scrollTop = element.scrollHeight;
    setJumpVisible(false);
  }, []);

  const onMessagesScroll = useCallback(() => {
    const element = messagesRef.current;
    if (!element) return;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= 48;
    followOutputRef.current = nearBottom;
    setJumpVisible(!nearBottom);
  }, []);

  useEffect(() => {
    const element = messagesRef.current;
    if (!element || !followOutputRef.current) return;
    element.scrollTop = element.scrollHeight;
    setJumpVisible(false);
  }, [messages]);

  useEffect(() => {
    if (active && focusRequest > 0 && !running) inputRef.current?.focus();
  }, [active, focusRequest, running]);

  useEffect(() => {
    if (active && resetFocusRequest > 0) inputRef.current?.focus();
  }, [active, resetFocusRequest]);

  useEffect(() => {
    const wasActive = wasActiveRef.current;
    wasActiveRef.current = active;
    if (!active || wasActive) return;
    if (followOutputRef.current) requestAnimationFrame(scrollToLatest);
    if (!running) requestAnimationFrame(() => inputRef.current?.focus());
  }, [active, running, scrollToLatest]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask(input);
  };

  return (
    <section className="portfolio-chat" aria-label={`${agentName} portfolio extension`}>
      <header className="assert-chat-header">
        <div className="assert-chat-brand"><span className="assert-mark">{agentSymbol}</span><div><strong>{agentName}</strong><small>{selectedModel} · local simulation</small></div></div>
        <div className="assert-chat-actions">
          <button aria-label="New chat" title="New chat" onClick={resetChat}><Plus size={15} /></button>
          <button aria-label={`Close ${agentName}`} title={`Close ${agentName}`} onClick={onClose}><X size={15} /></button>
        </div>
      </header>
      <div className="assert-chat-context"><span className="assert-status-dot" /> local agent <span>·</span> portfolio <span>·</span> read only</div>
      <div className="chat-messages" ref={messagesRef} onScroll={onMessagesScroll} role="log" aria-live="off" aria-label={`${agentName} conversation`}>
        {messages.map((message) => (
          <div className={`chat-message chat-message--${message.role} ${message.error ? "chat-message--error" : ""}`} key={message.id} data-state={message.state}>
            {message.role === "agent" && <span className="chat-agent-mark" aria-hidden="true">{agentSymbol}</span>}
            <div className="chat-message-content">
              {message.role === "agent" && <div className="chat-message-meta"><span className="chat-author">{agentName}</span>{message.model && <span className="chat-model-badge" title="Display-only local model profile">{message.model}</span>}</div>}
              {message.error && <span className="chat-error-label">Error</span>}
              {(message.state === "thinking" || message.state === "streaming") && <div className="chat-thinking" role="status"><span className="terminal-spinner" aria-hidden="true">⠋</span><span>{message.phase}</span><time>{elapsedLabel(message.elapsedMs)}</time></div>}
              {message.text && <p>{message.text}{message.state === "streaming" && <span className="terminal-stream-cursor" aria-hidden="true" />}</p>}
              {message.blocks?.length || message.activeBlock ? <div className="chat-document-output">{message.blocks?.map((block) => <AgentMarkdownBlock key={block.id} block={block} />)}{message.activeBlock && <AgentMarkdownBlock block={message.activeBlock} active />}</div> : null}
              {message.state === "cancelled" && <p className="chat-cancelled">^C Response cancelled after {elapsedLabel(message.elapsedMs)}</p>}
              {(message.state === "completed" || message.state === "error" || !message.state) && message.documentPath && <button className="chat-source" onClick={() => onOpenDocument(message.documentPath!)}><FileText size={14} /><span>{message.documentPath}</span><ArrowRight size={13} /></button>}
              {(message.state === "completed" || message.state === "error" || !message.state) && message.suggestions?.length ? <div className="chat-suggestions">{message.suggestions.map((suggestion) => <button disabled={running} onClick={() => ask(suggestion)} key={suggestion}>{suggestion}</button>)}</div> : null}
            </div>
          </div>
        ))}
        {jumpVisible && <button type="button" className="chat-jump-latest" onClick={scrollToLatest}>Jump to latest</button>}
      </div>
      <div className="chat-input-area">
        {running && <div className="chat-run-controls" aria-label="Chat response controls"><button type="button" onClick={cancelRun}><Square size={11} /> Cancel</button><button type="button" onClick={completeRun}><FastForward size={12} /> Show now</button></div>}
        <form className="chat-composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="chat-question">Ask a portfolio question</label>
          <textarea ref={inputRef} id="chat-question" rows={3} maxLength={300} disabled={running} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (!active) return; if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(input); } }} placeholder={running ? `${agentName} is working…` : `Ask ${agentName} about this portfolio`} />
          <div className="chat-composer-footer">
            <label className="sr-only" htmlFor="chat-model-profile">Model profile</label>
            <select id="chat-model-profile" aria-label="Model profile" title="Display-only local model profile; responses remain deterministic" value={selectedModel} disabled={running} onChange={(event) => setSelectedModel(event.target.value)}>
              {modelProfiles.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
            <span className="chat-send-hint">Enter to send</span>
            <button type="submit" aria-label="Send message" disabled={running || !input.trim()}><Send size={14} /></button>
          </div>
        </form>
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{accessibleResult}</div>
    </section>
  );
}

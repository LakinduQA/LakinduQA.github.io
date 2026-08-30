import { ArrowRight, Bot, FileText, Send, Sparkles, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { exampleQuestions, resolveAgentQuery } from "../lib/agent";
import type { ChatMessage, Theme } from "../types";

interface PortfolioChatProps {
  theme: Theme;
  onOpenDocument: (path: string) => void;
  onToggleTheme: () => void;
}

const welcomeMessage: ChatMessage = {
  id: "chat-welcome",
  role: "agent",
  text: "Ask me about Lakindu’s experience, education, skills, tools, projects, writing, resume, or contact details. I answer only from the portfolio files.",
  suggestions: exampleQuestions,
};

export function PortfolioChat({ theme, onOpenDocument, onToggleTheme }: PortfolioChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);

  const ask = (question: string) => {
    const value = question.trim();
    if (!value) return;
    const result = resolveAgentQuery(value, theme);
    const visitor: ChatMessage = { id: `${result.id}-visitor`, role: "visitor", text: value };
    if (result.action === "clear") { setMessages([welcomeMessage]); setInput(""); return; }
    if (result.action === "toggle-theme") onToggleTheme();
    const agent: ChatMessage = {
      id: result.id,
      role: "agent",
      text: result.action === "enter-ide" ? "You are already in the portfolio IDE. Choose a file from Explorer or ask about a topic." : result.message,
      documentPath: result.documentPath,
      suggestions: result.suggestions,
      error: result.kind === "error",
    };
    setMessages((current) => [...current, visitor, agent]);
    setInput("");
  };

  const submit = (event: FormEvent) => { event.preventDefault(); ask(input); };

  return (
    <section className="portfolio-chat" aria-label="Portfolio chat">
      <header className="panel-header"><span>PORTFOLIO AGENT</span><button aria-label="Clear chat" onClick={() => setMessages([welcomeMessage])}><Trash2 size={14} /></button></header>
      <div className="chat-intro"><div><Bot size={20} /></div><h2>Ask Lakindu’s portfolio</h2><p>Local answers from Markdown. No generated facts.</p></div>
      <div className="chat-messages" role="log" aria-live="polite">
        {messages.map((message) => (
          <div className={`chat-message chat-message--${message.role} ${message.error ? "chat-message--error" : ""}`} key={message.id}>
            {message.role === "agent" && <Sparkles size={14} />}
            <div><p>{message.text}</p>
              {message.documentPath && <button className="chat-source" onClick={() => onOpenDocument(message.documentPath!)}><FileText size={14} /><span>{message.documentPath}</span><ArrowRight size={13} /></button>}
              {message.suggestions?.length ? <div className="chat-suggestions">{message.suggestions.map((suggestion) => <button onClick={() => ask(suggestion)} key={suggestion}>{suggestion}</button>)}</div> : null}
            </div>
          </div>
        ))}
      </div>
      <form className="chat-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="chat-question">Ask a portfolio question</label>
        <textarea id="chat-question" rows={2} maxLength={300} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(input); } }} placeholder="Ask about experience, tools, projects…" />
        <button type="submit" aria-label="Send message"><Send size={15} /></button>
      </form>
    </section>
  );
}

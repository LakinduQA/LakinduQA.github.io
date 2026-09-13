import { act, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { portfolioSettings } from "../data/settings";
import { PortfolioChat } from "./PortfolioChat";

function renderChat() {
  const onOpenDocument = vi.fn();
  const onToggleTheme = vi.fn();
  const onClose = vi.fn();
  const view = render(<PortfolioChat theme="dark" onOpenDocument={onOpenDocument} onToggleTheme={onToggleTheme} onClose={onClose} />);
  return { ...view, onOpenDocument, onToggleTheme, onClose };
}

function ask(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input.closest("form")!);
}

describe("Assert portfolio extension", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows thinking phases and streams the complete grounded document", () => {
    const { getByLabelText, getByRole, getByText, onOpenDocument } = renderChat();
    const input = getByLabelText("Ask a portfolio question");
    ask(input, "/experience");
    expect(input).toBeDisabled();
    expect(getByText("Reading portfolio/career/experience.md")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(700));
    expect(getByRole("status")).toHaveTextContent(/Matching portfolio context|Composing from verified Markdown/);
    fireEvent.click(within(getByLabelText("Chat response controls")).getByText("Show now"));
    const conversation = within(getByLabelText("Assert conversation"));
    expect(conversation.getByRole("heading", { name: "Experience" })).toBeInTheDocument();
    expect(conversation.getByRole("heading", { name: "Associate QA Engineer" })).toBeInTheDocument();
    expect(conversation.getByText(/Codimite · September 2026–Present/)).toBeInTheDocument();
    expect(conversation.getByRole("heading", { name: "Intern QA Engineer" })).toBeInTheDocument();
    expect(conversation.getByText(/Promoted to Associate QA Engineer/)).toBeInTheDocument();
    expect(input).toBeEnabled();
    fireEvent.click(getByRole("button", { name: /portfolio\/career\/experience.md/ }));
    expect(onOpenDocument).toHaveBeenCalledWith("portfolio/career/experience.md");
  });

  it("cancels a response and restores the composer", () => {
    const { getByLabelText, getByText } = renderChat();
    const input = getByLabelText("Ask a portfolio question");
    ask(input, "/projects");
    fireEvent.click(within(getByLabelText("Chat response controls")).getByText("Cancel"));
    expect(getByText(/Response cancelled/)).toBeInTheDocument();
    expect(input).toBeEnabled();
  });

  it("renders complete output immediately with reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const { getByLabelText } = renderChat();
    ask(getByLabelText("Ask a portfolio question"), "/tools");
    act(() => vi.advanceTimersByTime(80));
    expect(within(getByLabelText("Assert conversation")).getByRole("heading", { name: "Tools and technologies" })).toBeInTheDocument();
  });

  it("marks unsupported questions as chat errors throughout the response", () => {
    const { getByLabelText, getByText } = renderChat();
    ask(getByLabelText("Ask a portfolio question"), "write me a weather forecast");

    const errorLabel = getByText("Error");
    const errorMessage = errorLabel.closest(".chat-message");
    expect(errorMessage).toHaveClass("chat-message--error");
    expect(errorMessage).toHaveAttribute("data-state", "thinking");

    fireEvent.click(within(getByLabelText("Chat response controls")).getByText("Show now"));
    expect(errorMessage).toHaveAttribute("data-state", "error");
    expect(errorMessage).toHaveTextContent("I can only answer questions covered by this portfolio");
  });

  it("starts a new chat and closes the extension", () => {
    const { getByLabelText, getByRole, queryByText, onClose } = renderChat();
    ask(getByLabelText("Ask a portfolio question"), "/help");
    expect(queryByText("/help")).toBeInTheDocument();
    fireEvent.click(getByRole("button", { name: "New chat" }));
    expect(queryByText("/help")).not.toBeInTheDocument();
    fireEvent.click(getByRole("button", { name: "Close Assert" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps New chat as the only command that resets the conversation", () => {
    const { getByLabelText, getByText } = renderChat();
    const input = getByLabelText("Ask a portfolio question");
    ask(input, "/help");
    ask(input, "/clear");

    expect(getByText("/help", { exact: true })).toBeInTheDocument();
    expect(getByText("/clear", { exact: true })).toBeInTheDocument();
    expect(within(getByLabelText("Assert conversation")).getByText("Use the New chat button to start a fresh conversation.")).toBeInTheDocument();
  });

  it("focuses the composer when the workspace requests it", () => {
    const props = { theme: "dark" as const, onOpenDocument: vi.fn(), onToggleTheme: vi.fn(), onClose: vi.fn() };
    const { getByLabelText, rerender } = render(<PortfolioChat {...props} focusRequest={0} />);
    const input = getByLabelText("Ask a portfolio question");

    expect(input).not.toHaveFocus();
    rerender(<PortfolioChat {...props} focusRequest={1} />);
    expect(input).toHaveFocus();
  });

  it("retains the draft, model, messages, and background response while inactive", () => {
    const props = { theme: "dark" as const, onOpenDocument: vi.fn(), onToggleTheme: vi.fn(), onClose: vi.fn() };
    const { getByLabelText, getByRole, rerender } = render(<PortfolioChat {...props} active focusRequest={0} />);
    const input = getByLabelText("Ask a portfolio question");
    const selector = getByLabelText("Model profile");

    fireEvent.change(selector, { target: { value: "Claude Fable 5" } });
    ask(input, "/tools");
    rerender(<PortfolioChat {...props} active={false} focusRequest={1} />);
    act(() => vi.runAllTimers());
    expect(within(getByLabelText("Assert conversation")).getByRole("heading", { name: "Tools and technologies" })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "unfinished follow-up" } });
    (input as HTMLElement).blur();
    expect(input).not.toHaveFocus();
    rerender(<PortfolioChat {...props} active focusRequest={1} />);

    expect(input).toHaveValue("unfinished follow-up");
    expect(input).toHaveFocus();
    expect(selector).toHaveValue("Claude Fable 5");
    expect(getByRole("heading", { name: "Tools and technologies" })).toBeInTheDocument();
  });

  it("preserves manual transcript scroll and exposes a jump to the latest response", () => {
    const { getByLabelText, getByRole } = renderChat();
    const conversation = getByLabelText("Assert conversation") as HTMLDivElement;
    Object.defineProperties(conversation, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 700 },
      scrollTop: { configurable: true, writable: true, value: 120 },
    });
    fireEvent.scroll(conversation);

    ask(getByLabelText("Ask a portfolio question"), "/help");
    expect(conversation.scrollTop).toBe(120);
    const jump = getByRole("button", { name: "Jump to latest" });
    expect(jump).toBeInTheDocument();
    fireEvent.click(jump);
    expect(conversation.scrollTop).toBe(700);
  });

  it("starts a new chat without resetting the selected model", () => {
    const { getByLabelText, getByRole, getByText, queryByLabelText, queryByText } = renderChat();
    const input = getByLabelText("Ask a portfolio question");
    const selector = getByLabelText("Model profile");
    fireEvent.change(selector, { target: { value: "Claude Fable 5" } });
    ask(input, "/projects");

    fireEvent.click(getByRole("button", { name: "New chat" }));

    expect(queryByText("/projects")).not.toBeInTheDocument();
    expect(queryByLabelText("Chat response controls")).not.toBeInTheDocument();
    expect(selector).toHaveValue("Claude Fable 5");
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(getByText("New chat started.")).toBeInTheDocument();
  });

  it("selects a display-only model profile for the next response", () => {
    const { getByLabelText, getByText } = renderChat();
    const selector = getByLabelText("Model profile");

    expect(selector).toHaveValue(portfolioSettings["agent.defaultModel"]);
    fireEvent.change(selector, { target: { value: "Claude Fable 5" } });
    ask(getByLabelText("Ask a portfolio question"), "/tools");
    fireEvent.click(within(getByLabelText("Chat response controls")).getByText("Show now"));
    expect(getByText("Claude Fable 5", { selector: ".chat-model-badge" })).toBeInTheDocument();
  });
});

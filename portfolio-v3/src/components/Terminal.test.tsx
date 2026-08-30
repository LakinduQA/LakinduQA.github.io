import { act, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Terminal } from "./Terminal";

function renderTerminal() {
  const onOpenDocument = vi.fn();
  const onEnterIde = vi.fn();
  const onToggleTheme = vi.fn();
  const view = render(<Terminal theme="dark" onOpenDocument={onOpenDocument} onEnterIde={onEnterIde} onToggleTheme={onToggleTheme} />);
  return { ...view, onOpenDocument, onEnterIde, onToggleTheme };
}

function submit(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input.closest("form")!);
}

describe("Codex-style terminal", () => {
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

  it("runs timed phases, streams the full Markdown, and restores the prompt", () => {
    const { getByLabelText, getByRole, getByText } = renderTerminal();
    const input = getByLabelText("Terminal command");
    submit(input, "/experience");

    expect(input).toBeDisabled();
    expect(getByText("Reading portfolio/career/experience.md")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(650));
    expect(getByText(/Matching portfolio context|Formatting terminal output/)).toBeInTheDocument();
    act(() => vi.runAllTimers());

    expect(getByRole("heading", { name: /Experience/ })).toBeInTheDocument();
    expect(getByText("Independent QA project work")).toBeInTheDocument();
    expect(getByText(/Designing and documenting end-to-end/)).toBeInTheDocument();
    expect(input).not.toBeDisabled();
    expect(getByText(/lines/)).toBeInTheDocument();
  });

  it("fast-forwards a running document and opens its IDE source", () => {
    const { getByLabelText, getByRole, onOpenDocument } = renderTerminal();
    submit(getByLabelText("Terminal command"), "/about");
    fireEvent.click(getByRole("button", { name: /Show now/ }));
    const source = getByRole("button", { name: /Open in IDE/ });
    fireEvent.click(source);
    expect(onOpenDocument).toHaveBeenCalledWith("portfolio/profile/about.md");
    act(() => vi.runOnlyPendingTimers());
    expect(getByRole("button", { name: /Open in IDE/ })).toBeInTheDocument();
  });

  it("cancels during thinking with Ctrl+C and cleans up timers", () => {
    const { getByLabelText } = renderTerminal();
    const input = getByLabelText("Terminal command");
    submit(input, "/projects");
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    expect(within(getByLabelText("Terminal transcript")).getByText(/Command cancelled/)).toBeInTheDocument();
    expect(input).not.toBeDisabled();
    act(() => vi.runOnlyPendingTimers());
    expect(within(getByLabelText("Terminal transcript")).queryByRole("status")).not.toBeInTheDocument();
  });

  it("cancels after streaming has started", () => {
    const { getByLabelText } = renderTerminal();
    submit(getByLabelText("Terminal command"), "/experience");
    act(() => vi.advanceTimersByTime(1800));
    fireEvent.click(within(getByLabelText("Running command controls")).getByText("Cancel"));
    expect(within(getByLabelText("Terminal transcript")).getByText(/Command cancelled/)).toBeInTheDocument();
  });

  it("supports command history, tab completion, Escape, and Ctrl+L", () => {
    const { getByLabelText, queryByRole } = renderTerminal();
    const input = getByLabelText("Terminal command") as HTMLInputElement;
    submit(input, "/help");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.value).toBe("/help");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.value).toBe("");
    fireEvent.change(input, { target: { value: "/exp" } });
    fireEvent.keyDown(input, { key: "Tab" });
    expect(input.value).toBe("/experience");
    fireEvent.change(input, { target: { value: "/" } });
    expect(queryByRole("listbox", { name: "Slash command completions" })).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(queryByRole("listbox", { name: "Slash command completions" })).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: "l", ctrlKey: true });
    expect(getByLabelText("Terminal transcript").querySelector(".terminal-entry")).toBeNull();
  });

  it("prints the complete slash command reference with /help", () => {
    const { getByLabelText, getByText } = renderTerminal();
    submit(getByLabelText("Terminal command"), "/help");
    expect(getByText("/experience", { selector: "code" })).toBeInTheDocument();
    expect(getByText("View quality engineering experience", { exact: false })).toBeInTheDocument();
    expect(getByLabelText("Terminal command")).not.toBeDisabled();
  });

  it("uses Enter to show the remaining response immediately", () => {
    const { getByLabelText, getByText } = renderTerminal();
    submit(getByLabelText("Terminal command"), "/education");
    fireEvent.keyDown(window, { key: "Enter" });
    expect(getByText("Education")).toBeInTheDocument();
    expect(getByLabelText("Terminal command")).not.toBeDisabled();
  });

  it("runs unsupported prompts through matching before showing an error", () => {
    const { getByLabelText, getByText } = renderTerminal();
    submit(getByLabelText("Terminal command"), "book me a flight");
    expect(getByText("Matching portfolio context")).toBeInTheDocument();
    act(() => vi.runAllTimers());
    expect(within(getByLabelText("Terminal transcript")).getByText(/only answer questions covered by this portfolio/)).toBeInTheDocument();
    expect(getByText("error")).toBeInTheDocument();
  });

  it("renders complete output after a minimal reduced-motion transition", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const { getByLabelText, getByText } = renderTerminal();
    submit(getByLabelText("Terminal command"), "/contact");
    act(() => vi.advanceTimersByTime(80));
    expect(getByText("Direct links")).toBeInTheDocument();
    expect(getByText("LinkedIn")).toBeInTheDocument();
  });

  it("opens a requested IDE document without artificial delay", () => {
    const { getByLabelText, onOpenDocument } = renderTerminal();
    submit(getByLabelText("Terminal command"), "/ide experience");
    expect(onOpenDocument).toHaveBeenCalledWith("portfolio/career/experience.md");
    expect(getByLabelText("Terminal command")).not.toBeDisabled();
  });
});

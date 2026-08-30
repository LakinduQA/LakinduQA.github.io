import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Terminal } from "./Terminal";

function renderTerminal() {
  const onOpenDocument = vi.fn();
  const onEnterIde = vi.fn();
  const onToggleTheme = vi.fn();
  const view = render(<Terminal theme="dark" onOpenDocument={onOpenDocument} onEnterIde={onEnterIde} onToggleTheme={onToggleTheme} />);
  return { ...view, onOpenDocument, onEnterIde, onToggleTheme };
}

describe("guided terminal", () => {
  it("answers slash commands and opens their source document", () => {
    const { getByLabelText, getByRole, onOpenDocument } = renderTerminal();
    const input = getByLabelText("Ask the portfolio agent");
    fireEvent.change(input, { target: { value: "/about" } });
    fireEvent.submit(input.closest("form")!);
    const source = getByRole("button", { name: /Open portfolio\/profile\/about.md/ });
    fireEvent.click(source);
    expect(onOpenDocument).toHaveBeenCalledWith("portfolio/profile/about.md");
  });

  it("switches to the IDE with /ide", () => {
    const { getByLabelText, onEnterIde } = renderTerminal();
    const input = getByLabelText("Ask the portfolio agent");
    fireEvent.change(input, { target: { value: "/ide" } });
    fireEvent.submit(input.closest("form")!);
    expect(onEnterIde).toHaveBeenCalledOnce();
  });

  it("shows an error for unsupported questions", () => {
    const { getByLabelText, getByText } = renderTerminal();
    const input = getByLabelText("Ask the portfolio agent");
    fireEvent.change(input, { target: { value: "book me a flight" } });
    fireEvent.submit(input.closest("form")!);
    expect(getByText(/only answer questions covered by this portfolio/)).toBeInTheDocument();
  });
});

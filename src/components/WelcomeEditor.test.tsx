import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WelcomeEditor } from "./WelcomeEditor";

describe("WelcomeEditor portrait", () => {
  it("uses the stable descriptive portrait URL and intrinsic dimensions", () => {
    render(
      <WelcomeEditor
        projectCount={7}
        articleCount={3}
        onOpenDocument={vi.fn()}
        onOpenChat={vi.fn()}
        onOpenTerminal={vi.fn()}
      />,
    );

    const portrait = screen.getByRole("img", { name: "Portrait of Lakindu De Silva, Quality Engineer" });
    expect(portrait).toHaveAttribute("src", "/media/lakindu-de-silva-quality-engineer.jpg");
    expect(portrait).toHaveAttribute("width", "1200");
    expect(portrait).toHaveAttribute("height", "1661");
  });
});

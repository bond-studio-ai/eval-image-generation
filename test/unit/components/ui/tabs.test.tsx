// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { type TabItem, Tabs } from "@/components/ui/tabs";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

describe("Tabs", () => {
  it("renders link tabs inside a nav with aria-current on the active item", () => {
    const items: TabItem[] = [
      { key: "a", label: "Alpha", href: "/a" },
      { key: "b", label: "Beta", href: "/b" }
    ];
    render(<Tabs items={items} active="a" label="Sections" />);
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alpha" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Beta" })).not.toHaveAttribute("aria-current");
  });

  it("renders button tabs with aria-pressed and fires onChange", async () => {
    const onChange = vi.fn();
    const items: TabItem[] = [
      { key: "list", label: "List" },
      { key: "matrix", label: "Matrix" }
    ];
    render(<Tabs items={items} active="list" onChange={onChange} />);
    expect(screen.getByRole("group")).toBeInTheDocument();
    const matrix = screen.getByRole("button", { name: "Matrix" });
    expect(matrix).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(matrix);
    expect(onChange).toHaveBeenCalledWith("matrix");
  });

  it("renders disabled items as non-interactive spans", () => {
    const items: TabItem[] = [
      { key: "a", label: "Alpha", href: "/a" },
      { key: "b", label: "Disabled", href: "/b", disabled: true }
    ];
    render(<Tabs items={items} active="a" />);
    expect(screen.queryByRole("link", { name: "Disabled" })).not.toBeInTheDocument();
    expect(screen.getByText("Disabled").tagName).toBe("SPAN");
  });

  it("renders a count pill", () => {
    render(<Tabs items={[{ key: "a", label: "Alpha", href: "/a", count: 7 }]} active="a" />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});

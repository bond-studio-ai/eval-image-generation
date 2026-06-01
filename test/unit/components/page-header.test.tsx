// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PageHeader } from "@/components/page-header";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

describe("PageHeader", () => {
  it("renders the title as an h1", () => {
    render(<PageHeader title="Strategies" />);
    expect(screen.getByRole("heading", { level: 1, name: "Strategies" })).toBeInTheDocument();
  });

  it("hides the h1 when the title is empty", () => {
    render(<PageHeader title="" />);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("renders a string subtitle and actions", () => {
    render(<PageHeader title="T" subtitle="A subtitle" actions={<button type="button">New</button>} />);
    expect(screen.getByText("A subtitle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
  });

  it("renders a back link with the default label", () => {
    render(<PageHeader title="T" backHref="/strategies" />);
    const link = screen.getByRole("link", { name: /Back/ });
    expect(link).toHaveAttribute("href", "/strategies");
  });

  it("uses a custom back label", () => {
    render(<PageHeader title="T" backHref="/x" backLabel="Back to X" />);
    expect(screen.getByRole("link", { name: "Back to X" })).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button, LinkButton } from "@/components/ui/button";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

describe("Button", () => {
  it("renders children and defaults to type=button", () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveAttribute("type", "button");
  });

  it("fires onClick when enabled", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled when loading and shows a spinner", () => {
    render(<Button loading>Submitting</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("hides the left icon while loading", () => {
    render(
      <Button loading iconLeft={<svg data-testid="left-icon" />}>
        Busy
      </Button>
    );
    expect(screen.queryByTestId("left-icon")).not.toBeInTheDocument();
  });

  it("renders the left icon when not loading", () => {
    render(<Button iconLeft={<svg data-testid="left-icon" />}>Add</Button>);
    expect(screen.getByTestId("left-icon")).toBeInTheDocument();
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>
    );
    await userEvent.click(screen.getByRole("button", { name: "Nope" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies the danger variant palette", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-danger-600");
  });

  it("renders the right icon when not loading", () => {
    render(<Button iconRight={<svg data-testid="right-icon" />}>Next</Button>);
    expect(screen.getByTestId("right-icon")).toBeInTheDocument();
  });
});

describe("LinkButton", () => {
  it("renders an internal next/link anchor with icons", () => {
    render(
      <LinkButton href="/new" iconLeft={<svg data-testid="li" />} iconRight={<svg data-testid="ri" />}>
        Create
      </LinkButton>
    );
    const link = screen.getByRole("link", { name: /Create/ });
    expect(link).toHaveAttribute("href", "/new");
    expect(screen.getByTestId("li")).toBeInTheDocument();
    expect(screen.getByTestId("ri")).toBeInTheDocument();
  });

  it("renders a plain anchor for external links with target/rel", () => {
    render(
      <LinkButton href="https://example.com" external target="_blank" rel="noopener">
        Out
      </LinkButton>
    );
    const link = screen.getByRole("link", { name: "Out" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener");
  });
});

// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { FilterPills, NameCell, SearchBar, SelectAllCheckbox, StatusBadge, ToggleFilter } from "@/components/data-table";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

describe("SearchBar", () => {
  it("fires onChange as the user types", async () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} placeholder="Search strategies" />);
    await userEvent.type(screen.getByRole("textbox", { name: "Search strategies" }), "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });
});

describe("SelectAllCheckbox", () => {
  it("is checked when all rows are selected", () => {
    render(<SelectAllCheckbox count={3} total={3} onToggle={vi.fn()} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByText("3 selected")).toBeInTheDocument();
  });

  it("is indeterminate for a partial selection", () => {
    render(<SelectAllCheckbox count={1} total={3} onToggle={vi.fn()} />);
    expect(screen.getByRole<HTMLInputElement>("checkbox").indeterminate).toBe(true);
  });
});

describe("FilterPills", () => {
  it("renders options and fires onChange", async () => {
    const onChange = vi.fn();
    render(
      <FilterPills
        options={[
          { label: "All", value: "all" },
          { label: "Active", value: "active" }
        ]}
        value="all"
        onChange={onChange}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Active" }));
    expect(onChange).toHaveBeenCalledWith("active");
  });
});

describe("ToggleFilter", () => {
  it("exposes a switch role and toggles", async () => {
    const onChange = vi.fn();
    render(<ToggleFilter label="Active only" checked={false} onChange={onChange} />);
    const sw = screen.getByRole("switch", { name: "Active only" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    await userEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("StatusBadge", () => {
  it("maps the status to a label", () => {
    const { rerender } = render(<StatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    rerender(<StatusBadge status="deleted" label="Removed" />);
    expect(screen.getByText("Removed")).toBeInTheDocument();
  });
});

describe("NameCell", () => {
  it("links to the resource and shows the subtitle", () => {
    render(<NameCell href="/x/1" name="My Resource" subtitle="A description" />);
    const link = screen.getByRole("link", { name: "My Resource" });
    expect(link).toHaveAttribute("href", "/x/1");
    expect(screen.getByText("A description")).toBeInTheDocument();
  });

  it("falls back to 'Untitled' for a null name", () => {
    render(<NameCell href="/x/1" name={null} />);
    expect(screen.getByRole("link", { name: "Untitled" })).toBeInTheDocument();
  });
});

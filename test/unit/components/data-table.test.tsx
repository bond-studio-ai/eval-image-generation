// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { type ColumnDef, DataTable, FilterPills, NameCell, SearchBar, SelectAllCheckbox, StatusBadge, ToggleFilter } from "@/components/data-table";

interface Row {
  id: string;
  name: string;
}
const rowColumns: ColumnDef<Row>[] = [{ id: "name", header: "Name", cell: ({ row }) => row.original.name }];

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

describe("DataTable", () => {
  it("renders a header and a row per item", () => {
    render(
      <DataTable
        columns={rowColumns}
        data={[
          { id: "1", name: "Alpha" },
          { id: "2", name: "Beta" }
        ]}
        rowKey={(r) => r.id}
        enableColumnVisibility={false}
      />
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("renders the empty message when there is no data", () => {
    render(<DataTable columns={rowColumns} data={[]} rowKey={(r) => r.id} emptyMessage="Nothing here" enableColumnVisibility={false} />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders skeleton rows while loading instead of data", () => {
    render(<DataTable columns={rowColumns} data={[{ id: "1", name: "Alpha" }]} rowKey={(r) => r.id} loading enableColumnVisibility={false} />);
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("renders a toolbar and footer when provided", () => {
    render(<DataTable columns={rowColumns} data={[{ id: "1", name: "Alpha" }]} rowKey={(r) => r.id} enableColumnVisibility={false} toolbar={<span>toolbar-here</span>} footer={<span>footer-here</span>} />);
    expect(screen.getByText("toolbar-here")).toBeInTheDocument();
    expect(screen.getByText("footer-here")).toBeInTheDocument();
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

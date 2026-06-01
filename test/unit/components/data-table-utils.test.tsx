// @vitest-environment jsdom
import type { CellContext } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { actionsColumn, checkboxColumn } from "@/components/data-table-utils";
import { TooltipProvider } from "@/components/ui/tooltip";

interface Row {
  id: string;
}

function cellContext<T>(original: T): CellContext<T, unknown> {
  return { row: { original } } as unknown as CellContext<T, unknown>;
}

function renderCell(node: ReactNode) {
  return render(<TooltipProvider>{node}</TooltipProvider>);
}

function cellOf<T>(column: ReturnType<typeof checkboxColumn<T>>, original: T) {
  const cell = column.cell as (ctx: CellContext<T, unknown>) => ReactNode;
  return cell(cellContext(original));
}

describe("checkboxColumn", () => {
  it("reflects selection state and toggles on change", async () => {
    const onToggle = vi.fn();
    const column = checkboxColumn<Row>({ selected: new Set(["a"]), onToggle, rowId: (row) => row.id });
    renderCell(cellOf(column, { id: "a" }));
    const checkbox = screen.getByRole("checkbox", { name: "Select row" });
    expect(checkbox).toBeChecked();
    await userEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith("a");
  });

  it("renders nothing for non-selectable rows", () => {
    const column = checkboxColumn<Row>({ selected: new Set(), onToggle: vi.fn(), rowId: (row) => row.id, isSelectable: () => false });
    const { container } = renderCell(cellOf(column, { id: "a" }));
    expect(container.querySelector("input")).toBeNull();
  });
});

describe("actionsColumn", () => {
  it("renders an icon button per action and fires onClick", async () => {
    const onClick = vi.fn();
    const column = actionsColumn<Row>([{ icon: "edit", label: "Edit row", onClick }]);
    renderCell(cellOf(column, { id: "a" }));
    const button = screen.getByRole("button", { name: "Edit row" });
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledWith({ id: "a" });
  });

  it("hides actions flagged hidden", () => {
    const column = actionsColumn<Row>([{ icon: "delete", label: "Delete", onClick: vi.fn(), hidden: () => true }]);
    renderCell(cellOf(column, { id: "a" }));
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("shows a spinner while an action is loading", () => {
    const column = actionsColumn<Row>([{ icon: "clone", label: "Clone", onClick: vi.fn(), loading: () => true }]);
    renderCell(cellOf(column, { id: "a" }));
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

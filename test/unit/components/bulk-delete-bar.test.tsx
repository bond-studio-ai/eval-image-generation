// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BulkDeleteBar } from "@/components/bulk-delete-bar";

describe("BulkDeleteBar", () => {
  it("renders nothing when no rows are selected", () => {
    const { container } = render(<BulkDeleteBar selectedCount={0} onDelete={vi.fn()} onClearSelection={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the selected count and clear action", () => {
    render(<BulkDeleteBar selectedCount={3} onDelete={vi.fn()} onClearSelection={vi.fn()} />);
    expect(screen.getByText("3 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear selection" })).toBeInTheDocument();
  });

  it("calls onClearSelection when clearing", async () => {
    const onClearSelection = vi.fn();
    render(<BulkDeleteBar selectedCount={2} onDelete={vi.fn()} onClearSelection={onClearSelection} />);
    await userEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onClearSelection).toHaveBeenCalledOnce();
  });

  it("requires confirmation before deleting", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<BulkDeleteBar selectedCount={2} entityName="strategies" onDelete={onDelete} onClearSelection={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete Selected" }));
    expect(screen.getByText("Delete 2 strategies?")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("cancels the confirmation without deleting", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<BulkDeleteBar selectedCount={1} onDelete={onDelete} onClearSelection={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete Selected" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/Delete 1/)).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });
});

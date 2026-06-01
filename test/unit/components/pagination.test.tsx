// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "@/components/pagination";

describe("Pagination", () => {
  it("renders nothing when there is a single page", () => {
    const { container } = render(<Pagination page={1} totalPages={1} total={5} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("disables Previous on the first page and Next on the last", () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} total={30} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
    rerender(<Pagination page={3} totalPages={3} total={30} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("calls onPageChange when navigating", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={3} total={30} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("disables the current page button", () => {
    render(<Pagination page={2} totalPages={3} total={30} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "2" })).toBeDisabled();
  });

  it("opens a jump input from the ellipsis and submits a valid page on Enter", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={20} total={200} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByTitle("Jump to page"));
    const input = screen.getByRole("textbox", { name: "Jump to page" });
    await userEvent.type(input, "12{Enter}");
    expect(onPageChange).toHaveBeenCalledWith(12);
  });
});

// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";

const options: SegmentedOption<string>[] = [
  { value: "list", label: "List" },
  { value: "matrix", label: "Matrix" },
  { value: "off", label: "Off", disabled: true }
];

describe("SegmentedControl", () => {
  it("renders a radiogroup with the active option checked", () => {
    render(<SegmentedControl options={options} value="list" onChange={vi.fn()} label="View" />);
    expect(screen.getByRole("radiogroup", { name: "View" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "List" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Matrix" })).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange on click", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={options} value="list" onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "Matrix" }));
    expect(onChange).toHaveBeenCalledWith("matrix");
  });

  it("does not select a disabled option", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={options} value="list" onChange={onChange} />);
    const disabled = screen.getByRole("radio", { name: "Off" });
    expect(disabled).toBeDisabled();
    await userEvent.click(disabled);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("makes only the active option a tab stop", () => {
    render(<SegmentedControl options={options} value="matrix" onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Matrix" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "List" })).toHaveAttribute("tabindex", "-1");
  });

  it("moves selection with arrow keys, skipping disabled options and wrapping", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={options} value="list" onChange={onChange} />);
    const list = screen.getByRole("radio", { name: "List" });
    list.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("matrix");
    onChange.mockClear();
    // From Matrix, ArrowRight wraps past the disabled "Off" back to "List".
    screen.getByRole("radio", { name: "Matrix" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("list");
  });

  it("moves to previous with ArrowUp/ArrowLeft and wraps", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={options} value="matrix" onChange={onChange} />);
    screen.getByRole("radio", { name: "Matrix" }).focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith("list");
    onChange.mockClear();
    // From List, ArrowUp wraps backward past disabled "Off" to "Matrix".
    screen.getByRole("radio", { name: "List" }).focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(onChange).toHaveBeenLastCalledWith("matrix");
  });

  it("jumps to the first/last enabled option with Home/End", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={options} value="matrix" onChange={onChange} />);
    const matrix = screen.getByRole("radio", { name: "Matrix" });
    matrix.focus();
    await userEvent.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith("list");
    onChange.mockClear();
    matrix.focus();
    // End lands on the last *enabled* option (Matrix), skipping the disabled "Off".
    await userEvent.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith("matrix");
  });

  it("ignores unrelated keys", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={options} value="list" onChange={onChange} />);
    screen.getByRole("radio", { name: "List" }).focus();
    await userEvent.keyboard("{Enter}");
    // Enter falls through to the native button click which re-selects "list".
    expect(onChange).not.toHaveBeenCalledWith("matrix");
  });
});

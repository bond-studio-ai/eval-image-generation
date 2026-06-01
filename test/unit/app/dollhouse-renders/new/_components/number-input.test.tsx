// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NumberInput } from "@/app/dollhouse-renders/new/_components/number-input";

describe("NumberInput", () => {
  it("renders a labeled numeric input", () => {
    render(<NumberInput label="Width" value="1920" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Width")).toHaveValue("1920");
    expect(screen.getByLabelText("Width")).toHaveAttribute("inputmode", "numeric");
  });

  it("accepts digits and rejects non-numeric input for integer fields", async () => {
    const onChange = vi.fn();
    render(<NumberInput label="Count" value="" onChange={onChange} />);
    const input = screen.getByLabelText("Count");
    await userEvent.type(input, "4");
    expect(onChange).toHaveBeenLastCalledWith("4");
    onChange.mockClear();
    await userEvent.type(input, "a");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears to empty string when the field is emptied", async () => {
    const onChange = vi.fn();
    render(<NumberInput label="Count" value="5" onChange={onChange} />);
    await userEvent.clear(screen.getByLabelText("Count"));
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("allows a decimal point when allowDecimal is set", async () => {
    const onChange = vi.fn();
    render(<NumberInput label="Height" value="1" onChange={onChange} allowDecimal />);
    const input = screen.getByLabelText("Height");
    expect(input).toHaveAttribute("inputmode", "decimal");
    await userEvent.type(input, ".");
    expect(onChange).toHaveBeenLastCalledWith("1.");
  });
});

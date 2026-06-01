// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterBar, FilterSearch } from "@/components/ui/filter-bar";

describe("FilterBar", () => {
  it("renders start, children, and end slots", () => {
    render(
      <FilterBar start={<span>start-slot</span>} end={<span>end-slot</span>}>
        <span>mid-slot</span>
      </FilterBar>
    );
    expect(screen.getByText("start-slot")).toBeInTheDocument();
    expect(screen.getByText("mid-slot")).toBeInTheDocument();
    expect(screen.getByText("end-slot")).toBeInTheDocument();
  });

  it("omits optional slots when not provided", () => {
    render(<FilterBar>only-children</FilterBar>);
    expect(screen.getByText("only-children")).toBeInTheDocument();
  });
});

describe("FilterSearch", () => {
  it("renders the value and calls onChange with the raw string", async () => {
    const onChange = vi.fn();
    render(<FilterSearch value="" onChange={onChange} placeholder="Find" />);
    const input = screen.getByPlaceholderText("Find");
    await userEvent.type(input, "ab");
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith("b");
  });

  it("reflects the controlled value", () => {
    render(<FilterSearch value="hello" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("hello")).toBeInTheDocument();
  });
});

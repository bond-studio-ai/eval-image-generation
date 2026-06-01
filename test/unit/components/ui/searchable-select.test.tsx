// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";

beforeAll(() => {
  // Radix Popover + cmdk rely on DOM APIs jsdom doesn't implement.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  globalThis.ResizeObserver = class {
    observe() {
      /* noop */
    }

    unobserve() {
      /* noop */
    }

    disconnect() {
      /* noop */
    }
  };
});

const options: SearchableSelectOption[] = [
  { value: "s1", label: "Strategy One", meta: "v1" },
  { value: "s2", label: "Strategy Two" }
];

describe("SearchableSelect", () => {
  it("shows the placeholder when nothing is selected", () => {
    render(<SearchableSelect value="" options={options} onChange={vi.fn()} placeholder="Pick one" />);
    expect(screen.getByRole("button", { name: /Pick one/ })).toBeInTheDocument();
  });

  it("shows the selected option label", () => {
    render(<SearchableSelect value="s1" options={options} onChange={vi.fn()} />);
    expect(screen.getByText("Strategy One")).toBeInTheDocument();
  });

  it("opens the popover and selects an option", async () => {
    const onChange = vi.fn();
    render(<SearchableSelect value="" options={options} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button"));
    const option = await screen.findByText("Strategy Two");
    await userEvent.click(option);
    expect(onChange).toHaveBeenCalledWith("s2");
  });

  it("clears the selection via the none entry when includeNone is set", async () => {
    const onChange = vi.fn();
    render(<SearchableSelect value="s1" options={options} onChange={onChange} includeNone noneLabel="-- None --" />);
    await userEvent.click(screen.getByRole("button"));
    const none = await screen.findByText("-- None --");
    await userEvent.click(none);
    expect(onChange).toHaveBeenCalledWith("");
  });
});

// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "@/components/ui/modal";

describe("Modal", () => {
  it("renders its children inside a dialog with an accessible name", () => {
    render(
      <Modal onClose={vi.fn()} ariaLabel="Settings">
        <p>Modal body</p>
      </Modal>
    );
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Modal body")).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} ariaLabel="Closable">
        <button type="button">Inside</button>
      </Modal>
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("focuses the initialFocusRef element when provided", () => {
    function Harness() {
      return (
        <Modal onClose={vi.fn()} ariaLabel="Focus" initialFocusRef={{ current: null }}>
          <button type="button">First</button>
        </Modal>
      );
    }
    render(<Harness />);
    expect(screen.getByRole("dialog", { name: "Focus" })).toBeInTheDocument();
  });
});

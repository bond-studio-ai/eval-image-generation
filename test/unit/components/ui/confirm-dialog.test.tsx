// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { ConfirmProvider, useConfirm } from "@/components/ui/confirm-dialog";

function Harness({ onResult }: { onResult: (value: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <Button
      onClick={async () => {
        const ok = await confirm({ title: "Delete item?", description: "This cannot be undone.", tone: "danger", confirmLabel: "Delete", cancelLabel: "Keep" });
        onResult(ok);
      }}
    >
      Open
    </Button>
  );
}

describe("ConfirmProvider / useConfirm", () => {
  it("resolves true when the confirm button is clicked", async () => {
    const results: boolean[] = [];
    render(
      <ConfirmProvider>
        <Harness onResult={(v) => results.push(v)} />
      </ConfirmProvider>
    );
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByText("Delete item?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(results).toEqual([true]);
  });

  it("resolves false when the cancel button is clicked", async () => {
    const results: boolean[] = [];
    render(
      <ConfirmProvider>
        <Harness onResult={(v) => results.push(v)} />
      </ConfirmProvider>
    );
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(results).toEqual([false]);
  });

  it("throws when used outside a provider", () => {
    expect(() => render(<Bare />)).toThrow(/must be used inside <ConfirmProvider>/);
  });
});

function Bare() {
  useConfirm();
  return null;
}

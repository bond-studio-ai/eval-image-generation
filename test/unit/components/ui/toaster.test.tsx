// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const sonnerToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  message: vi.fn(),
  promise: vi.fn()
};

vi.mock("sonner", () => ({
  toast: sonnerToast,
  Toaster: () => <div data-testid="sonner-toaster" />
}));

const { ToasterProvider, toast } = await import("@/components/ui/toaster");

describe("ToasterProvider", () => {
  it("renders children alongside the sonner toaster", () => {
    render(
      <ToasterProvider>
        <p>app content</p>
      </ToasterProvider>
    );
    expect(screen.getByText("app content")).toBeInTheDocument();
    expect(screen.getByTestId("sonner-toaster")).toBeInTheDocument();
  });
});

describe("toast facade", () => {
  it("forwards each level to the sonner toast API", () => {
    toast.success("ok", { description: "done" });
    toast.error("bad");
    toast.warning("warn");
    toast.info("fyi");
    toast.message("hi");
    expect(sonnerToast.success).toHaveBeenCalledWith("ok", { description: "done" });
    expect(sonnerToast.error).toHaveBeenCalledWith("bad", undefined);
    expect(sonnerToast.warning).toHaveBeenCalledWith("warn", undefined);
    expect(sonnerToast.info).toHaveBeenCalledWith("fyi", undefined);
    expect(sonnerToast.message).toHaveBeenCalledWith("hi", undefined);
  });
});

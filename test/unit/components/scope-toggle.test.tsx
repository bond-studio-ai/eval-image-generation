// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScopeToggle } from "@/components/scope-toggle";

const { push, searchState } = vi.hoisted(() => ({ push: vi.fn(), searchState: { value: "" } }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/analytics",
  useSearchParams: () => new URLSearchParams(searchState.value)
}));

afterEach(() => {
  searchState.value = "";
  vi.clearAllMocks();
});

describe("ScopeToggle", () => {
  it("renders the two scope options with custom labels", () => {
    render(<ScopeToggle defaultLabel="Standard" benchmarkLabel="Benchmark" />);
    expect(screen.getByRole("radio", { name: "Standard" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Benchmark" })).toBeInTheDocument();
  });

  it("pushes the benchmark source param when switching to benchmark", async () => {
    render(<ScopeToggle />);
    await userEvent.click(screen.getByRole("radio", { name: "Benchmark" }));
    expect(push).toHaveBeenCalledWith("/analytics?source=benchmark");
  });

  it("clears the source param when switching back to default", async () => {
    searchState.value = "source=benchmark";
    render(<ScopeToggle />);
    await userEvent.click(screen.getByRole("radio", { name: "Standard" }));
    expect(push).toHaveBeenCalledWith("/analytics");
  });
});

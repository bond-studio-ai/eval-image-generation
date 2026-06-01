// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tooltip } from "@/components/review-results/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("review-results Tooltip", () => {
  it("wraps children in a focusable help trigger", () => {
    render(
      <TooltipProvider>
        <Tooltip hint="Helpful hint">
          <span>Metric</span>
        </Tooltip>
      </TooltipProvider>
    );
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveClass("cursor-help");
    expect(screen.getByText("Metric")).toBeInTheDocument();
  });

  it("applies a custom trigger class", () => {
    render(
      <TooltipProvider>
        <Tooltip hint="x" triggerClassName="custom-trigger">
          <span>Label</span>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByRole("button")).toHaveClass("custom-trigger");
  });
});

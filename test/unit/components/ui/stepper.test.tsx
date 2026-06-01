// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Stepper, type StepperStep } from "@/components/ui/stepper";

const steps: StepperStep[] = [
  { id: "a", label: "Details", state: "complete" },
  { id: "b", label: "Design", state: "current", description: "Pick materials" },
  { id: "c", label: "Review", state: "pending" },
  { id: "d", label: "Broken", state: "error" }
];

describe("Stepper", () => {
  it("renders every step label and number", () => {
    render(<Stepper steps={steps} label="Wizard" />);
    expect(screen.getByRole("navigation", { name: "Wizard" })).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Pick materials")).toBeInTheDocument();
    expect(screen.getByText("Step 4")).toBeInTheDocument();
  });

  it("marks the current step with aria-current", () => {
    render(<Stepper steps={steps} onStepClick={vi.fn()} />);
    const current = screen.getByRole("button", { name: /Design/ });
    expect(current).toHaveAttribute("aria-current", "step");
  });

  it("renders clickable buttons and fires onStepClick", async () => {
    const onStepClick = vi.fn();
    render(<Stepper steps={steps} onStepClick={onStepClick} />);
    await userEvent.click(screen.getByRole("button", { name: /Details/ }));
    expect(onStepClick).toHaveBeenCalledWith("a");
  });

  it("renders non-interactive steps when no handler is given", () => {
    render(<Stepper steps={steps} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("defaults the nav label to Progress", () => {
    render(<Stepper steps={steps} />);
    expect(screen.getByRole("navigation", { name: "Progress" })).toBeInTheDocument();
  });
});

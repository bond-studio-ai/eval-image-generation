// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorCard, ResourceFormHeader } from "@/components/resource-form-header";

describe("ResourceFormHeader", () => {
  it("renders name and description controls with current values", () => {
    render(<ResourceFormHeader name="My strategy" onNameChange={vi.fn()} description="Desc" onDescriptionChange={vi.fn()} />);
    expect(screen.getByLabelText(/Name/)).toHaveValue("My strategy");
    expect(screen.getByLabelText("Description")).toHaveValue("Desc");
  });

  it("calls onNameChange as the user types", async () => {
    const onNameChange = vi.fn();
    render(<ResourceFormHeader name="" onNameChange={onNameChange} description="" onDescriptionChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/Name/), "A");
    expect(onNameChange).toHaveBeenCalledWith("A");
  });

  it("shows the required asterisk by default and hides it when nameRequired is false", () => {
    const { rerender } = render(<ResourceFormHeader name="" onNameChange={vi.fn()} description="" onDescriptionChange={vi.fn()} />);
    expect(screen.getByText("*")).toBeInTheDocument();
    rerender(<ResourceFormHeader name="" nameRequired={false} onNameChange={vi.fn()} description="" onDescriptionChange={vi.fn()} />);
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });
});

describe("ErrorCard", () => {
  it("renders the message", () => {
    render(<ErrorCard message="Name is required" />);
    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });
});

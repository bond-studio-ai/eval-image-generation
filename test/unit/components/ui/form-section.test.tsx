// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormSection } from "@/components/ui/form-section";

describe("FormSection", () => {
  it("renders the title as a heading and the body children", () => {
    render(
      <FormSection title="Steps">
        <p>body content</p>
      </FormSection>
    );
    expect(screen.getByRole("heading", { name: "Steps" })).toBeInTheDocument();
    expect(screen.getByText("body content")).toBeInTheDocument();
  });

  it("renders description and actions slots", () => {
    render(
      <FormSection title="Steps" description="Configure your steps" actions={<button type="button">Add</button>}>
        <p>x</p>
      </FormSection>
    );
    expect(screen.getByText("Configure your steps")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});

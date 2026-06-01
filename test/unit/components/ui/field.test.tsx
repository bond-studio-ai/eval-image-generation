// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox, Field, TextInput } from "@/components/ui/field";

describe("Field", () => {
  it("wires the label to a generated control id via render prop", () => {
    render(<Field label="Email">{(id) => <input id={id} />}</Field>);
    const input = screen.getByLabelText("Email");
    expect(input).toBeInTheDocument();
  });

  it("uses a provided controlId", () => {
    render(
      <Field label="Name" controlId="my-id">
        <input id="my-id" />
      </Field>
    );
    expect(screen.getByLabelText("Name")).toHaveAttribute("id", "my-id");
  });

  it("shows the required asterisk and optional badge", () => {
    const { rerender } = render(
      <Field label="Title" required>
        <input />
      </Field>
    );
    expect(screen.getByText("*")).toBeInTheDocument();
    rerender(
      <Field label="Title" optional>
        <input />
      </Field>
    );
    expect(screen.getByText("(optional)")).toBeInTheDocument();
  });

  it("renders an error message in place of the hint", () => {
    render(
      <Field label="Title" hint="A hint" error="Something broke">
        <input />
      </Field>
    );
    expect(screen.getByText("Something broke")).toBeInTheDocument();
    expect(screen.queryByText("A hint")).not.toBeInTheDocument();
  });
});

describe("TextInput", () => {
  it("defaults to a text input and merges className", () => {
    render(<TextInput className="mt-4" data-testid="ti" />);
    const input = screen.getByTestId("ti");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveClass("mt-4");
  });
});

describe("Checkbox", () => {
  it("renders a bare checkbox without a label", () => {
    render(<Checkbox aria-label="agree" />);
    expect(screen.getByRole("checkbox", { name: "agree" })).toBeInTheDocument();
  });

  it("renders an inline label when provided", () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByLabelText("Accept terms")).toBeInTheDocument();
  });
});

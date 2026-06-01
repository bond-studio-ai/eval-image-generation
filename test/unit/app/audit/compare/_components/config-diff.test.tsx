// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfigDiff } from "@/app/audit/compare/_components/config-diff";

describe("ConfigDiff", () => {
  it("shows a placeholder when there is no config data", () => {
    render(<ConfigDiff left={null} right={null} />);
    expect(screen.getByText("No config data")).toBeInTheDocument();
  });

  it("labels known keys and renders unchanged values plainly", () => {
    render(<ConfigDiff left={{ model: "gemini" }} right={{ model: "gemini" }} />);
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByText("gemini")).toBeInTheDocument();
  });

  it("renders a before/after diff for changed values", () => {
    render(<ConfigDiff left={{ temperature: "1" }} right={{ temperature: "2" }} />);
    expect(screen.getByText("Temperature")).toBeInTheDocument();
    expect(screen.getByText("1")).toHaveClass("line-through");
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("falls back to the raw key for unknown config fields", () => {
    render(<ConfigDiff left={{ customKey: "a" }} right={{ customKey: "a" }} />);
    expect(screen.getByText("customKey")).toBeInTheDocument();
  });
});

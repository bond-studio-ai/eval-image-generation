// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DateCell, DateTimeCell } from "@/components/date-cells";

describe("DateCell", () => {
  it("renders an em-dash for nullish dates", () => {
    const { rerender } = render(<DateCell date={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    rerender(<DateCell date={undefined} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders the localized date", () => {
    const date = "2026-01-15T12:00:00Z";
    render(<DateCell date={date} />);
    expect(screen.getByText(new Date(date).toLocaleDateString())).toBeInTheDocument();
  });
});

describe("DateTimeCell", () => {
  it("renders an em-dash for nullish dates", () => {
    render(<DateTimeCell date={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders the localized date and time", () => {
    const date = "2026-01-15T12:00:00Z";
    render(<DateTimeCell date={date} />);
    expect(screen.getByText(new Date(date).toLocaleString())).toBeInTheDocument();
  });
});

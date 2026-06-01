// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RunHeader } from "@/app/audit/compare/_components/run-header";
import { SectionHeader } from "@/app/audit/compare/_components/section-header";
import type { RunData } from "@/app/audit/compare/_components/types";

function run(overrides: Partial<RunData> = {}): RunData {
  return {
    id: "run-1",
    status: "completed",
    createdAt: "2026-01-01T00:00:00Z",
    source: "preset",
    judgeScore: 88,
    isJudgeSelected: false,
    judgeReasoning: null,
    judgeOutput: null,
    judgeSystemPrompt: null,
    judgeUserPrompt: null,
    judgeInputImages: null,
    judgeResults: [],
    strategy: { id: "s1", name: "Strategy One" },
    stepResults: [],
    ...overrides
  };
}

describe("RunHeader", () => {
  it("shows the label, strategy name, status, source, and judge score", () => {
    render(<RunHeader run={run()} label="Left" />);
    expect(screen.getByText("Left")).toBeInTheDocument();
    expect(screen.getByText("Strategy One")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("Preset Run")).toBeInTheDocument();
    expect(screen.getByText("Judge: 88")).toBeInTheDocument();
    expect(screen.getByText("run-1")).toBeInTheDocument();
  });

  it("omits the source and judge pills when absent", () => {
    render(<RunHeader run={run({ source: null, judgeScore: null })} label="Right" />);
    expect(screen.queryByText(/Judge:/)).not.toBeInTheDocument();
    expect(screen.queryByText("Preset Run")).not.toBeInTheDocument();
  });

  it("falls back to the raw source string for unknown sources", () => {
    render(<RunHeader run={run({ source: "weird" })} label="Left" />);
    expect(screen.getByText("weird")).toBeInTheDocument();
  });
});

describe("SectionHeader", () => {
  it("renders the title as a heading", () => {
    render(<SectionHeader title="Prompts" />);
    expect(screen.getByRole("heading", { name: "Prompts" })).toBeInTheDocument();
  });
});

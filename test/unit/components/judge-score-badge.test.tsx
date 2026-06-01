// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { JudgeScoreBadge } from "@/components/judge-score-badge";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>
}));

describe("JudgeScoreBadge", () => {
  it("renders the numeric score for a positive judge score", () => {
    render(<JudgeScoreBadge judgeScore={85} />);
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("renders a failed badge for a zero score", () => {
    render(<JudgeScoreBadge judgeScore={0} />);
    expect(screen.getByText("Judge failed")).toBeInTheDocument();
  });

  it("renders a judging spinner badge when awaiting the judge", () => {
    render(<JudgeScoreBadge judgeScore={null} awaitingJudge />);
    expect(screen.getByText("Judging")).toBeInTheDocument();
  });

  it("renders nothing when there is no score and not awaiting", () => {
    const { container } = render(<JudgeScoreBadge judgeScore={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("marks the selected winner badge with the highlight palette", () => {
    render(<JudgeScoreBadge judgeScore={92} isJudgeSelected />);
    expect(screen.getByText("92")).toHaveClass("bg-warning-400");
  });
});

"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { serviceUrl } from "@/lib/api-base";
import { parseStrategyRunJudgeResults } from "@/lib/strategy-run-judge-results";
import { JudgeComparison } from "./_components/judge-comparison";
import { RunHeader } from "./_components/run-header";
import { StepComparison } from "./_components/step-comparison";
import type { RunData } from "./_components/types";

export function CompareView({ leftId, rightId }: { leftId: string; rightId: string }) {
  const {
    data,
    isLoading: loading,
    isError,
    error: queryError
  } = useQuery({
    queryKey: ["audit-compare", leftId, rightId],
    queryFn: async ({ signal }) => {
      const res = await fetch(serviceUrl(`strategy-runs/compare?left=${leftId}&right=${rightId}`), {
        cache: "no-store",
        signal
      });
      if (!res.ok) {
        throw new Error(`Failed to load: ${res.status}`);
      }
      const json = await res.json();
      const rawL = json.data.left as Record<string, unknown>;
      const rawR = json.data.right as Record<string, unknown>;
      return {
        left: {
          ...(json.data.left as RunData),
          judgeResults: parseStrategyRunJudgeResults(rawL.judgeResults)
        },
        right: {
          ...(json.data.right as RunData),
          judgeResults: parseStrategyRunJudgeResults(rawR.judgeResults)
        }
      };
    },
    enabled: Boolean(leftId) && Boolean(rightId)
  });

  const left = data?.left ?? null;
  const right = data?.right ?? null;
  const error = isError ? (queryError instanceof Error ? queryError.message : "Unknown error") : null;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" className="text-gray-400" />
      </div>
    );
  }

  if (error || !left || !right) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-red-600">
        <p className="font-medium">Error loading runs</p>
        <p className="mt-1 text-sm">{error ?? "One or both runs not found"}</p>
      </div>
    );
  }

  const leftSteps = left.stepResults.toSorted((a, b) => (a.step?.stepOrder ?? 0) - (b.step?.stepOrder ?? 0));
  const rightSteps = right.stepResults.toSorted((a, b) => (a.step?.stepOrder ?? 0) - (b.step?.stepOrder ?? 0));
  const maxSteps = Math.max(leftSteps.length, rightSteps.length);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Compare Runs</h1>
        <div className="flex gap-2">
          <Link href={`/strategies/${left.strategy.id}/runs/${left.id}`} className="text-primary-600 hover:text-primary-500 text-xs">
            View left run &rarr;
          </Link>
          <Link href={`/strategies/${right.strategy.id}/runs/${right.id}`} className="text-primary-600 hover:text-primary-500 text-xs">
            View right run &rarr;
          </Link>
        </div>
      </div>

      {/* Run headers */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <RunHeader run={left} label="Left" />
        <RunHeader run={right} label="Right" />
      </div>

      {/* Step-by-step comparison */}
      <div className="mt-8 space-y-8">
        {Array.from({ length: maxSteps }, (_, i) => {
          const ls = leftSteps[i] ?? null;
          const rs = rightSteps[i] ?? null;
          const stepName = ls?.step?.name ?? rs?.step?.name ?? `Step ${i + 1}`;

          return <StepComparison key={i} ls={ls} rs={rs} stepName={stepName} />;
        })}
      </div>

      {/* Judge comparison */}
      <JudgeComparison left={left} right={right} />
    </div>
  );
}

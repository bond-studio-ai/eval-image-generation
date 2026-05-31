"use client";

import { CheckIcon, MessageSquareIcon, PlayIcon, StarIcon, XIcon } from "@/components/ui/icons";

export interface DagStep {
  stepOrder: number;
  label: string;
  model?: string;
  aspectRatio?: string;
  outputResolution?: string;
  promptName?: string | null;
  temperature?: string | number | null;
  status?: "pending" | "running" | "completed" | "failed" | "skipped";
  error?: string | null;
  dollhouseViewFromStep: number | null;
  realPhotoFromStep: number | null;
  moodBoardFromStep: number | null;
  arbitraryImageFromStep?: number | null;
}

interface Edge {
  from: number;
  to: number;
  label: string;
}

interface NodePosition {
  x: number;
  y: number;
}

const NODE_WIDTH = 240;
const NODE_HEIGHT = 120;
const LEVEL_GAP_X = 100;
const NODE_GAP_Y = 32;
const PADDING = 32;
const JUDGE_HEADER_HEIGHT = 40;
const JUDGE_ROW_HEIGHT = 72;

function getDeps(step: DagStep): number[] {
  const deps: number[] = [];
  if (step.dollhouseViewFromStep != null) deps.push(step.dollhouseViewFromStep);
  if (step.realPhotoFromStep != null) deps.push(step.realPhotoFromStep);
  if (step.moodBoardFromStep != null) deps.push(step.moodBoardFromStep);
  if (step.arbitraryImageFromStep != null) deps.push(step.arbitraryImageFromStep);
  return [...new Set(deps)];
}

function getEdges(step: DagStep): Edge[] {
  const edges: Edge[] = [];
  if (step.dollhouseViewFromStep != null) {
    edges.push({ from: step.dollhouseViewFromStep, to: step.stepOrder, label: "Dollhouse" });
  }
  if (step.realPhotoFromStep != null) {
    edges.push({ from: step.realPhotoFromStep, to: step.stepOrder, label: "Real Photo" });
  }
  if (step.moodBoardFromStep != null) {
    edges.push({ from: step.moodBoardFromStep, to: step.stepOrder, label: "Mood Board" });
  }
  if (step.arbitraryImageFromStep != null) {
    edges.push({ from: step.arbitraryImageFromStep, to: step.stepOrder, label: "Image" });
  }
  return edges;
}

function computeLevels(steps: DagStep[]): Map<number, number> {
  const levels = new Map<number, number>();
  const depsMap = new Map<number, number[]>();
  for (const step of steps) {
    depsMap.set(step.stepOrder, getDeps(step));
  }

  function getLevel(order: number): number {
    if (levels.has(order)) return levels.get(order)!;
    const deps = depsMap.get(order) ?? [];
    const level = deps.length === 0 ? 0 : Math.max(...deps.map(getLevel)) + 1;
    levels.set(order, level);
    return level;
  }

  for (const step of steps) {
    getLevel(step.stepOrder);
  }
  return levels;
}

function computeLayout(steps: DagStep[]): {
  positions: Map<number, NodePosition>;
  width: number;
  height: number;
} {
  const levels = computeLevels(steps);
  const levelGroups = new Map<number, DagStep[]>();

  for (const step of steps) {
    const level = levels.get(step.stepOrder)!;
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(step);
  }

  for (const group of levelGroups.values()) {
    group.sort((a, b) => a.stepOrder - b.stepOrder);
  }

  const maxLevel = Math.max(...levels.values(), 0);
  const positions = new Map<number, NodePosition>();

  let maxHeight = 0;
  for (let level = 0; level <= maxLevel; level++) {
    const group = levelGroups.get(level) ?? [];
    const totalHeight = group.length * NODE_HEIGHT + (group.length - 1) * NODE_GAP_Y;
    maxHeight = Math.max(maxHeight, totalHeight);
  }

  for (let level = 0; level <= maxLevel; level++) {
    const group = levelGroups.get(level) ?? [];
    const totalHeight = group.length * NODE_HEIGHT + (group.length - 1) * NODE_GAP_Y;
    const startY = (maxHeight - totalHeight) / 2;

    for (let i = 0; i < group.length; i++) {
      const step = group[i];
      if (!step) continue;
      positions.set(step.stepOrder, {
        x: PADDING + level * (NODE_WIDTH + LEVEL_GAP_X),
        y: PADDING + startY + i * (NODE_HEIGHT + NODE_GAP_Y)
      });
    }
  }

  const width = PADDING * 2 + (maxLevel + 1) * NODE_WIDTH + maxLevel * LEVEL_GAP_X;
  const height = PADDING * 2 + maxHeight;

  return { positions, width, height };
}

const STATUS_BORDER: Record<string, string> = {
  pending: "border-border",
  running: "border-primary-400",
  completed: "border-success-400",
  failed: "border-danger-400",
  skipped: "border-warning-400",
  default: "border-border"
};

const STATUS_BG: Record<string, string> = {
  pending: "bg-surface-muted",
  running: "bg-primary-50",
  completed: "bg-success-50",
  failed: "bg-danger-50",
  skipped: "bg-warning-50",
  default: "bg-surface"
};

const STATUS_HEADER_BG: Record<string, string> = {
  pending: "bg-surface-sunken",
  running: "bg-primary-100",
  completed: "bg-success-100",
  failed: "bg-danger-100",
  skipped: "bg-warning-100",
  default: "bg-surface-sunken"
};

const STATUS_HEADER_TEXT: Record<string, string> = {
  pending: "text-text-secondary",
  running: "text-primary-700",
  completed: "text-success-700",
  failed: "text-danger-700",
  skipped: "text-warning-700",
  default: "text-text-primary"
};

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
}

const MODEL_LABELS: Record<string, string> = {
  "gemini-3-pro-image-preview": "Pro",
  "gemini-3.1-flash-image-preview": "Nano Banana 2",
  "seedream-4.5": "Seedream 4.5",
  "seedream-5": "Seedream 5",
  "gpt-image-1": "GPT Image 1",
  "gpt-image-1-mini": "GPT Image 1 Mini",
  "gpt-image-1.5": "GPT Image 1.5",
  "gpt-image-2": "GPT Image 2"
};

export interface DagJudge {
  type: "batch" | "individual";
  model: string;
  name?: string | null;
  promptName?: string | null;
  toleranceThreshold?: number | null;
  position?: number | null;
}

export function StrategyFlowDag({ steps, judge, judges }: { steps: DagStep[]; judge?: DagJudge | null; judges?: DagJudge[] }) {
  if (steps.length === 0) return null;

  const effectiveJudges = judges && judges.length > 0 ? judges : judge ? [judge] : [];
  const hasJudge = effectiveJudges.length > 0;
  const judgeNodeHeight = Math.max(NODE_HEIGHT, JUDGE_HEADER_HEIGHT + effectiveJudges.length * JUDGE_ROW_HEIGHT + 16);
  const { positions, width: baseWidth, height: baseHeight } = computeLayout(steps);
  const height = Math.max(baseHeight, judgeNodeHeight + PADDING * 2);

  const allEdges: Edge[] = [];
  for (const step of steps) {
    allEdges.push(...getEdges(step));
  }

  const JUDGE_NODE_ORDER = -999;
  let judgePos: NodePosition | null = null;
  const judgeEdges: { fromPos: NodePosition }[] = [];

  if (hasJudge) {
    const maxLevel = Math.max(...computeLevels(steps).values(), 0);
    const lastLevelSteps = steps.filter((s) => computeLevels(steps).get(s.stepOrder) === maxLevel);

    const judgeX = PADDING + (maxLevel + 1) * (NODE_WIDTH + LEVEL_GAP_X);
    const judgeY = PADDING + (height - 2 * PADDING - judgeNodeHeight) / 2;
    judgePos = { x: judgeX, y: judgeY };
    positions.set(JUDGE_NODE_ORDER, judgePos);

    for (const step of lastLevelSteps) {
      const fromPos = positions.get(step.stepOrder);
      if (fromPos) judgeEdges.push({ fromPos });
    }
  }

  const totalWidth = hasJudge ? baseWidth + NODE_WIDTH + LEVEL_GAP_X : baseWidth;

  return (
    <div className="border-border bg-surface-muted/50 overflow-x-auto rounded-lg border">
      <svg width={totalWidth} height={height} className="block">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="0 0, 10 3.5, 0 7" className="fill-text-disabled" />
          </marker>
        </defs>

        {allEdges.map((edge, i) => {
          const fromPos = positions.get(edge.from);
          const toPos = positions.get(edge.to);
          if (!fromPos || !toPos) return null;

          const x1 = fromPos.x + NODE_WIDTH;
          const y1 = fromPos.y + NODE_HEIGHT / 2;
          const x2 = toPos.x;
          const y2 = toPos.y + NODE_HEIGHT / 2;
          const midX = (x1 + x2) / 2;
          const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
          const labelX = midX;
          const labelY = (y1 + y2) / 2 - 10;

          return (
            <g key={i}>
              <path d={path} fill="none" className="stroke-border-strong" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <rect x={labelX - 34} y={labelY - 9} width={68} height={18} rx={4} className="fill-surface stroke-border" strokeWidth="0.5" />
              <text x={labelX} y={labelY + 4} textAnchor="middle" className="fill-text-muted text-[10px] font-medium">
                {edge.label}
              </text>
            </g>
          );
        })}

        {steps.map((step, idx) => {
          const pos = positions.get(step.stepOrder);
          if (!pos) return null;

          const s = step.status ?? "default";
          const border = STATUS_BORDER[s] ?? STATUS_BORDER["default"];
          const bg = STATUS_BG[s] ?? STATUS_BG["default"];
          const headerBg = STATUS_HEADER_BG[s] ?? STATUS_HEADER_BG["default"];
          const headerText = STATUS_HEADER_TEXT[s] ?? STATUS_HEADER_TEXT["default"];
          const modelLabel = step.model ? (MODEL_LABELS[step.model] ?? step.model) : "";

          return (
            <foreignObject key={`${step.stepOrder}-${idx}`} x={pos.x} y={pos.y} width={NODE_WIDTH} height={NODE_HEIGHT}>
              <div className={`flex h-full flex-col overflow-hidden rounded-lg border-2 ${border} ${bg} shadow-sm`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-3 py-2 ${headerBg}`}>
                  <span className={`text-caption font-semibold ${headerText}`}>{truncate(step.label, 26)}</span>
                  {step.status === "running" && <span className="bg-primary-500 size-2.5 animate-pulse rounded-full" />}
                  {step.status === "completed" && <CheckIcon className="text-success-600 size-4" />}
                  {step.status === "failed" && <XIcon className="text-danger-600 size-4" />}
                  {step.status === "skipped" && <PlayIcon className="text-warning-600 size-4" />}
                </div>
                {/* Body */}
                <div className="flex flex-1 flex-col gap-1 px-3 py-2">
                  {step.status === "skipped" && step.error && (
                    <div className="text-warning-700 text-[10px]" title={step.error}>
                      {truncate(step.error, 36)}
                    </div>
                  )}
                  {step.promptName && (
                    <div className="text-text-secondary flex items-center gap-1.5 text-[11px]">
                      <MessageSquareIcon className="text-text-disabled size-3 shrink-0" />
                      <span className="truncate">{truncate(step.promptName, 28)}</span>
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-1.5">
                    {modelLabel && <span className="text-text-secondary bg-border/80 rounded px-1.5 py-0.5 text-[10px] font-medium">{modelLabel}</span>}
                    {step.aspectRatio && <span className="text-text-muted bg-border/80 rounded px-1.5 py-0.5 text-[10px]">{step.aspectRatio}</span>}
                    {step.outputResolution && <span className="text-text-muted bg-border/80 rounded px-1.5 py-0.5 text-[10px]">{step.outputResolution}</span>}
                    {step.temperature != null && <span className="text-text-muted bg-border/80 rounded px-1.5 py-0.5 text-[10px]">t={String(step.temperature)}</span>}
                  </div>
                </div>
              </div>
            </foreignObject>
          );
        })}

        {judgePos && hasJudge && (
          <>
            {judgeEdges.map((edge, i) => {
              const x1 = edge.fromPos.x + NODE_WIDTH;
              const y1 = edge.fromPos.y + NODE_HEIGHT / 2;
              const x2 = judgePos!.x;
              const y2 = judgePos!.y + judgeNodeHeight / 2;
              const midX = (x1 + x2) / 2;
              const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
              return <path key={`judge-edge-${i}`} d={path} fill="none" className="stroke-warning-300" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#arrowhead)" />;
            })}
            <foreignObject x={judgePos.x} y={judgePos.y} width={NODE_WIDTH} height={judgeNodeHeight}>
              <div className="border-warning-400 bg-warning-50 flex h-full flex-col overflow-hidden rounded-lg border-2 shadow-sm">
                <div className="bg-warning-100 flex items-center justify-between px-3 py-2">
                  <span className="text-warning-800 text-caption font-semibold">{effectiveJudges.length === 1 ? "Judge" : `Judges (${effectiveJudges.length})`}</span>
                  <StarIcon className="text-warning-600 size-4" fill="currentColor" />
                </div>
                <div className="flex flex-1 flex-col gap-1 px-3 py-2">
                  {effectiveJudges.map((j, ji) => (
                    <div key={`${j.model}-${j.name ?? ""}-${j.position ?? ""}`} className="bg-warning-100/70 rounded px-2 py-1.5">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="bg-warning-200/80 text-warning-700 rounded px-1 py-0.5 font-medium">{j.position ?? ji + 1}</span>
                        {j.name && (
                          <span className="text-warning-900 truncate font-semibold" title={j.name}>
                            {truncate(j.name, 16)}
                          </span>
                        )}
                        <span className="bg-surface/70 text-warning-700 rounded px-1 py-0.5">{j.type === "batch" ? "Batch" : "Individual"}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                        <span className="bg-warning-200/80 text-warning-700 rounded px-1 py-0.5 font-medium" title={j.model}>
                          {MODEL_LABELS[j.model] ?? truncate(j.model, 16)}
                        </span>
                        {j.toleranceThreshold != null && <span className="text-warning-700">tol {j.toleranceThreshold}</span>}
                      </div>
                      {j.promptName && (
                        <div className="text-warning-800 mt-1 text-[10px]" title={j.promptName}>
                          {truncate(j.promptName, 28)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </foreignObject>
          </>
        )}
      </svg>
    </div>
  );
}

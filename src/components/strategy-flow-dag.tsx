'use client';

import { CheckIcon, MessageSquareIcon, PlayIcon, StarIcon, XIcon } from '@/components/ui/icons';

export interface DagStep {
  stepOrder: number;
  label: string;
  model?: string;
  aspectRatio?: string;
  outputResolution?: string;
  promptName?: string | null;
  temperature?: string | number | null;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
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
    edges.push({ from: step.dollhouseViewFromStep, to: step.stepOrder, label: 'Dollhouse' });
  }
  if (step.realPhotoFromStep != null) {
    edges.push({ from: step.realPhotoFromStep, to: step.stepOrder, label: 'Real Photo' });
  }
  if (step.moodBoardFromStep != null) {
    edges.push({ from: step.moodBoardFromStep, to: step.stepOrder, label: 'Mood Board' });
  }
  if (step.arbitraryImageFromStep != null) {
    edges.push({ from: step.arbitraryImageFromStep, to: step.stepOrder, label: 'Image' });
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
      positions.set(step.stepOrder, {
        x: PADDING + level * (NODE_WIDTH + LEVEL_GAP_X),
        y: PADDING + startY + i * (NODE_HEIGHT + NODE_GAP_Y),
      });
    }
  }

  const width = PADDING * 2 + (maxLevel + 1) * NODE_WIDTH + maxLevel * LEVEL_GAP_X;
  const height = PADDING * 2 + maxHeight;

  return { positions, width, height };
}

const STATUS_BORDER: Record<string, string> = {
  pending: 'border-gray-200',
  running: 'border-blue-400',
  completed: 'border-green-400',
  failed: 'border-red-400',
  skipped: 'border-amber-400',
  default: 'border-gray-200',
};

const STATUS_BG: Record<string, string> = {
  pending: 'bg-gray-50',
  running: 'bg-blue-50',
  completed: 'bg-green-50',
  failed: 'bg-red-50',
  skipped: 'bg-amber-50',
  default: 'bg-white',
};

const STATUS_HEADER_BG: Record<string, string> = {
  pending: 'bg-gray-100',
  running: 'bg-blue-100',
  completed: 'bg-green-100',
  failed: 'bg-red-100',
  skipped: 'bg-amber-100',
  default: 'bg-gray-100',
};

const STATUS_HEADER_TEXT: Record<string, string> = {
  pending: 'text-gray-700',
  running: 'text-blue-700',
  completed: 'text-green-700',
  failed: 'text-red-700',
  skipped: 'text-amber-700',
  default: 'text-gray-900',
};

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}

const MODEL_LABELS: Record<string, string> = {
  'gemini-3-pro-image-preview': 'Pro',
  'gemini-3.1-flash-image-preview': 'Nano Banana 2',
  'seedream-4.5': 'Seedream 4.5',
  'seedream-5': 'Seedream 5',
  'gpt-image-1': 'GPT Image 1',
  'gpt-image-1-mini': 'GPT Image 1 Mini',
  'gpt-image-1.5': 'GPT Image 1.5',
  'gpt-image-2': 'GPT Image 2',
};

export interface DagJudge {
  type: 'batch' | 'individual';
  model: string;
  name?: string | null;
  promptName?: string | null;
  toleranceThreshold?: number | null;
  position?: number | null;
}

export function StrategyFlowDag({
  steps,
  judge,
  judges,
}: {
  steps: DagStep[];
  judge?: DagJudge | null;
  judges?: DagJudge[];
}) {
  if (steps.length === 0) return null;

  const effectiveJudges = judges && judges.length > 0 ? judges : judge ? [judge] : [];
  const hasJudge = effectiveJudges.length > 0;
  const judgeNodeHeight = Math.max(
    NODE_HEIGHT,
    JUDGE_HEADER_HEIGHT + effectiveJudges.length * JUDGE_ROW_HEIGHT + 16,
  );
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
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50/50">
      <svg width={totalWidth} height={height} className="block">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="0 0, 10 3.5, 0 7" className="fill-gray-400" />
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
              <path
                d={path}
                fill="none"
                className="stroke-gray-300"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              <rect
                x={labelX - 34}
                y={labelY - 9}
                width={68}
                height={18}
                rx={4}
                className="fill-white stroke-gray-200"
                strokeWidth="0.5"
              />
              <text
                x={labelX}
                y={labelY + 4}
                textAnchor="middle"
                className="fill-gray-500 text-[10px] font-medium"
              >
                {edge.label}
              </text>
            </g>
          );
        })}

        {steps.map((step, idx) => {
          const pos = positions.get(step.stepOrder);
          if (!pos) return null;

          const s = step.status ?? 'default';
          const border = STATUS_BORDER[s] ?? STATUS_BORDER.default;
          const bg = STATUS_BG[s] ?? STATUS_BG.default;
          const headerBg = STATUS_HEADER_BG[s] ?? STATUS_HEADER_BG.default;
          const headerText = STATUS_HEADER_TEXT[s] ?? STATUS_HEADER_TEXT.default;
          const modelLabel = step.model ? (MODEL_LABELS[step.model] ?? step.model) : '';

          return (
            <foreignObject
              key={`${step.stepOrder}-${idx}`}
              x={pos.x}
              y={pos.y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
            >
              <div
                className={`flex h-full flex-col overflow-hidden rounded-lg border-2 ${border} ${bg} shadow-sm`}
              >
                {/* Header */}
                <div className={`flex items-center justify-between px-3 py-2 ${headerBg}`}>
                  <span className={`text-xs font-semibold ${headerText}`}>
                    {truncate(step.label, 26)}
                  </span>
                  {step.status === 'running' && (
                    <span className="size-2.5 animate-pulse rounded-full bg-blue-500" />
                  )}
                  {step.status === 'completed' && <CheckIcon className="size-4 text-green-600" />}
                  {step.status === 'failed' && <XIcon className="size-4 text-red-600" />}
                  {step.status === 'skipped' && <PlayIcon className="size-4 text-amber-600" />}
                </div>
                {/* Body */}
                <div className="flex flex-1 flex-col gap-1 px-3 py-2">
                  {step.status === 'skipped' && step.error && (
                    <div className="text-[10px] text-amber-700" title={step.error}>
                      {truncate(step.error, 36)}
                    </div>
                  )}
                  {step.promptName && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                      <MessageSquareIcon className="size-3 shrink-0 text-gray-400" />
                      <span className="truncate">{truncate(step.promptName, 28)}</span>
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-1.5">
                    {modelLabel && (
                      <span className="rounded bg-gray-200/80 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                        {modelLabel}
                      </span>
                    )}
                    {step.aspectRatio && (
                      <span className="rounded bg-gray-200/80 px-1.5 py-0.5 text-[10px] text-gray-500">
                        {step.aspectRatio}
                      </span>
                    )}
                    {step.outputResolution && (
                      <span className="rounded bg-gray-200/80 px-1.5 py-0.5 text-[10px] text-gray-500">
                        {step.outputResolution}
                      </span>
                    )}
                    {step.temperature != null && (
                      <span className="rounded bg-gray-200/80 px-1.5 py-0.5 text-[10px] text-gray-500">
                        t={String(step.temperature)}
                      </span>
                    )}
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
              return (
                <path
                  key={`judge-edge-${i}`}
                  d={path}
                  fill="none"
                  className="stroke-amber-300"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            <foreignObject
              x={judgePos.x}
              y={judgePos.y}
              width={NODE_WIDTH}
              height={judgeNodeHeight}
            >
              <div className="flex h-full flex-col overflow-hidden rounded-lg border-2 border-amber-400 bg-amber-50 shadow-sm">
                <div className="flex items-center justify-between bg-amber-100 px-3 py-2">
                  <span className="text-xs font-semibold text-amber-800">
                    {effectiveJudges.length === 1 ? 'Judge' : `Judges (${effectiveJudges.length})`}
                  </span>
                  <StarIcon className="size-4 text-amber-600" fill="currentColor" />
                </div>
                <div className="flex flex-1 flex-col gap-1 px-3 py-2">
                  {effectiveJudges.map((j, ji) => (
                    <div
                      key={`${j.model}-${j.name ?? ''}-${j.position ?? ''}`}
                      className="rounded bg-amber-100/70 px-2 py-1.5"
                    >
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="rounded bg-amber-200/80 px-1 py-0.5 font-medium text-amber-700">
                          {j.position ?? ji + 1}
                        </span>
                        {j.name && (
                          <span className="truncate font-semibold text-amber-900" title={j.name}>
                            {truncate(j.name, 16)}
                          </span>
                        )}
                        <span className="rounded bg-white/70 px-1 py-0.5 text-amber-700">
                          {j.type === 'batch' ? 'Batch' : 'Individual'}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                        <span
                          className="rounded bg-amber-200/80 px-1 py-0.5 font-medium text-amber-700"
                          title={j.model}
                        >
                          {MODEL_LABELS[j.model] ?? truncate(j.model, 16)}
                        </span>
                        {j.toleranceThreshold != null && (
                          <span className="text-amber-700">tol {j.toleranceThreshold}</span>
                        )}
                      </div>
                      {j.promptName && (
                        <div className="mt-1 text-[10px] text-amber-800" title={j.promptName}>
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

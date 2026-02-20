'use client';

export interface DagStep {
  stepOrder: number;
  label: string;
  model?: string;
  aspectRatio?: string;
  outputResolution?: string;
  promptName?: string | null;
  temperature?: string | number | null;
  status?: 'pending' | 'running' | 'completed' | 'failed';
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

const NODE_WIDTH = 180;
const NODE_HEIGHT = 84;
const LEVEL_GAP_X = 80;
const NODE_GAP_Y = 24;
const PADDING = 24;

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

function computeLayout(steps: DagStep[]): { positions: Map<number, NodePosition>; width: number; height: number } {
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
  default: 'border-gray-200',
};

const STATUS_BG: Record<string, string> = {
  pending: 'bg-gray-50',
  running: 'bg-blue-50',
  completed: 'bg-green-50',
  failed: 'bg-red-50',
  default: 'bg-white',
};

const STATUS_HEADER_BG: Record<string, string> = {
  pending: 'bg-gray-100',
  running: 'bg-blue-100',
  completed: 'bg-green-100',
  failed: 'bg-red-100',
  default: 'bg-gray-100',
};

const STATUS_HEADER_TEXT: Record<string, string> = {
  pending: 'text-gray-700',
  running: 'text-blue-700',
  completed: 'text-green-700',
  failed: 'text-red-700',
  default: 'text-gray-900',
};

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}

const MODEL_LABELS: Record<string, string> = {
  'gemini-2.5-flash-image': 'Flash',
  'gemini-3-pro-image-preview': 'Pro',
};

export function StrategyFlowDag({ steps }: { steps: DagStep[] }) {
  if (steps.length === 0) return null;

  const { positions, width, height } = computeLayout(steps);

  const allEdges: Edge[] = [];
  for (const step of steps) {
    allEdges.push(...getEdges(step));
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50/50">
      <svg width={width} height={height} className="block">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="0 0, 8 3, 0 6" className="fill-gray-400" />
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
          const labelY = (y1 + y2) / 2 - 8;

          return (
            <g key={i}>
              <path
                d={path}
                fill="none"
                className="stroke-gray-300"
                strokeWidth="1.5"
                markerEnd="url(#arrowhead)"
              />
              <rect
                x={labelX - 24}
                y={labelY - 8}
                width={48}
                height={16}
                rx={4}
                className="fill-white stroke-gray-200"
                strokeWidth="0.5"
              />
              <text
                x={labelX}
                y={labelY + 3}
                textAnchor="middle"
                className="fill-gray-500 text-[9px] font-medium"
              >
                {edge.label}
              </text>
            </g>
          );
        })}

        {steps.map((step) => {
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
              key={step.stepOrder}
              x={pos.x}
              y={pos.y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
            >
              <div className={`flex h-full flex-col overflow-hidden rounded-lg border ${border} ${bg} shadow-xs`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-2.5 py-1 ${headerBg}`}>
                  <span className={`text-[10px] font-semibold ${headerText}`}>
                    {truncate(step.label, 20)}
                  </span>
                  {step.status === 'running' && (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  )}
                  {step.status === 'completed' && (
                    <svg className="h-3 w-3 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {step.status === 'failed' && (
                    <svg className="h-3 w-3 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {/* Body */}
                <div className="flex flex-1 flex-col gap-0.5 px-2.5 py-1">
                  {step.promptName && (
                    <div className="flex items-center gap-1 text-[9px] text-gray-600">
                      <svg className="h-2.5 w-2.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                      </svg>
                      <span className="truncate">{truncate(step.promptName, 22)}</span>
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-1">
                    {modelLabel && (
                      <span className="rounded bg-gray-200/80 px-1 py-0.5 text-[8px] font-medium text-gray-600">
                        {modelLabel}
                      </span>
                    )}
                    {step.aspectRatio && (
                      <span className="rounded bg-gray-200/80 px-1 py-0.5 text-[8px] text-gray-500">
                        {step.aspectRatio}
                      </span>
                    )}
                    {step.outputResolution && (
                      <span className="rounded bg-gray-200/80 px-1 py-0.5 text-[8px] text-gray-500">
                        {step.outputResolution}
                      </span>
                    )}
                    {step.temperature != null && (
                      <span className="rounded bg-gray-200/80 px-1 py-0.5 text-[8px] text-gray-500">
                        t={String(step.temperature)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}

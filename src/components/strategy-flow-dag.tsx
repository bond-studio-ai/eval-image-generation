"use client";

import dagre, { type EdgeLabel, type GraphLabel, type NodeLabel } from "@dagrejs/dagre";
import { Background, Controls, type Edge as FlowEdge, type Node as FlowNode, Handle, MarkerType, type NodeProps, type NodeTypes, Position, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { memo, useMemo } from "react";
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

export interface DagJudge {
  type: "batch" | "individual";
  model: string;
  name?: string | null;
  promptName?: string | null;
  toleranceThreshold?: number | null;
  position?: number | null;
}

interface Edge {
  from: number;
  to: number;
  label: string;
}

const NODE_WIDTH = 240;
const NODE_HEIGHT = 120;
const RANK_GAP = 100;
const NODE_GAP = 32;
const JUDGE_HEADER_HEIGHT = 40;
const JUDGE_ROW_HEIGHT = 72;
const JUDGE_NODE_ID = "judge";

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

type StatusKey = NonNullable<DagStep["status"]> | "default";

const STATUS_BORDER: Record<StatusKey, string> = {
  pending: "border-border",
  running: "border-primary-400",
  completed: "border-success-400",
  failed: "border-danger-400",
  skipped: "border-warning-400",
  default: "border-border"
};

const STATUS_BG: Record<StatusKey, string> = {
  pending: "bg-surface-muted",
  running: "bg-primary-50",
  completed: "bg-success-50",
  failed: "bg-danger-50",
  skipped: "bg-warning-50",
  default: "bg-surface"
};

const STATUS_HEADER_BG: Record<StatusKey, string> = {
  pending: "bg-surface-sunken",
  running: "bg-primary-100",
  completed: "bg-success-100",
  failed: "bg-danger-100",
  skipped: "bg-warning-100",
  default: "bg-surface-sunken"
};

const STATUS_HEADER_TEXT: Record<StatusKey, string> = {
  pending: "text-text-secondary",
  running: "text-primary-700",
  completed: "text-success-700",
  failed: "text-danger-700",
  skipped: "text-warning-700",
  default: "text-text-primary"
};

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}\u2026` : value;
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

function resolveJudges(judges: DagJudge[] | undefined, judge: DagJudge | null | undefined): DagJudge[] {
  if (judges && judges.length > 0) return judges;
  if (judge) return [judge];
  return [];
}

function judgeHeight(count: number): number {
  return Math.max(NODE_HEIGHT, JUDGE_HEADER_HEIGHT + count * JUDGE_ROW_HEIGHT + 16);
}

type StepFlowNode = FlowNode<{ step: DagStep }, "stepNode">;
type JudgeFlowNode = FlowNode<{ judges: DagJudge[] }, "judgeNode">;
type AppNode = StepFlowNode | JudgeFlowNode;

const HANDLE_STYLE = { opacity: 0 } as const;

const StepNode = memo(function StepNode({ data }: NodeProps<StepFlowNode>) {
  const { step } = data;
  const status: StatusKey = step.status ?? "default";
  const border = STATUS_BORDER[status];
  const bg = STATUS_BG[status];
  const headerBg = STATUS_HEADER_BG[status];
  const headerText = STATUS_HEADER_TEXT[status];
  const modelLabel = step.model ? (MODEL_LABELS[step.model] ?? step.model) : "";

  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} style={HANDLE_STYLE} />
      <div className={`flex h-full w-full flex-col overflow-hidden rounded-lg border-2 ${border} ${bg} shadow-sm`}>
        <div className={`flex items-center justify-between px-3 py-2 ${headerBg}`}>
          <span className={`text-caption font-semibold ${headerText}`}>{truncate(step.label, 26)}</span>
          {step.status === "running" && <span className="bg-primary-500 size-2.5 animate-pulse rounded-full" />}
          {step.status === "completed" && <CheckIcon className="text-success-600 size-4" />}
          {step.status === "failed" && <XIcon className="text-danger-600 size-4" />}
          {step.status === "skipped" && <PlayIcon className="text-warning-600 size-4" />}
        </div>
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
      <Handle type="source" position={Position.Right} isConnectable={false} style={HANDLE_STYLE} />
    </>
  );
});

const JudgeNode = memo(function JudgeNode({ data }: NodeProps<JudgeFlowNode>) {
  const { judges } = data;

  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} style={HANDLE_STYLE} />
      <div className="border-warning-400 bg-warning-50 flex h-full w-full flex-col overflow-hidden rounded-lg border-2 shadow-sm">
        <div className="bg-warning-100 flex items-center justify-between px-3 py-2">
          <span className="text-warning-800 text-caption font-semibold">{judges.length === 1 ? "Judge" : `Judges (${judges.length})`}</span>
          <StarIcon className="text-warning-600 size-4" fill="currentColor" />
        </div>
        <div className="flex flex-1 flex-col gap-1 px-3 py-2">
          {judges.map((j, ji) => (
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
    </>
  );
});

const nodeTypes = { stepNode: StepNode, judgeNode: JudgeNode } satisfies NodeTypes;

const DEP_EDGE_STYLE = { stroke: "var(--color-border-strong)", strokeWidth: 2 } as const;
const JUDGE_EDGE_STYLE = { stroke: "var(--color-warning-300)", strokeWidth: 2, strokeDasharray: "6 3" } as const;
const DEP_MARKER = { type: MarkerType.ArrowClosed, color: "var(--color-border-strong)" } as const;
const JUDGE_MARKER = { type: MarkerType.ArrowClosed, color: "var(--color-warning-300)" } as const;

function buildElements(steps: DagStep[], effectiveJudges: DagJudge[]): { nodes: AppNode[]; edges: FlowEdge[] } {
  const depEdges = steps.flatMap((step) => getEdges(step));
  const referenced = new Set(depEdges.map((edge) => edge.from));

  const edges: FlowEdge[] = depEdges.map((edge) => ({
    id: `${edge.from}-${edge.to}-${edge.label}`,
    source: String(edge.from),
    target: String(edge.to),
    label: edge.label,
    style: DEP_EDGE_STYLE,
    markerEnd: DEP_MARKER,
    labelBgPadding: [6, 2],
    labelBgBorderRadius: 4
  }));

  const hasJudge = effectiveJudges.length > 0;
  if (hasJudge) {
    for (const step of steps) {
      if (referenced.has(step.stepOrder)) continue;
      edges.push({
        id: `judge-${step.stepOrder}`,
        source: String(step.stepOrder),
        target: JUDGE_NODE_ID,
        style: JUDGE_EDGE_STYLE,
        markerEnd: JUDGE_MARKER,
        animated: true
      });
    }
  }

  const graph = new dagre.graphlib.Graph<GraphLabel, NodeLabel, EdgeLabel>();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: NODE_GAP, ranksep: RANK_GAP });

  for (const step of steps) {
    graph.setNode(String(step.stepOrder), { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  const judgeNodeHeight = judgeHeight(effectiveJudges.length);
  if (hasJudge) {
    graph.setNode(JUDGE_NODE_ID, { width: NODE_WIDTH, height: judgeNodeHeight });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }
  dagre.layout(graph);

  const stepNodes: AppNode[] = steps.map((step) => {
    const { x = 0, y = 0 } = graph.node(String(step.stepOrder));
    return {
      id: String(step.stepOrder),
      type: "stepNode",
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: { step },
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      draggable: true
    };
  });

  const nodes: AppNode[] = Array.from(stepNodes);
  if (hasJudge) {
    const { x = 0, y = 0 } = graph.node(JUDGE_NODE_ID);
    nodes.push({
      id: JUDGE_NODE_ID,
      type: "judgeNode",
      position: { x: x - NODE_WIDTH / 2, y: y - judgeNodeHeight / 2 },
      data: { judges: effectiveJudges },
      style: { width: NODE_WIDTH, height: judgeNodeHeight }
    });
  }

  return { nodes, edges };
}

export function StrategyFlowDag({ steps, judge, judges }: { steps: DagStep[]; judge?: DagJudge | null; judges?: DagJudge[] }) {
  const effectiveJudges = useMemo(() => resolveJudges(judges, judge), [judges, judge]);
  const { nodes, edges } = useMemo(() => buildElements(steps, effectiveJudges), [steps, effectiveJudges]);

  if (steps.length === 0) return null;

  return (
    <div className="border-border bg-surface-muted/50 h-[480px] w-full overflow-hidden rounded-lg border">
      <ReactFlowProvider>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView nodesConnectable={false} edgesFocusable={false} proOptions={{ hideAttribution: true }}>
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

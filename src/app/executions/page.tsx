import type { Metadata } from "next";
import { GenerationsFilters } from "@/app/generations/generations-filters";
import { EmptyState } from "@/components/empty-state";
import { GenerationsList } from "@/components/generations-list";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { type GenerationRow, normalizeGenerationRow } from "@/lib/generation-row";
import { fetchGenerations, fetchPromptVersions } from "@/lib/service-client";
import { ExecutionsPageHeader } from "./executions-page-header";
import { ExecutionsTabs } from "./executions-tabs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Executions",
  description: "Browse generation batches and individual generations."
};

const PAGE_SIZE = 20;

interface ExecutionsSearchParams {
  tab?: string;
  page?: string;
  prompt_version_id?: string;
  scene_accuracy_rating?: string;
  product_accuracy_rating?: string;
  unrated?: string;
  from?: string;
  to?: string;
  sort?: string;
  order?: string;
  source?: string;
}

interface PageProps {
  searchParams: Promise<ExecutionsSearchParams>;
}

export default async function ExecutionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = params.tab === "generations" ? "generations" : "batches";

  if (activeTab === "generations") {
    return <GenerationsTab params={params} />;
  }

  return (
    <div>
      <ExecutionsTabs />
    </div>
  );
}

type ExecTab = "batches" | "generations";

function ExecutionsTabNav({ active, source }: { active: ExecTab; source?: string | undefined }) {
  const sourceQs = source === "benchmark" ? "?source=benchmark" : "";
  const items: TabItem<ExecTab>[] = [
    { key: "batches", label: "Batches", href: `/executions${sourceQs}` },
    {
      key: "generations",
      label: "Generations",
      href: source === "benchmark" ? "/executions?tab=generations&source=benchmark" : "/executions?tab=generations"
    }
  ];
  return (
    <div className="mb-6">
      <Tabs items={items} active={active} label="Runs view" />
    </div>
  );
}

async function GenerationsTab({ params }: { params: ExecutionsSearchParams }) {
  const queryParams: Record<string, string> = {};
  if (params.prompt_version_id) queryParams["promptVersionId"] = params.prompt_version_id;
  if (params.scene_accuracy_rating) queryParams["sceneAccuracyRating"] = params.scene_accuracy_rating;
  if (params.product_accuracy_rating) queryParams["productAccuracyRating"] = params.product_accuracy_rating;
  if (params.unrated) queryParams["unrated"] = params.unrated;
  if (params.from) queryParams["from"] = params.from;
  if (params.to) queryParams["to"] = params.to;
  if (params.source === "benchmark") queryParams["source"] = "benchmark";
  queryParams["order"] = params.order === "asc" ? "asc" : "desc";
  queryParams["limit"] = String(PAGE_SIZE);
  if (params.page) queryParams["page"] = params.page;

  const [json, promptVersions] = await Promise.all([fetchGenerations(queryParams), fetchPromptVersions(200)]);

  const total = Number((json.pagination as { total?: unknown } | undefined)?.total ?? 0);

  const initialData: GenerationRow[] = (json.data ?? []).map(normalizeGenerationRow);

  const filters = {
    sort: params.sort ?? "created_at",
    order: params.order ?? "desc",
    ...(params.scene_accuracy_rating !== undefined ? { sceneAccuracyRating: params.scene_accuracy_rating } : {}),
    ...(params.product_accuracy_rating !== undefined ? { productAccuracyRating: params.product_accuracy_rating } : {}),
    ...(params.unrated !== undefined ? { unrated: params.unrated } : {}),
    ...(params.prompt_version_id !== undefined ? { promptVersionId: params.prompt_version_id } : {}),
    ...(params.from !== undefined ? { from: params.from } : {}),
    ...(params.to !== undefined ? { to: params.to } : {}),
    ...(params.source !== undefined ? { source: params.source } : {})
  };

  return (
    <div>
      <ExecutionsPageHeader />
      <ExecutionsTabNav active="generations" source={params.source} />

      <GenerationsFilters params={params} promptVersions={promptVersions} />

      {initialData.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No generations found" description="No generations match your current filters." />
        </div>
      ) : (
        <GenerationsList initialData={initialData} initialTotal={total} pageSize={PAGE_SIZE} filters={filters} />
      )}
    </div>
  );
}

import { serviceUrl } from "@/lib/api-base";
import { parseJsonOrEmpty } from "@/lib/async-utils";
import { fetchPresetRunRequests } from "@/lib/strategy-run-input";
import type { ListResponse, PresetItem, StrategyItem } from "./types";

const INPUT_PRESET_PAGE_SIZE = 100;

async function fetchAllInputPresets(signal?: AbortSignal): Promise<PresetItem[]> {
  const presets: PresetItem[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(INPUT_PRESET_PAGE_SIZE),
      minimal: "true"
    });
    const res = await fetch(`${serviceUrl("input-presets")}?${qs}`, { cache: "no-store", ...(signal ? { signal } : {}) });
    if (!res.ok) throw new Error(`Failed to load input presets (${res.status})`);

    const json = (await res.json()) as ListResponse<{ id: string; name: string | null }>;
    const pageItems = json.data ?? json.items ?? [];
    presets.push(...pageItems.map((item) => ({ id: item.id, name: item.name ?? null })));

    totalPages = json.pagination?.totalPages ?? page;
    page += 1;
  } while (page <= totalPages);

  return presets;
}

export async function fetchRunOptions(signal?: AbortSignal): Promise<{ strategies: StrategyItem[]; presets: PresetItem[] }> {
  const [strategies, presets] = await Promise.all([
    (async (): Promise<StrategyItem[]> => {
      const res = await fetch(serviceUrl("strategies?limit=100"), {
        cache: "no-store",
        ...(signal ? { signal } : {})
      });
      if (!res.ok) throw new Error(`Failed to load strategies (${res.status})`);
      const stratRes = (await res.json()) as ListResponse<{ id: string; name: string }>;
      const stratData = stratRes.data ?? stratRes.items ?? [];
      return Array.isArray(stratData) ? stratData.map((strategy) => ({ id: strategy.id, name: strategy.name })) : [];
    })(),
    fetchAllInputPresets(signal)
  ]);
  return { strategies, presets };
}

export const BENCHMARK_PROJECT_IDS = [
  "PRJ-P4YAGU7XW",
  "PRJ-QU6S58FHG",
  "PRJ-FARVFVS4A",
  "PRJ-T3HTSH5ME",
  "PRJ-E78TJ8WXM",
  "PRJ-K8X7ABKR2",
  "PRJ-QJUEYENEP",
  "PRJ-P8CD6Q2HH",
  "PRJ-QSNP6AZTC",
  "PRJ-BD38GQP2K",
  "PRJ-4XN53LRMM",
  "PRJ-VPG3BGK29",
  "PRJ-954NJBRZQ",
  "PRJ-887MW333R",
  "PRJ-3ASSMMB7A",
  "PRJ-9LGYQDNSY",
  "PRJ-TFJDZP3VK",
  "PRJ-KBLQ9SAU4",
  "PRJ-N43MK39ZR",
  "PRJ-XB6SETAU7"
] as const;

export const DEFAULT_BENCHMARK_PROJECT_IDS = Array.from(BENCHMARK_PROJECT_IDS);

interface ExecuteRunsParams {
  benchmarkMode: boolean;
  selectedStrategyIds: string[];
  selectedPresetIds: string[];
  selectedBenchmarkProjectIds: string[];
  numberOfImages: number | null;
  groupId: string;
}

export async function executeRuns({ benchmarkMode, selectedStrategyIds, selectedPresetIds, selectedBenchmarkProjectIds, numberOfImages, groupId }: ExecuteRunsParams): Promise<PromiseSettledResult<unknown>[]> {
  if (benchmarkMode) {
    return Promise.allSettled(
      selectedStrategyIds.flatMap((strategyId) =>
        selectedBenchmarkProjectIds.map(async (projectId) => {
          const res = await fetch(serviceUrl(`strategies/${strategyId}/runs`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: projectId,
              group_id: groupId,
              ...(numberOfImages ? { number_of_images: numberOfImages } : {})
            })
          });
          const data = await parseJsonOrEmpty(res);
          if (!res.ok) {
            throw new Error((data as { error?: { message?: string } }).error?.message || "Failed to start benchmark run");
          }
          return data;
        })
      )
    );
  }

  const requests = await fetchPresetRunRequests(selectedPresetIds, {
    batch: true,
    group_id: groupId,
    ...(numberOfImages ? { number_of_images: numberOfImages } : {})
  });
  return Promise.allSettled(
    selectedStrategyIds.flatMap((strategyId) =>
      requests.map(async (requestBody) => {
        const res = await fetch(serviceUrl(`strategies/${strategyId}/runs`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });
        const data = await parseJsonOrEmpty(res);
        if (!res.ok) {
          throw new Error((data as { error?: { message?: string } }).error?.message || "Failed to start run");
        }
        return data;
      })
    )
  );
}

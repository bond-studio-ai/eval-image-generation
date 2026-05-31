export interface FilterParams {
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

export function buildGenerationsQuery(params: FilterParams): string {
  const sp = new URLSearchParams();
  sp.set("tab", "generations");
  const keys: (keyof FilterParams)[] = ["prompt_version_id", "scene_accuracy_rating", "product_accuracy_rating", "unrated", "from", "to", "sort", "order", "source"];
  for (const k of keys) {
    const value = params[k];
    if (value !== undefined && value !== "") sp.set(k, value);
  }
  return `/executions?${sp.toString()}`;
}

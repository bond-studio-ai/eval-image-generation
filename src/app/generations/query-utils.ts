export type FilterParams = {
  prompt_version_id?: string;
  scene_accuracy_rating?: string;
  product_accuracy_rating?: string;
  unrated?: string;
  from?: string;
  to?: string;
  sort?: string;
  order?: string;
};

export function buildGenerationsQuery(params: FilterParams): string {
  const sp = new URLSearchParams();
  sp.set('tab', 'generations');
  const keys: (keyof FilterParams)[] = [
    'prompt_version_id', 'scene_accuracy_rating', 'product_accuracy_rating',
    'unrated', 'from', 'to', 'sort', 'order',
  ];
  for (const k of keys) {
    const v = params[k];
    if (v !== undefined && v !== '') sp.set(k, v);
  }
  return `/executions?${sp.toString()}`;
}

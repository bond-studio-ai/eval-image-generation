

/** One result (image) in a generation. */
export interface MatrixRunResult {
  resultId: string;
  url: string | null;
}

/** One generation with its results. */
export interface MatrixRunGeneration {
  generationId: string;
  results: MatrixRunResult[];
}

/** Run payload: list of generations, each with results (resultId + url). */
export interface MatrixRun {
  runId: string | null;
  status: string;
  generations: MatrixRunGeneration[];
}

export interface MatrixCell {
  strategyId: string;
  runId: string | null;
  status: string;
  totalImages: number;
  goodImages: number;
  percentage: number | null;
  needsEval: boolean;
  outputUrls: string[] | null;
  generationIds: string[];
  generationResultIds: string[];
  run?: MatrixRun;
}

export interface StrategySummaryItem {
  strategyId: string;
  totalImages: number;
  presetsCovered: number;
  totalPresets: number;
  coverageRatio: number;
  globalPercentage: number | null;
  stabilityVariance: number | null;
  avgExecutionTimeMs: number | null;
  costPerImageMs: number | null;
}

export interface StrategyMatrixResponse {
  rows: { id: string; name: string }[];
  columns: { id: string; name: string }[];
  matrix: { inputPresetId: string; name: string; cells: MatrixCell[] }[];
  strategySummary: StrategySummaryItem[];
}

/** Query params for strategy-matrix API (and URL search params). */
export interface StrategyMatrixParams {
  model?: string;
  minTemperature?: string;
  maxTemperature?: string;
  minCoverage?: string;
  minImages?: string;
  sceneWeight?: string;
  productWeight?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}


/** Build URLSearchParams for the API from StrategyMatrixParams. */
export function strategyMatrixParamsToSearch(params: StrategyMatrixParams): URLSearchParams {
  const q = new URLSearchParams();
  if (params.model?.trim()) q.set('model', params.model.trim());
  if (params.minTemperature?.trim()) q.set('minTemperature', params.minTemperature.trim());
  if (params.maxTemperature?.trim()) q.set('maxTemperature', params.maxTemperature.trim());
  if (params.minCoverage?.trim()) q.set('minCoverage', params.minCoverage.trim());
  if (params.minImages?.trim()) q.set('minImages', params.minImages.trim());
  if (params.sceneWeight?.trim()) q.set('sceneWeight', params.sceneWeight.trim());
  if (params.productWeight?.trim()) q.set('productWeight', params.productWeight.trim());
  if (params.sort?.trim()) q.set('sort', params.sort.trim());
  if (params.order) q.set('order', params.order);
  return q;
}

/** Parse URL search params into StrategyMatrixParams. */
export function searchParamsToStrategyMatrixParams(
  searchParams: URLSearchParams
): StrategyMatrixParams {
  const model = searchParams.get('model') ?? undefined;
  const minTemperature = searchParams.get('minTemperature') ?? undefined;
  const maxTemperature = searchParams.get('maxTemperature') ?? undefined;
  const minCoverage = searchParams.get('minCoverage') ?? undefined;
  const minImages = searchParams.get('minImages') ?? undefined;
  const sceneWeight = searchParams.get('sceneWeight') ?? undefined;
  const productWeight = searchParams.get('productWeight') ?? undefined;
  const sort = searchParams.get('sort') ?? undefined;
  const order = (searchParams.get('order') === 'asc' ? 'asc' : searchParams.get('order') === 'desc' ? 'desc' : undefined) as 'asc' | 'desc' | undefined;
  return {
    ...(model !== undefined && model !== '' && { model }),
    ...(minTemperature !== undefined && minTemperature !== '' && { minTemperature }),
    ...(maxTemperature !== undefined && maxTemperature !== '' && { maxTemperature }),
    ...(minCoverage !== undefined && minCoverage !== '' && { minCoverage }),
    ...(minImages !== undefined && minImages !== '' && { minImages }),
    ...(sceneWeight !== undefined && sceneWeight !== '' && { sceneWeight }),
    ...(productWeight !== undefined && productWeight !== '' && { productWeight }),
    ...(sort !== undefined && sort !== '' && { sort }),
    ...(order !== undefined && { order }),
  };
}

/** Build the API URL for strategy-matrix with given params. */
export function strategyMatrixApiUrl(params: StrategyMatrixParams): string {
  const query = strategyMatrixParamsToSearch(params);
  const queryString = query.toString();
  return `/api/v1/strategy-matrix${queryString ? `?${queryString}` : ''}`;
}



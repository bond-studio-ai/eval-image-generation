export interface StrategyItem {
  id: string;
  name: string;
}

export interface PresetItem {
  id: string;
  name: string | null;
}

export interface ListResponse<T> {
  data?: T[];
  items?: T[];
  pagination?: {
    page: number;
    totalPages: number;
  };
}

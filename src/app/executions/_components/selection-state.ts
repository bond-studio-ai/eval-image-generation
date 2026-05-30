export interface SelectionState {
  selectedStrategyIds: string[];
  selectedPresetIds: string[];
  selectedBenchmarkProjectIds: string[];
  strategySearch: string;
  presetSearch: string;
  benchmarkMode: boolean;
}

export type SelectionAction =
  | { type: "toggleStrategy"; id: string }
  | { type: "togglePreset"; id: string }
  | { type: "toggleBenchmarkProject"; id: string }
  | { type: "setStrategySearch"; value: string }
  | { type: "setPresetSearch"; value: string }
  | { type: "clearStrategies" }
  | { type: "clearPresets" }
  | { type: "clearBenchmarkProjects" }
  | { type: "setBenchmarkMode"; benchmarkMode: boolean; benchmarkProjectIds: string[] }
  | { type: "openModal"; benchmarkMode: boolean; benchmarkProjectIds: string[] }
  | { type: "resetAfterRun"; benchmarkMode: boolean };

export const INITIAL_SELECTION: SelectionState = {
  selectedStrategyIds: [],
  selectedPresetIds: [],
  selectedBenchmarkProjectIds: [],
  strategySearch: "",
  presetSearch: "",
  benchmarkMode: false
};

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case "toggleStrategy":
      return { ...state, selectedStrategyIds: toggleId(state.selectedStrategyIds, action.id) };
    case "togglePreset":
      return { ...state, selectedPresetIds: toggleId(state.selectedPresetIds, action.id) };
    case "toggleBenchmarkProject":
      return {
        ...state,
        selectedBenchmarkProjectIds: toggleId(state.selectedBenchmarkProjectIds, action.id)
      };
    case "setStrategySearch":
      return { ...state, strategySearch: action.value };
    case "setPresetSearch":
      return { ...state, presetSearch: action.value };
    case "clearStrategies":
      return { ...state, selectedStrategyIds: [] };
    case "clearPresets":
      return { ...state, selectedPresetIds: [] };
    case "clearBenchmarkProjects":
      return { ...state, selectedBenchmarkProjectIds: [] };
    case "setBenchmarkMode":
      return {
        ...state,
        benchmarkMode: action.benchmarkMode,
        selectedPresetIds: [],
        selectedBenchmarkProjectIds: action.benchmarkProjectIds
      };
    case "openModal":
      return {
        ...state,
        selectedStrategyIds: [],
        selectedPresetIds: [],
        selectedBenchmarkProjectIds: action.benchmarkProjectIds,
        benchmarkMode: action.benchmarkMode
      };
    case "resetAfterRun":
      return {
        ...state,
        selectedStrategyIds: [],
        selectedPresetIds: [],
        selectedBenchmarkProjectIds: [],
        strategySearch: "",
        presetSearch: "",
        benchmarkMode: action.benchmarkMode
      };
  }
}

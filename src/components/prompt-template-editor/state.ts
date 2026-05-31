import { assertNever } from "@/lib/assert-never";
import { type DollhouseProductType } from "@/lib/prompt-template-constants";

// --- Conditional popover state ---
export interface ConditionalState {
  open: boolean;
  search: string;
}
export const conditionalInitial: ConditionalState = { open: false, search: "" };
export type ConditionalAction = { type: "toggle" } | { type: "close" } | { type: "reset" } | { type: "setSearch"; value: string };
export function conditionalReducer(state: ConditionalState, action: ConditionalAction): ConditionalState {
  switch (action.type) {
    case "close": {
      return { ...state, open: false };
    }
    case "reset": {
      return conditionalInitial;
    }
    case "setSearch": {
      return { ...state, search: action.value };
    }
    case "toggle": {
      return { ...state, open: !state.open };
    }
    default: {
      return assertNever(action);
    }
  }
}

// --- Reference popover state ---
export interface ReferenceState {
  open: boolean;
  search: string;
  category: string | null;
}
export const referenceInitial: ReferenceState = { open: false, search: "", category: null };
export type ReferenceAction = { type: "toggle" } | { type: "close" } | { type: "reset" } | { type: "setSearch"; value: string } | { type: "setCategory"; value: string } | { type: "clearCategory" };
export function referenceReducer(state: ReferenceState, action: ReferenceAction): ReferenceState {
  switch (action.type) {
    case "clearCategory": {
      return { ...state, category: null };
    }
    case "close": {
      return { ...state, open: false };
    }
    case "reset": {
      return referenceInitial;
    }
    case "setCategory": {
      return { ...state, category: action.value };
    }
    case "setSearch": {
      return { ...state, search: action.value };
    }
    case "toggle": {
      // Opening the picker resets the drill-down category; closing preserves it.
      return state.open ? { ...state, open: false } : { ...state, open: true, category: null };
    }
    default: {
      return assertNever(action);
    }
  }
}

// --- Dollhouse popover state ---
export interface DollhouseState {
  open: boolean;
  product: DollhouseProductType | null;
  search: string;
}
export const dollhouseInitial: DollhouseState = { open: false, product: null, search: "" };
export type DollhouseAction = { type: "toggle" } | { type: "close" } | { type: "reset" } | { type: "setSearch"; value: string } | { type: "setProduct"; value: DollhouseProductType } | { type: "clearProduct" };
export function dollhouseReducer(state: DollhouseState, action: DollhouseAction): DollhouseState {
  switch (action.type) {
    case "clearProduct": {
      return { ...state, product: null, search: "" };
    }
    case "close": {
      return { ...state, open: false };
    }
    case "reset": {
      return dollhouseInitial;
    }
    case "setProduct": {
      return { ...state, product: action.value };
    }
    case "setSearch": {
      return { ...state, search: action.value };
    }
    case "toggle": {
      // Opening the picker clears any selected product and search query.
      return state.open ? { ...state, open: false } : { ...state, open: true, product: null, search: "" };
    }
    default: {
      return assertNever(action);
    }
  }
}

// --- Reference attributes fetch state ---
export interface AttributesState {
  list: string[];
  loading: boolean;
  error: string | null;
}
export const attributesInitial: AttributesState = { list: [], loading: false, error: null };
export type AttributesAction = { type: "fetchStart" } | { type: "fetchSuccess"; list: string[] } | { type: "fetchError"; error: string } | { type: "fetchEnd" } | { type: "clearError" } | { type: "clear" };
export function attributesReducer(state: AttributesState, action: AttributesAction): AttributesState {
  switch (action.type) {
    case "clear": {
      return { ...state, list: [], error: null };
    }
    case "clearError": {
      return { ...state, error: null };
    }
    case "fetchEnd": {
      return { ...state, loading: false };
    }
    case "fetchError": {
      return { ...state, list: [], error: action.error };
    }
    case "fetchStart": {
      return { list: [], loading: true, error: null };
    }
    case "fetchSuccess": {
      return { ...state, list: action.list };
    }
    default: {
      return assertNever(action);
    }
  }
}

import { describe, expect, it } from "vitest";
import { attributesInitial, attributesReducer, conditionalInitial, conditionalReducer, dollhouseInitial, dollhouseReducer, referenceInitial, referenceReducer } from "@/components/prompt-template-editor/state";

describe("conditionalReducer", () => {
  it("toggles, closes, sets search, and resets", () => {
    expect(conditionalReducer(conditionalInitial, { type: "toggle" }).open).toBe(true);
    expect(conditionalReducer({ open: true, search: "x" }, { type: "close" })).toEqual({ open: false, search: "x" });
    expect(conditionalReducer(conditionalInitial, { type: "setSearch", value: "ab" }).search).toBe("ab");
    expect(conditionalReducer({ open: true, search: "x" }, { type: "reset" })).toEqual(conditionalInitial);
  });
});

describe("referenceReducer", () => {
  it("opening via toggle clears the drill-down category", () => {
    const next = referenceReducer({ open: false, search: "q", category: "faucets" }, { type: "toggle" });
    expect(next).toEqual({ open: true, search: "q", category: null });
  });

  it("closing via toggle preserves the category", () => {
    const next = referenceReducer({ open: true, search: "q", category: "faucets" }, { type: "toggle" });
    expect(next).toEqual({ open: false, search: "q", category: "faucets" });
  });

  it("sets and clears the category", () => {
    expect(referenceReducer(referenceInitial, { type: "setCategory", value: "mirrors" }).category).toBe("mirrors");
    expect(referenceReducer({ open: true, search: "", category: "mirrors" }, { type: "clearCategory" }).category).toBeNull();
  });

  it("sets search, closes, and resets", () => {
    expect(referenceReducer(referenceInitial, { type: "setSearch", value: "z" }).search).toBe("z");
    expect(referenceReducer({ open: true, search: "z", category: null }, { type: "close" }).open).toBe(false);
    expect(referenceReducer({ open: true, search: "z", category: "x" }, { type: "reset" })).toEqual(referenceInitial);
  });
});

describe("dollhouseReducer", () => {
  it("opening via toggle clears product and search", () => {
    const next = dollhouseReducer({ open: false, product: "tub", search: "q" }, { type: "toggle" });
    expect(next).toEqual({ open: true, product: null, search: "" });
  });

  it("sets a product and clears product (resetting search)", () => {
    expect(dollhouseReducer(dollhouseInitial, { type: "setProduct", value: "vanity" }).product).toBe("vanity");
    expect(dollhouseReducer({ open: true, product: "vanity", search: "q" }, { type: "clearProduct" })).toEqual({ open: true, product: null, search: "" });
  });

  it("sets search, closes, and resets", () => {
    expect(dollhouseReducer(dollhouseInitial, { type: "setSearch", value: "z" }).search).toBe("z");
    expect(dollhouseReducer({ open: true, product: null, search: "z" }, { type: "close" }).open).toBe(false);
    expect(dollhouseReducer({ open: true, product: "x", search: "z" }, { type: "reset" })).toEqual(dollhouseInitial);
  });
});

describe("attributesReducer", () => {
  it("transitions through the fetch lifecycle", () => {
    const loading = attributesReducer(attributesInitial, { type: "fetchStart" });
    expect(loading).toEqual({ list: [], loading: true, error: null });
    const loaded = attributesReducer(loading, { type: "fetchSuccess", list: ["a", "b"] });
    expect(loaded.list).toEqual(["a", "b"]);
    expect(attributesReducer(loaded, { type: "fetchEnd" }).loading).toBe(false);
  });

  it("records and clears errors and clears the list", () => {
    const errored = attributesReducer({ list: ["a"], loading: true, error: null }, { type: "fetchError", error: "boom" });
    expect(errored).toEqual({ list: [], loading: true, error: "boom" });
    expect(attributesReducer(errored, { type: "clearError" }).error).toBeNull();
    expect(attributesReducer({ list: ["a"], loading: false, error: "e" }, { type: "clear" })).toEqual({ list: [], loading: false, error: null });
  });
});

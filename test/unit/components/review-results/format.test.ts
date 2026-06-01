import { describe, expect, it } from "vitest";
import { formatInt, formatMs, formatNumber, formatPercent, formatPixels } from "@/components/review-results/format";

const EM_DASH = "—";

describe("formatPercent", () => {
  it("scales to a percentage with default precision", () => {
    expect(formatPercent(0.1234)).toBe("12.3%");
    expect(formatPercent(0.5, 0)).toBe("50%");
  });

  it("renders the em-dash for nullish or non-finite values", () => {
    expect(formatPercent(null)).toBe(EM_DASH);
    expect(formatPercent(undefined)).toBe(EM_DASH);
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe(EM_DASH);
  });
});

describe("formatNumber", () => {
  it("fixes to the requested decimals", () => {
    expect(formatNumber(3.141_59)).toBe("3.14");
    expect(formatNumber(3.141_59, 1)).toBe("3.1");
  });

  it("renders the em-dash for nullish values", () => {
    expect(formatNumber(null)).toBe(EM_DASH);
  });
});

describe("formatPixels", () => {
  it("keeps one decimal for small magnitudes and rounds larger ones", () => {
    expect(formatPixels(4.25)).toBe("4.3 px");
    expect(formatPixels(120.6)).toBe("121 px");
  });

  it("renders the em-dash for nullish values", () => {
    expect(formatPixels(undefined)).toBe(EM_DASH);
  });
});

describe("formatInt", () => {
  it("rounds and localizes", () => {
    expect(formatInt(1234.6)).toBe("1,235");
  });

  it("renders the em-dash for NaN", () => {
    expect(formatInt(Number.NaN)).toBe(EM_DASH);
  });
});

describe("formatMs", () => {
  it("handles sub-ms, ms, seconds, and large seconds", () => {
    expect(formatMs(0.5)).toBe("<1 ms");
    expect(formatMs(250)).toBe("250 ms");
    expect(formatMs(2500)).toBe("2.50 s");
    expect(formatMs(20_000)).toBe("20.0 s");
  });

  it("renders the em-dash for non-finite input", () => {
    expect(formatMs(Number.NaN)).toBe(EM_DASH);
  });
});

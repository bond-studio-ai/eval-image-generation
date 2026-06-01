// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDollhouseOverrides } from "@/app/dollhouse-renders/new/_components/use-dollhouse-overrides";

describe("useDollhouseOverrides", () => {
  it("starts empty with no content", () => {
    const { result } = renderHook(() => useDollhouseOverrides());
    expect(result.current.designMaterialsInput).toBe("");
    expect(result.current.hasContent).toBe(false);
    expect(result.current.designResult.provided).toBe(false);
  });

  it("parses a valid design materials override", () => {
    const { result } = renderHook(() => useDollhouseOverrides());
    act(() => {
      result.current.setDesignMaterialsInput(JSON.stringify({ id: "d1", objects: {}, surfaces: {} }));
    });
    expect(result.current.designResult.provided).toBe(true);
    expect(result.current.designResult.value).toMatchObject({ id: "d1" });
    expect(result.current.hasContent).toBe(true);
  });

  it("surfaces a parse error for invalid design JSON", () => {
    const { result } = renderHook(() => useDollhouseOverrides());
    act(() => {
      result.current.setDesignMaterialsInput("{ not json");
    });
    expect(result.current.designResult.error).toBeTruthy();
    expect(result.current.designResult.value).toBeNull();
  });

  it("parses room data and resets both inputs", () => {
    const { result } = renderHook(() => useDollhouseOverrides());
    act(() => {
      result.current.setRoomDataInput(JSON.stringify({ scan: {} }));
    });
    expect(result.current.roomResult.value).toEqual({ scan: {} });
    act(() => {
      result.current.reset();
    });
    expect(result.current.roomDataInput).toBe("");
    expect(result.current.designMaterialsInput).toBe("");
    expect(result.current.hasContent).toBe(false);
  });
});

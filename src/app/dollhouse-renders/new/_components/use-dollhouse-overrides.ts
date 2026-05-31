"use client";

import { useCallback, useMemo, useState } from "react";
import type { UnitySlimDesignMaterials } from "@/lib/dollhouse-renders";
import { type OverrideParseResult, parseDesignMaterialsOverride, parseRoomDataOverride } from "./build-request";

export interface DollhouseOverridesController {
  designMaterialsInput: string;
  setDesignMaterialsInput: (next: string) => void;
  roomDataInput: string;
  setRoomDataInput: (next: string) => void;
  designResult: OverrideParseResult<UnitySlimDesignMaterials>;
  roomResult: OverrideParseResult<Record<string, unknown>>;
  hasContent: boolean;
  reset: () => void;
}

/**
 * Encapsulates the two paste-override textareas (designMaterials, roomData),
 * their raw string state, and the derived parse results. The hook is the
 * single source of truth so the override panel UI and the wizard model both
 * read from the same place — see the prior version where eight props
 * threaded through `ProjectDataSection` just to plumb this state around.
 */
export function useDollhouseOverrides(): DollhouseOverridesController {
  const [designMaterialsInput, setDesignMaterialsInput] = useState("");
  const [roomDataInput, setRoomDataInput] = useState("");

  const designResult = useMemo(() => parseDesignMaterialsOverride(designMaterialsInput), [designMaterialsInput]);
  const roomResult = useMemo(() => parseRoomDataOverride(roomDataInput), [roomDataInput]);

  const reset = useCallback(() => {
    setDesignMaterialsInput("");
    setRoomDataInput("");
  }, []);

  const hasContent = designResult.provided || roomResult.provided;

  return {
    designMaterialsInput,
    setDesignMaterialsInput,
    roomDataInput,
    setRoomDataInput,
    designResult,
    roomResult,
    hasContent,
    reset
  };
}

/** Shared types used across both server and client components. */

export interface PromptVersionListItem {
  id: string;
  name: string | null;
  systemPrompt: string;
  userPrompt: string;
  stats?: { generationCount: number };
}

export interface StrategyListItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  stepCount: number;
  runCount: number;
}

export interface InputPresetListItem {
  id: string;
  name: string | null;
  description: string | null;
  dollhouseView: string | null;
  realPhoto: string | null;
  moodBoard: string | null;
  createdAt: string;
  imageCount: number;
  stats?: { generationCount: number };
}

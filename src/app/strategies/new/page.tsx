import type { Metadata } from "next";
import { StrategyBuilder } from "@/components/strategy-builder";
import { fetchInputPresets, fetchPromptVersions, fetchStrategyModelCatalog } from "@/lib/service-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New Strategy",
  description: "Create a multi-step generation strategy."
};

export default async function NewStrategyPage() {
  const [promptVersions, inputPresets, modelCatalog] = await Promise.all([fetchPromptVersions(100), fetchInputPresets(100), fetchStrategyModelCatalog()]);

  return <StrategyBuilder promptVersions={promptVersions} inputPresets={inputPresets} modelCatalog={modelCatalog} />;
}

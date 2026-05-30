import { ExpandableImage } from "@/components/expandable-image";
import { ConfigDiff } from "./config-diff";
import { DiffText } from "./diff-text";
import { ImageCompare } from "./image-compare";
import { SectionHeader } from "./section-header";
import type { StepResult } from "./types";

export function StepComparison({ ls, rs, stepName }: { ls: StepResult | null; rs: StepResult | null; stepName: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-sm font-semibold text-gray-800">{stepName}</span>
      </div>

      <div className="space-y-4 p-4">
        {/* Config comparison */}
        <div>
          <SectionHeader title="Request Config" />
          <div className="mt-2">
            <ConfigDiff left={ls?.requestConfig ?? null} right={rs?.requestConfig ?? null} />
          </div>
        </div>

        {/* System prompt comparison */}
        {(ls?.processedSystemPrompt || rs?.processedSystemPrompt) && (
          <div>
            <SectionHeader title="System Prompt" />
            <div className="mt-2">
              <DiffText left={ls?.processedSystemPrompt ?? ""} right={rs?.processedSystemPrompt ?? ""} />
            </div>
          </div>
        )}

        {/* User prompt comparison */}
        {(ls?.processedUserPrompt || rs?.processedUserPrompt) && (
          <div>
            <SectionHeader title="User Prompt" />
            <div className="mt-2">
              <DiffText left={ls?.processedUserPrompt ?? ""} right={rs?.processedUserPrompt ?? ""} />
            </div>
          </div>
        )}

        {/* Input images */}
        {(ls?.inputImages || rs?.inputImages) && (
          <div>
            <SectionHeader title="Input Images" />
            <div className="mt-2">
              <ImageCompare left={ls?.inputImages ?? null} right={rs?.inputImages ?? null} />
            </div>
          </div>
        )}

        {/* Output images */}
        {(ls?.outputUrl || rs?.outputUrl) && (
          <div>
            <SectionHeader title="Output" />
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                {ls?.outputUrl ? (
                  <ExpandableImage src={ls.outputUrl} alt="Left output" wrapperClassName="relative block h-64 w-full rounded-lg border border-gray-200 bg-gray-50" />
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400">No output</div>
                )}
                {ls?.executionTime && <p className="mt-1 text-[10px] text-gray-500">{(ls.executionTime / 1000).toFixed(1)}s</p>}
              </div>
              <div>
                {rs?.outputUrl ? (
                  <ExpandableImage src={rs.outputUrl} alt="Right output" wrapperClassName="relative block h-64 w-full rounded-lg border border-gray-200 bg-gray-50" />
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400">No output</div>
                )}
                {rs?.executionTime && <p className="mt-1 text-[10px] text-gray-500">{(rs.executionTime / 1000).toFixed(1)}s</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PromptsSection({ systemPrompt, userPrompt }: { systemPrompt: string | undefined; userPrompt: string | undefined }) {
  return (
    <div id="section-prompts" className="mt-8 grid scroll-mt-6 grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-gray-900 uppercase">System Prompt</h2>
        <pre className="mt-3 text-sm whitespace-pre-wrap text-gray-700">{systemPrompt}</pre>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-gray-900 uppercase">User Prompt</h2>
        <pre className="mt-3 text-sm whitespace-pre-wrap text-gray-700">{userPrompt}</pre>
      </div>
    </div>
  );
}

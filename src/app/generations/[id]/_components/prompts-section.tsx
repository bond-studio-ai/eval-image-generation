export function PromptsSection({ systemPrompt, userPrompt }: { systemPrompt: string | undefined; userPrompt: string | undefined }) {
  return (
    <div id="section-prompts" className="mt-8 grid scroll-mt-6 grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="border-border bg-surface rounded-lg border p-6 shadow-xs">
        <h2 className="text-text-primary text-body font-semibold uppercase">System Prompt</h2>
        <pre className="text-text-secondary text-body mt-3 whitespace-pre-wrap">{systemPrompt}</pre>
      </div>
      <div className="border-border bg-surface rounded-lg border p-6 shadow-xs">
        <h2 className="text-text-primary text-body font-semibold uppercase">User Prompt</h2>
        <pre className="text-text-secondary text-body mt-3 whitespace-pre-wrap">{userPrompt}</pre>
      </div>
    </div>
  );
}

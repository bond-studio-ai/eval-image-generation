"use client";

import { useRouter } from "next/navigation";
import { useReducer, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { PromptTemplateEditor } from "@/components/prompt-template-editor";
import { ErrorCard, ResourceFormHeader } from "@/components/resource-form-header";
import { TwoPaneSplit } from "@/components/two-pane-split";
import { Button } from "@/components/ui/button";
import { serviceUrl } from "@/lib/api-base";
import { parseOrFallback } from "@/lib/api/parse";
import { mutationResponseSchema } from "@/lib/api/schemas";

interface FormState {
  name: string;
  description: string;
  systemPrompt: string;
  userPrompt: string;
}

type FormAction =
  | {
      [K in keyof FormState]: { type: "setField"; field: K; value: FormState[K] };
    }[keyof FormState]
  | { type: "reset"; value: FormState };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "reset": {
      return action.value;
    }
    case "setField": {
      return { ...state, [action.field]: action.value };
    }
  }
}

const initialFormState: FormState = {
  name: "",
  description: "",
  systemPrompt: "",
  userPrompt: ""
};

export function NewPromptVersionForm() {
  const router = useRouter();

  const [form, dispatch] = useReducer(formReducer, initialFormState);
  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    dispatch({ type: "setField", field, value });
  };

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = form.systemPrompt.trim() && form.userPrompt.trim();

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch(serviceUrl("prompt-versions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || undefined,
          description: form.description || undefined,
          system_prompt: form.systemPrompt,
          user_prompt: form.userPrompt
        })
      });

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error(res.redirected || res.status === 401 ? "Session expired. Please refresh the page." : `Unexpected response from server (${res.status}). Please try again.`);
      }

      const json = parseOrFallback(mutationResponseSchema, await res.json(), {}, "prompt version create");

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create");
      }

      const newId = json.data?.id;
      if (newId) router.push(`/prompt-versions/${newId}`);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Something went wrong");
      setCreating(false);
    }
  }

  const editableInput = "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-body transition-colors hover:border-border-strong focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1";

  return (
    <div className="flex flex-col">
      <PageHeader
        backHref="/prompt-versions"
        backLabel="Back to Prompt Versions"
        title=""
        actions={
          <Button onClick={handleCreate} disabled={!canCreate || creating} loading={creating}>
            {creating ? "Creating..." : "Create Prompt Version"}
          </Button>
        }
      />

      <div className="mt-6">
        <ResourceFormHeader
          name={form.name}
          onNameChange={(value) => {
            setField("name", value);
          }}
          namePlaceholder="e.g. Bathroom generation v2"
          nameRequired={false}
          description={form.description}
          onDescriptionChange={(value) => {
            setField("description", value);
          }}
        />
      </div>

      {error && (
        <div className="mt-4">
          <ErrorCard message={error} />
        </div>
      )}

      {/* Stats placeholder — mirrors the detail page structure */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {["Generations", "Rated", "Avg Rating", "Unrated"].map((label) => (
          <div key={label} className="border-border bg-surface rounded-lg border p-4 shadow-xs">
            <p className="text-text-secondary text-body font-medium">{label}</p>
            <p className="text-text-primary text-display mt-1">-</p>
          </div>
        ))}
      </div>

      {/* Prompts */}
      <TwoPaneSplit
        className="mt-8"
        left={
          <div className="border-border bg-surface flex h-full min-w-0 flex-col rounded-lg border p-6 shadow-xs">
            <h2 className="text-text-primary text-body shrink-0 font-semibold uppercase">
              System Prompt <span className="text-danger-500">*</span>
            </h2>
            <div className="mt-3 flex min-h-0 flex-1 flex-col">
              <PromptTemplateEditor
                value={form.systemPrompt}
                onChange={(value) => {
                  setField("systemPrompt", value);
                }}
                placeholder="System prompt. Use {{products.vanity.name}}, {{#if products.vanity}}...{{/if}}"
                className={`font-mono ${editableInput}`}
                fillHeight
              />
            </div>
          </div>
        }
        right={
          <div className="border-border bg-surface flex h-full min-w-0 flex-col rounded-lg border p-6 shadow-xs">
            <h2 className="text-text-primary text-body shrink-0 font-semibold uppercase">
              User Prompt <span className="text-danger-500">*</span>
            </h2>
            <div className="mt-3 flex min-h-0 flex-1 flex-col">
              <PromptTemplateEditor
                value={form.userPrompt}
                onChange={(value) => {
                  setField("userPrompt", value);
                }}
                placeholder="Handlebars template: {{products.vanity.name}}, {{#if products.vanity}}...{{/if}}"
                className={`font-mono ${editableInput}`}
                fillHeight
              />
            </div>
          </div>
        }
      />

      {/* Generations placeholder */}
      <div className="mt-8">
        <h2 className="text-text-primary text-h3">Generations</h2>
        <p className="text-text-secondary text-body mt-4">No generations yet. Create this prompt version first, then generate images.</p>
      </div>
    </div>
  );
}

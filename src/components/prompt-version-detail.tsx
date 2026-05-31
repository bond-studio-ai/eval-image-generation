"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useReducer, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ErrorCard, ResourceFormHeader } from "@/components/resource-form-header";
import { Button, LinkButton } from "@/components/ui/button";
import { CopyIcon, LockIcon } from "@/components/ui/icons";
import { serviceUrl } from "@/lib/api-base";
import { DeletePromptVersionButton } from "./delete-prompt-version-button";
import { PromptTemplateEditor } from "./prompt-template-editor";
import { RatingBadge } from "./rating-badge";
import { TwoPaneSplit } from "./two-pane-split";

// ------------------------------------
// Types
// ------------------------------------

interface SerializedGeneration {
  id: string;
  sceneAccuracyRating: string | null;
  productAccuracyRating: string | null;
  createdAt: string;
  inputImageCount: number;
  outputImageCount: number;
}

interface PromptVersionData {
  id: string;
  name: string | null;
  description: string | null;
  systemPrompt: string;
  userPrompt: string;
  deletedAt: string | null;
}

interface Stats {
  generationCount: number;
  ratedCount: number;
  avgRating: string | null;
  unratedCount: number;
}

interface PromptVersionDetailProps {
  data: PromptVersionData;
  generations: SerializedGeneration[];
  stats: Stats;
}

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

// ------------------------------------
// Component
// ------------------------------------

export function PromptVersionDetail({ data, generations, stats }: PromptVersionDetailProps) {
  const router = useRouter();
  const isEditable = generations.length === 0 && !data.deletedAt;

  // Baseline values (updated on save) — must be state so isDirty recalculates
  const [baseline, setBaseline] = useState({
    name: data.name ?? "",
    description: data.description ?? "",
    systemPrompt: data.systemPrompt,
    userPrompt: data.userPrompt
  });

  // Editable field state
  const [form, dispatch] = useReducer(formReducer, {
    name: baseline.name,
    description: baseline.description,
    systemPrompt: baseline.systemPrompt,
    userPrompt: baseline.userPrompt
  });
  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    dispatch({ type: "setField", field, value });
  };

  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    if (!isEditable) return false;
    return form.name !== baseline.name || form.description !== baseline.description || form.systemPrompt !== baseline.systemPrompt || form.userPrompt !== baseline.userPrompt;
  }, [isEditable, baseline, form]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(serviceUrl(`prompt-versions/${data.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || undefined,
          description: form.description || undefined,
          system_prompt: form.systemPrompt,
          user_prompt: form.userPrompt
        })
      });

      if (!res.ok) {
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const errorJson = await res.json();
          throw new Error(errorJson.error?.message || "Failed to save");
        }
        throw new Error(res.status === 401 || res.redirected ? "Session expired. Please refresh the page." : `Failed to save (${res.status})`);
      }

      // Update baseline so isDirty resets
      setBaseline({
        name: form.name,
        description: form.description,
        systemPrompt: form.systemPrompt,
        userPrompt: form.userPrompt
      });
      router.refresh();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    dispatch({
      type: "reset",
      value: {
        name: baseline.name,
        description: baseline.description,
        systemPrompt: baseline.systemPrompt,
        userPrompt: baseline.userPrompt
      }
    });
    setError(null);
  }

  async function handleClone() {
    setCloning(true);
    setError(null);
    try {
      const res = await fetch(serviceUrl("prompt-versions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Copy of ${data.name || "Untitled"}`,
          description: data.description || undefined,
          system_prompt: data.systemPrompt,
          user_prompt: data.userPrompt
        })
      });
      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error?.message || "Failed to clone");
      }
      const json = await res.json();
      const newId = json.data?.id;
      if (newId) router.push(`/prompt-versions/${newId}`);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Clone failed");
    } finally {
      setCloning(false);
    }
  }

  // Shared classes for editable inline fields
  const editableInput = "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-body transition-colors hover:border-border-strong focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1";

  return (
    <div className="flex flex-col">
      <PageHeader
        backHref="/prompt-versions"
        backLabel="Back to Prompt Versions"
        title={isEditable ? "" : data.name || "Untitled Prompt Version"}
        subtitle={isEditable ? undefined : (data.description ?? undefined)}
        actions={
          <>
            {isDirty && (
              <>
                <Button variant="secondary" onClick={handleDiscard} disabled={saving}>
                  Discard
                </Button>
                <Button onClick={handleSave} disabled={saving} loading={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </>
            )}
            {generations.length > 0 && !data.deletedAt && (
              <span className="bg-surface-sunken text-text-secondary ring-border text-caption inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium ring-1 ring-inset">
                <LockIcon className="size-3.5" />
                Locked
              </span>
            )}
            <Button variant="secondary" onClick={handleClone} loading={cloning} iconLeft={<CopyIcon className="size-4" />}>
              {cloning ? "Cloning…" : "Clone"}
            </Button>
            {isEditable && <DeletePromptVersionButton id={data.id} name={form.name || "Untitled Prompt Version"} />}
            {!data.deletedAt && <LinkButton href="/executions">New Run</LinkButton>}
            {data.deletedAt && <span className="bg-danger-50 text-danger-700 ring-danger-600/20 text-body inline-flex items-center rounded-full px-3 py-1 font-medium ring-1 ring-inset">Deleted</span>}
          </>
        }
      />

      {isEditable && (
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
      )}

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="border-border bg-surface rounded-lg border p-4 shadow-xs">
          <p className="text-text-secondary text-body font-medium">Generations</p>
          <p className="text-text-primary text-display mt-1">{stats.generationCount}</p>
        </div>
        <div className="border-border bg-surface rounded-lg border p-4 shadow-xs">
          <p className="text-text-secondary text-body font-medium">Rated</p>
          <p className="text-text-primary text-display mt-1">{stats.ratedCount}</p>
        </div>
        <div className="border-border bg-surface rounded-lg border p-4 shadow-xs">
          <p className="text-text-secondary text-body font-medium">Avg Rating</p>
          <p className="text-text-primary text-display mt-1">{stats.avgRating ?? "-"}</p>
        </div>
        <div className="border-border bg-surface rounded-lg border p-4 shadow-xs">
          <p className="text-text-secondary text-body font-medium">Unrated</p>
          <p className="text-warning-600 text-display mt-1">{stats.unratedCount}</p>
        </div>
      </div>

      {/* Prompts */}
      <TwoPaneSplit
        className="mt-8"
        left={
          <div className="border-border bg-surface flex h-full min-w-0 flex-col rounded-lg border p-6 shadow-xs">
            <h2 className="text-text-primary text-body shrink-0 font-semibold uppercase">System Prompt</h2>
            {isEditable ? (
              <div className="mt-3 flex min-h-0 flex-1 flex-col">
                <PromptTemplateEditor
                  value={form.systemPrompt}
                  onChange={(value) => {
                    setField("systemPrompt", value);
                  }}
                  placeholder="Enter the system prompt. Use {{products.vanity.name}}, {{#if products.vanity}}...{{/if}}"
                  className={`font-mono ${editableInput}`}
                  fillHeight
                />
              </div>
            ) : (
              <pre className="text-text-secondary text-body mt-3 min-h-0 flex-1 overflow-auto whitespace-pre-wrap">{data.systemPrompt}</pre>
            )}
          </div>
        }
        right={
          <div className="border-border bg-surface flex h-full min-w-0 flex-col rounded-lg border p-6 shadow-xs">
            <h2 className="text-text-primary text-body shrink-0 font-semibold uppercase">User Prompt</h2>
            {isEditable ? (
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
            ) : (
              <pre className="text-text-secondary text-body mt-3 min-h-0 flex-1 overflow-auto whitespace-pre-wrap">{data.userPrompt}</pre>
            )}
          </div>
        }
      />

      {/* Generations List */}
      <div className="mt-8">
        <h2 className="text-text-primary text-h3">Generations</h2>
        {generations.length === 0 ? (
          <p className="text-text-secondary text-body mt-4">No generations yet for this prompt version.</p>
        ) : (
          <div className="border-border bg-surface mt-4 overflow-hidden rounded-lg border shadow-xs">
            <table className="divide-border min-w-full divide-y">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="text-text-secondary text-caption px-6 py-3 text-left font-medium tracking-wider uppercase">Rating</th>
                  <th className="text-text-secondary text-caption px-6 py-3 text-left font-medium tracking-wider uppercase">Inputs</th>
                  <th className="text-text-secondary text-caption px-6 py-3 text-left font-medium tracking-wider uppercase">Outputs</th>
                  <th className="text-text-secondary text-caption px-6 py-3 text-left font-medium tracking-wider uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-border bg-surface divide-y">
                {generations.map((gen) => (
                  <tr key={gen.id} className="hover:bg-surface-muted">
                    <td className="text-body px-6 py-4 whitespace-nowrap">
                      <Link href={`/generations/${gen.id}`}>
                        <div className="flex gap-1">
                          <RatingBadge rating={gen.sceneAccuracyRating} label="Scene" />
                          <RatingBadge rating={gen.productAccuracyRating} label="Product" />
                        </div>
                      </Link>
                    </td>
                    <td className="text-text-secondary text-body px-6 py-4 whitespace-nowrap">{gen.inputImageCount}</td>
                    <td className="text-text-secondary text-body px-6 py-4 whitespace-nowrap">{gen.outputImageCount}</td>
                    <td className="text-text-secondary text-body px-6 py-4 whitespace-nowrap">{new Date(gen.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <ErrorCard message={error} />
        </div>
      )}
    </div>
  );
}

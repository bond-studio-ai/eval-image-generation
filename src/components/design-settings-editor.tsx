'use client';

import { useCallback, useMemo, useState } from 'react';

// ── Schema definition ──────────────────────────────────────────────

type FieldType = 'uuid' | 'string' | 'boolean';

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
}

interface GroupDef {
  id: string;
  label: string;
  fields: FieldDef[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuid(key: string, label: string): FieldDef {
  return { key, label, type: 'uuid', placeholder: '00000000-0000-4000-8000-000000000000' };
}
function str(key: string, label: string, placeholder?: string): FieldDef {
  return { key, label, type: 'string', placeholder };
}
function bool(key: string, label: string): FieldDef {
  return { key, label, type: 'boolean' };
}

const GROUPS: GroupDef[] = [
  {
    id: 'general',
    label: 'General',
    fields: [
      uuid('paint', 'Paint'),
      uuid('wallpaper', 'Wallpaper'),
      str('wallpaperPlacement', 'Wallpaper Placement', 'e.g. AccentWall'),
    ],
  },
  {
    id: 'floor',
    label: 'Floor',
    fields: [
      uuid('floorTile', 'Floor Tile'),
      str('floorTilePattern', 'Floor Tile Pattern', 'e.g. Herringbone'),
    ],
  },
  {
    id: 'wall',
    label: 'Wall',
    fields: [
      uuid('wallTile', 'Wall Tile'),
      str('wallTilePlacement', 'Wall Tile Placement', 'e.g. VanityHalfWall'),
      str('wallTilePattern', 'Wall Tile Pattern', 'e.g. Stacked'),
    ],
  },
  {
    id: 'vanity',
    label: 'Vanity & Mirror',
    fields: [
      uuid('vanity', 'Vanity'),
      uuid('faucet', 'Faucet'),
      uuid('mirror', 'Mirror'),
      str('mirrorPlacement', 'Mirror Placement'),
    ],
  },
  {
    id: 'lighting',
    label: 'Lighting',
    fields: [
      uuid('lighting', 'Lighting'),
      str('lightingPlacement', 'Lighting Placement'),
    ],
  },
  {
    id: 'shower',
    label: 'Shower',
    fields: [
      uuid('showerWallTile', 'Shower Wall Tile'),
      str('showerWallTilePattern', 'Shower Wall Tile Pattern', 'e.g. Stacked'),
      uuid('showerShortWallTile', 'Shower Short Wall Tile'),
      str('showerShortWallTilePattern', 'Short Wall Tile Pattern'),
      uuid('showerFloorTile', 'Shower Floor Tile'),
      str('showerFloorTilePattern', 'Shower Floor Tile Pattern'),
      uuid('curbTile', 'Curb Tile'),
      str('curbTilePattern', 'Curb Tile Pattern'),
      uuid('nicheTile', 'Niche Tile'),
      str('nicheTilePattern', 'Niche Tile Pattern'),
      uuid('showerSystem', 'Shower System'),
      uuid('showerGlass', 'Shower Glass'),
      bool('isShowerGlassVisible', 'Shower Glass Visible'),
    ],
  },
  {
    id: 'tub',
    label: 'Tub',
    fields: [
      uuid('tub', 'Tub'),
      uuid('tubDoor', 'Tub Door'),
      bool('isTubDoorVisible', 'Tub Door Visible'),
      uuid('tubFiller', 'Tub Filler'),
    ],
  },
  {
    id: 'accessories',
    label: 'Accessories',
    fields: [
      uuid('toilet', 'Toilet'),
      uuid('toiletPaperHolder', 'Toilet Paper Holder'),
      uuid('robeHook', 'Robe Hook'),
      uuid('towelBar', 'Towel Bar'),
      uuid('towelRing', 'Towel Ring'),
      uuid('shelves', 'Shelves'),
    ],
  },
];

const ALL_FIELD_KEYS = new Set(GROUPS.flatMap((g) => g.fields.map((f) => f.key)));

// ── Component ──────────────────────────────────────────────────────

export type DesignSettingsValue = Record<string, unknown> | null;

interface DesignSettingsEditorProps {
  value: DesignSettingsValue;
  onChange: (value: DesignSettingsValue) => void;
}

function isNonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.length > 0;
  if (typeof v === 'boolean') return true;
  return false;
}

export function designSettingsHasValues(v: DesignSettingsValue): boolean {
  if (!v) return false;
  return Object.values(v).some(isNonEmpty);
}

export function DesignSettingsEditor({ value, onChange }: DesignSettingsEditorProps) {
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    if (!value) return new Set<string>();
    const open = new Set<string>();
    for (const g of GROUPS) {
      if (g.fields.some((f) => isNonEmpty(value[f.key]))) {
        open.add(g.id);
      }
    }
    return open;
  });

  const data = value ?? {};

  const setField = useCallback(
    (key: string, v: unknown) => {
      const next = { ...data };
      if (v == null || v === '' || v === false) {
        delete next[key];
      } else {
        next[key] = v;
      }
      onChange(Object.keys(next).length === 0 ? null : next);
    },
    [data, onChange],
  );

  const filledCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of GROUPS) {
      m.set(g.id, g.fields.filter((f) => isNonEmpty(data[f.key])).length);
    }
    return m;
  }, [data]);

  const totalFilled = useMemo(() => {
    let n = 0;
    filledCount.forEach((c) => (n += c));
    return n;
  }, [filledCount]);

  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    onChange(null);
  }, [onChange]);

  const clearGroup = useCallback(
    (groupId: string) => {
      const group = GROUPS.find((g) => g.id === groupId);
      if (!group) return;
      const next = { ...data };
      for (const f of group.fields) delete next[f.key];
      onChange(Object.keys(next).length === 0 ? null : next);
    },
    [data, onChange],
  );

  const switchToJson = useCallback(() => {
    const obj = value ?? {};
    setJsonText(Object.keys(obj).length > 0 ? JSON.stringify(obj, null, 2) : '{}');
    setJsonError(null);
    setMode('json');
  }, [value]);

  const switchToForm = useCallback(() => {
    const trimmed = jsonText.trim();
    if (trimmed === '' || trimmed === '{}') {
      onChange(null);
      setMode('form');
      return;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Must be a JSON object.');
        return;
      }
      onChange(parsed as Record<string, unknown>);
      setJsonError(null);
      setMode('form');
    } catch {
      setJsonError('Invalid JSON.');
    }
  }, [jsonText, onChange]);

  const applyJson = useCallback(() => {
    const trimmed = jsonText.trim();
    if (trimmed === '' || trimmed === '{}') {
      onChange(null);
      setJsonError(null);
      return;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Must be a JSON object.');
        return;
      }
      onChange(parsed as Record<string, unknown>);
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON.');
    }
  }, [jsonText, onChange]);

  const extraKeys = useMemo(() => {
    return Object.keys(data).filter((k) => !ALL_FIELD_KEYS.has(k) && isNonEmpty(data[k]));
  }, [data]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase text-gray-900">Design Settings</h2>
          {totalFilled > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
              {totalFilled} field{totalFilled !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalFilled > 0 && mode === 'form' && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              Clear all
            </button>
          )}
          <div className="flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
            <button
              type="button"
              onClick={mode === 'json' ? switchToForm : undefined}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === 'form'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Form
            </button>
            <button
              type="button"
              onClick={mode === 'form' ? switchToJson : undefined}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === 'json'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      {mode === 'form' ? (
        <div className="divide-y divide-gray-100">
          {totalFilled === 0 && expandedGroups.size === 0 && (
            <p className="px-5 py-6 text-center text-sm text-gray-400">
              Click a section below to add design properties.
            </p>
          )}
          {GROUPS.map((group) => {
            const count = filledCount.get(group.id) ?? 0;
            const isOpen = expandedGroups.has(group.id);

            return (
              <div key={group.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50"
                >
                  <svg
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                  <span className="text-sm font-medium text-gray-800">{group.label}</span>
                  {count > 0 && (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200">
                      {count}
                    </span>
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-gray-50 bg-gray-50/50 px-5 pb-4 pt-3">
                    <div className="space-y-3">
                      {group.fields.map((field) => (
                        <FieldInput
                          key={field.key}
                          field={field}
                          value={data[field.key]}
                          onChange={(v) => setField(field.key, v)}
                        />
                      ))}
                    </div>
                    {count > 0 && (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => clearGroup(group.id)}
                          className="rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          Clear {group.label.toLowerCase()}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {extraKeys.length > 0 && (
            <div className="px-5 py-3">
              <p className="mb-2 text-xs font-medium text-amber-700">
                Additional fields (not in schema — switch to JSON to edit):
              </p>
              <div className="space-y-1">
                {extraKeys.map((k) => (
                  <div key={k} className="flex items-center justify-between rounded bg-amber-50 px-3 py-1.5">
                    <span className="font-mono text-xs text-amber-800">{k}</span>
                    <span className="font-mono text-xs text-amber-600">{JSON.stringify(data[k])}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5">
          <p className="mb-2 text-xs text-gray-500">
            Raw JSON with camelCase keys. Switch back to Form to use the structured editor.
          </p>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setJsonError(null);
            }}
            spellCheck={false}
            rows={16}
            className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-900 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder={'{\n  "vanity": "00000000-0000-4000-8000-000000000000"\n}'}
          />
          {jsonError && <p className="mt-2 text-xs text-red-600">{jsonError}</p>}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={applyJson}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Apply JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Field renderers ────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === 'boolean') {
    return <BooleanField field={field} value={value} onChange={onChange} />;
  }
  return <TextFieldInput field={field} value={value} onChange={onChange} />;
}

function TextFieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const strVal = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(false);
  const isUuid = field.type === 'uuid';
  const hasError = touched && isUuid && strVal.length > 0 && !UUID_RE.test(strVal);

  return (
    <div>
      <label className="mb-1 flex items-center gap-2">
        <span className="text-xs font-medium text-gray-700">{field.label}</span>
        {isUuid && (
          <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 ring-1 ring-inset ring-violet-200">
            UUID
          </span>
        )}
      </label>
      <div className="relative">
        <input
          type="text"
          value={strVal}
          onChange={(e) => onChange(e.target.value || null)}
          onBlur={() => setTouched(true)}
          placeholder={field.placeholder}
          className={`block w-full rounded-md border px-3 py-1.5 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1 ${
            isUuid ? 'font-mono text-xs' : ''
          } ${
            hasError
              ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'
          }`}
        />
        {strVal && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {hasError && (
        <p className="mt-1 text-xs text-red-500">Not a valid UUID format</p>
      )}
    </div>
  );
}

function BooleanField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const boolVal = typeof value === 'boolean' ? value : null;

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs font-medium text-gray-700">{field.label}</span>
      <div className="flex items-center gap-2">
        {boolVal !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            clear
          </button>
        )}
        <ThreeWayToggle value={boolVal} onChange={onChange} />
      </div>
    </div>
  );
}

function ThreeWayToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <div className="flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
          value === null ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        —
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
          value === true ? 'bg-green-100 text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
          value === false ? 'bg-red-100 text-red-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        No
      </button>
    </div>
  );
}

// ── Detail display ─────────────────────────────────────────────────

interface DesignSettingsDisplayProps {
  value: Record<string, unknown>;
}

const FIELD_LABELS: Map<string, { label: string; type: FieldType }> = new Map();
for (const g of GROUPS) {
  for (const f of g.fields) {
    FIELD_LABELS.set(f.key, { label: f.label, type: f.type });
  }
}

export function DesignSettingsDisplay({ value }: DesignSettingsDisplayProps) {
  const populated = GROUPS.map((g) => ({
    ...g,
    fields: g.fields.filter((f) => isNonEmpty(value[f.key])),
  })).filter((g) => g.fields.length > 0);

  const extraKeys = Object.keys(value).filter((k) => !ALL_FIELD_KEYS.has(k) && isNonEmpty(value[k]));

  if (populated.length === 0 && extraKeys.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase text-gray-900">Design Settings</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {populated.map((g) => (
          <div key={g.id} className="px-5 py-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{g.label}</h3>
            <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
              {g.fields.map((f) => (
                <DisplayField key={f.key} field={f} value={value[f.key]} />
              ))}
            </div>
          </div>
        ))}
        {extraKeys.length > 0 && (
          <div className="px-5 py-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">Other</h3>
            <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
              {extraKeys.map((k) => (
                <div key={k} className="flex items-center justify-between rounded py-0.5">
                  <span className="text-xs text-gray-600">{k}</span>
                  <span className="font-mono text-xs text-gray-800">{JSON.stringify(value[k])}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DisplayField({ field, value }: { field: FieldDef; value: unknown }) {
  if (field.type === 'boolean') {
    const b = value as boolean;
    return (
      <div className="flex items-center justify-between rounded py-0.5">
        <span className="text-xs text-gray-600">{field.label}</span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            b ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200' : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200'
          }`}
        >
          {b ? 'Yes' : 'No'}
        </span>
      </div>
    );
  }

  const strVal = String(value);
  const isUuid = field.type === 'uuid';

  return (
    <div className="flex items-center justify-between gap-2 rounded py-0.5">
      <span className="shrink-0 text-xs text-gray-600">{field.label}</span>
      {isUuid ? (
        <code className="truncate rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] text-violet-700 ring-1 ring-inset ring-violet-200">
          {strVal}
        </code>
      ) : (
        <span className="truncate font-mono text-xs text-gray-800">{strVal}</span>
      )}
    </div>
  );
}

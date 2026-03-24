'use client';

import { useCallback, useMemo, useState } from 'react';

// ── Field definitions ──────────────────────────────────────────────

type FieldType = 'select' | 'boolean';

interface SelectFieldDef {
  key: string;
  label: string;
  type: 'select';
  options: { value: string; label: string }[];
}

interface BooleanFieldDef {
  key: string;
  label: string;
  type: 'boolean';
}

type FieldDef = SelectFieldDef | BooleanFieldDef;

const FIELDS: FieldDef[] = [
  {
    key: 'wallpaperPlacement',
    label: 'Wallpaper Placement',
    type: 'select',
    options: [
      { value: 'None', label: 'None' },
      { value: 'AllWalls', label: 'All Walls' },
      { value: 'VanityWall', label: 'Vanity Wall' },
    ],
  },
  {
    key: 'wallTilePlacement',
    label: 'Wall Tile Placement',
    type: 'select',
    options: [
      { value: 'None', label: 'None' },
      { value: 'FullWall', label: 'Full Wall' },
      { value: 'HalfWall', label: 'Half Wall' },
      { value: 'VanityFullWall', label: 'Vanity Full Wall' },
      { value: 'VanityHalfWall', label: 'Vanity Half Wall' },
    ],
  },
  {
    key: 'lightingPlacement',
    label: 'Lighting Placement',
    type: 'select',
    options: [
      { value: 'Above', label: 'Above' },
      { value: 'Side', label: 'Side' },
      { value: 'Ceiling', label: 'Ceiling' },
    ],
  },
  {
    key: 'mirrorPlacement',
    label: 'Mirror Placement',
    type: 'select',
    options: [
      { value: 'CenterOnVanity', label: 'Center on Vanity' },
      { value: 'CenterOnSink', label: 'Center on Sink' },
    ],
  },
  { key: 'isShowerGlassVisible', label: 'Shower Glass Visible', type: 'boolean' },
  { key: 'isTubDoorVisible', label: 'Tub Door Visible', type: 'boolean' },
];

const ALL_FIELD_KEYS = new Set(FIELDS.map((f) => f.key));

// ── Helpers ────────────────────────────────────────────────────────

function isNonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.length > 0;
  if (typeof v === 'boolean') return true;
  return false;
}

export type DesignSettingsValue = Record<string, unknown> | null;

export function designSettingsHasValues(v: DesignSettingsValue): boolean {
  if (!v) return false;
  return Object.values(v).some(isNonEmpty);
}

// ── Editor ─────────────────────────────────────────────────────────

interface DesignSettingsEditorProps {
  value: DesignSettingsValue;
  onChange: (value: DesignSettingsValue) => void;
}

export function DesignSettingsEditor({ value, onChange }: DesignSettingsEditorProps) {
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const data = value ?? {};

  const setField = useCallback(
    (key: string, v: unknown) => {
      const next = { ...data };
      if (v == null || v === '') {
        delete next[key];
      } else {
        next[key] = v;
      }
      onChange(Object.keys(next).length === 0 ? null : next);
    },
    [data, onChange],
  );

  const filledCount = useMemo(
    () => FIELDS.filter((f) => isNonEmpty(data[f.key])).length,
    [data],
  );

  const clearAll = useCallback(() => onChange(null), [onChange]);

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

  const extraKeys = useMemo(
    () => Object.keys(data).filter((k) => !ALL_FIELD_KEYS.has(k) && isNonEmpty(data[k])),
    [data],
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase text-gray-900">Design Settings</h2>
          {filledCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
              {filledCount} set
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {filledCount > 0 && mode === 'form' && (
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
                mode === 'form' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Form
            </button>
            <button
              type="button"
              onClick={mode === 'form' ? switchToJson : undefined}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === 'json' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      {mode === 'form' ? (
        <div className="px-5 py-4">
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {FIELDS.map((field) =>
              field.type === 'select' ? (
                <SelectField
                  key={field.key}
                  field={field}
                  value={data[field.key]}
                  onChange={(v) => setField(field.key, v)}
                />
              ) : (
                <BooleanField
                  key={field.key}
                  field={field}
                  value={data[field.key]}
                  onChange={(v) => setField(field.key, v)}
                />
              ),
            )}
          </div>

          {extraKeys.length > 0 && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="mb-2 text-xs font-medium text-amber-700">
                Additional fields (switch to JSON to edit):
              </p>
              <div className="space-y-1">
                {extraKeys.map((k) => (
                  <div key={k} className="flex items-center justify-between">
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
            rows={12}
            className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-900 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder={'{\n  "wallTilePlacement": "VanityHalfWall",\n  "isShowerGlassVisible": true\n}'}
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

function SelectField({
  field,
  value,
  onChange,
}: {
  field: SelectFieldDef;
  value: unknown;
  onChange: (v: string | null) => void;
}) {
  const strVal = typeof value === 'string' ? value : '';

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-700">{field.label}</label>
      <div className="flex gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
            !strVal
              ? 'border-gray-300 bg-gray-100 text-gray-700 shadow-sm'
              : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600'
          }`}
        >
          Not set
        </button>
        {field.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
              strVal === opt.value
                ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BooleanField({
  field,
  value,
  onChange,
}: {
  field: BooleanFieldDef;
  value: unknown;
  onChange: (v: boolean | null) => void;
}) {
  const boolVal = typeof value === 'boolean' ? value : null;

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-700">{field.label}</label>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
            boolVal === null
              ? 'border-gray-300 bg-gray-100 text-gray-700 shadow-sm'
              : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600'
          }`}
        >
          Not set
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
            boolVal === true
              ? 'border-green-300 bg-green-50 text-green-700 shadow-sm ring-1 ring-green-200'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
            boolVal === false
              ? 'border-red-300 bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

// ── Detail display ─────────────────────────────────────────────────

interface DesignSettingsDisplayProps {
  value: Record<string, unknown>;
}

const FIELD_MAP = new Map<string, FieldDef>();
for (const f of FIELDS) FIELD_MAP.set(f.key, f);

const SELECT_OPTION_LABELS = new Map<string, Map<string, string>>();
for (const f of FIELDS) {
  if (f.type === 'select') {
    const m = new Map<string, string>();
    for (const o of f.options) m.set(o.value, o.label);
    SELECT_OPTION_LABELS.set(f.key, m);
  }
}

export function DesignSettingsDisplay({ value }: DesignSettingsDisplayProps) {
  const populated = FIELDS.filter((f) => isNonEmpty(value[f.key]));
  const extraKeys = Object.keys(value).filter((k) => !ALL_FIELD_KEYS.has(k) && isNonEmpty(value[k]));

  if (populated.length === 0 && extraKeys.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase text-gray-900">Design Settings</h2>
      </div>
      <div className="px-5 py-4">
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {populated.map((f) => (
            <DisplayField key={f.key} field={f} value={value[f.key]} />
          ))}
        </div>
        {extraKeys.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="mb-1 text-xs font-medium text-amber-700">Other</p>
            {extraKeys.map((k) => (
              <div key={k} className="flex items-center justify-between py-0.5">
                <span className="font-mono text-xs text-amber-800">{k}</span>
                <span className="font-mono text-xs text-amber-600">{JSON.stringify(value[k])}</span>
              </div>
            ))}
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
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{field.label}</span>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            b
              ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200'
              : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200'
          }`}
        >
          {b ? 'Yes' : 'No'}
        </span>
      </div>
    );
  }

  const strVal = String(value);
  const optionLabel = SELECT_OPTION_LABELS.get(field.key)?.get(strVal) ?? strVal;

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{field.label}</span>
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
        {optionLabel}
      </span>
    </div>
  );
}

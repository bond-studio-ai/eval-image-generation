"use client";

import { useCatalogProducts } from "@/components/design-settings-catalog";
import { ALL_FIELD_KEYS, type CatalogProduct, type FieldDef, FIELDS, getProductImageTypeKey, readProductImageType, SETTING_FIELDS } from "@/components/design-settings-fields";
import { isNonEmpty } from "@/components/design-settings-values";

interface DesignSettingsDisplayProps {
  value: Record<string, unknown>;
  hideProductFields?: boolean;
}

const SELECT_OPTION_LABELS = new Map<string, Map<string, string>>();
for (const field of SETTING_FIELDS) {
  if (field.type === "select") {
    const optionMap = new Map<string, string>();
    for (const option of field.options) optionMap.set(option.value, option.label);
    SELECT_OPTION_LABELS.set(field.key, optionMap);
  }
}

export function DesignSettingsDisplay({ value, hideProductFields = false }: DesignSettingsDisplayProps) {
  const { byId } = useCatalogProducts();
  const populated = FIELDS.filter((field) => isNonEmpty(value[field.key]) && (!hideProductFields || field.type !== "product"));
  const extraKeys = Object.keys(value).filter((key) => !ALL_FIELD_KEYS.has(key) && isNonEmpty(value[key]));

  if (populated.length === 0 && extraKeys.length === 0) return null;

  return (
    <div className="border-border bg-surface rounded-lg border shadow-xs">
      <div className="border-border-subtle border-b px-5 py-3">
        <h2 className="text-text-primary text-body font-semibold uppercase">Design Settings</h2>
      </div>
      <div className="px-5 py-4">
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {populated.map((field) => (
            <DisplayField key={field.key} field={field} value={value[field.key]} allValues={value} productById={byId} />
          ))}
        </div>
        {extraKeys.length > 0 && (
          <div className="border-warning-200 bg-warning-50 mt-4 rounded-md border px-4 py-3">
            <p className="text-warning-700 text-caption mb-1 font-medium">Other</p>
            {extraKeys.map((key) => (
              <div key={key} className="flex items-center justify-between py-0.5">
                <span className="text-warning-800 text-caption font-mono">{key}</span>
                <span className="text-warning-600 text-caption font-mono">{JSON.stringify(value[key])}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DisplayField({ field, value, allValues, productById }: { field: FieldDef; value: unknown; allValues: Record<string, unknown>; productById: Map<string, CatalogProduct> }) {
  if (field.type === "boolean") {
    const boolValue = value as boolean;
    return (
      <div className="flex items-center justify-between">
        <span className="text-text-secondary text-body">{field.label}</span>
        <span
          className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${boolValue ? "bg-success-50 text-success-700 ring-success-200 ring-1 ring-inset" : "bg-danger-50 text-danger-700 ring-danger-200 ring-1 ring-inset"}`}
        >
          {boolValue ? "Yes" : "No"}
        </span>
      </div>
    );
  }

  if (field.type === "product") {
    const productId = String(value);
    const product = productById.get(productId);
    const imageType = readProductImageType(allValues[getProductImageTypeKey(field.key)]);
    const isCustom = imageType === "arbitrary";
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-text-secondary text-body">{field.label}</span>
        <span className="bg-accent-50 text-accent-700 ring-accent-200 text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ring-1 ring-inset">
          {product?.name ?? productId}
          {isCustom ? " · Custom" : ""}
        </span>
      </div>
    );
  }

  const rawValue = String(value);
  const label = SELECT_OPTION_LABELS.get(field.key)?.get(rawValue) ?? rawValue;
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary text-body">{field.label}</span>
      <span className="bg-primary-50 text-primary-700 ring-primary-200 text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ring-1 ring-inset">{label}</span>
    </div>
  );
}

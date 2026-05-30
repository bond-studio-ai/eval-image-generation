import type { DesignSettingsValue } from "./design-settings-editor";

export function isNonEmpty(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.length > 0;
  if (typeof value === "boolean") return true;
  return false;
}

export function designSettingsHasValues(value: DesignSettingsValue): boolean {
  if (!value) return false;
  return Object.values(value).some(isNonEmpty);
}

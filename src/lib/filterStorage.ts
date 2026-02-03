import type { ParcelFilters } from "./types";

const GUEST_KEY = "pa_filters_guest";
const PREFIX = "pa_filters_";

function keyForUser(sub?: string | null) {
  return sub ? `${PREFIX}${sub}` : GUEST_KEY;
}

export function loadSavedFilters(sub?: string | null): ParcelFilters {
  const key = keyForUser(sub);
  const raw = localStorage.getItem(key);
  if (!raw) return {};

  try {
    const obj = JSON.parse(raw) as ParcelFilters;
    return {
      minValue: typeof obj.minValue === "number" ? obj.minValue : undefined,
      maxValue: typeof obj.maxValue === "number" ? obj.maxValue : undefined,
      minSqft: typeof obj.minSqft === "number" ? obj.minSqft : undefined,
      maxSqft: typeof obj.maxSqft === "number" ? obj.maxSqft : undefined,
    };
  } catch {
    return {};
  }
}

export function saveFilters(sub: string | null | undefined, filters: ParcelFilters) {
  const key = keyForUser(sub);
  localStorage.setItem(key, JSON.stringify(filters));
}

export function clearSavedFilters(sub: string | null | undefined) {
  const key = keyForUser(sub);
  localStorage.removeItem(key);
}

import type { ParcelFilters } from "./types";

export function buildExportUrl(args: {
  apiBaseUrl: string;
  bbox: number[];
  filters: ParcelFilters;
  limit?: number;
}) {
  const { apiBaseUrl, bbox, filters, limit = 5000 } = args;

  const qs = new URLSearchParams({
    bbox: bbox.join(","),
    limit: String(limit),
  });

  if (filters.minValue !== undefined) qs.set("minValue", String(filters.minValue));
  if (filters.maxValue !== undefined) qs.set("maxValue", String(filters.maxValue));
  if (filters.minSqft !== undefined) qs.set("minSqft", String(filters.minSqft));
  if (filters.maxSqft !== undefined) qs.set("maxSqft", String(filters.maxSqft));

  return `${apiBaseUrl}/parcels/export.csv?${qs.toString()}`;
}

export function downloadByUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

import type { ParcelFilters } from "./types";
import { getTokens } from "./auth";

export async function exportCsv(args: {
  apiBaseUrl: string;
  bbox: number[];
  filters: ParcelFilters;
  limit?: number;
  filename?: string;
}) {
  const {
    apiBaseUrl,
    bbox,
    filters,
    limit = 5000,
    filename = "parcels_export.csv",
  } = args;

  const qs = new URLSearchParams({
    bbox: bbox.join(","),
    limit: String(limit),
  });

  if (filters.minValue !== undefined) qs.set("minValue", String(filters.minValue));
  if (filters.maxValue !== undefined) qs.set("maxValue", String(filters.maxValue));
  if (filters.minSqft !== undefined) qs.set("minSqft", String(filters.minSqft));
  if (filters.maxSqft !== undefined) qs.set("maxSqft", String(filters.maxSqft));

  const url = `${apiBaseUrl}/parcels/export.csv?${qs.toString()}`;

  const tokens = getTokens();
  const headers: HeadersInit = {};

  // MUST use access_token (backend verifies access token)
  if (tokens?.access_token) {
    headers["Authorization"] = `Bearer ${tokens.access_token}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CSV export failed: ${res.status} ${text}`);
  }

  const blob = await res.blob();

  // Download
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

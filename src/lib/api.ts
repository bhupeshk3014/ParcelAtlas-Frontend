import type { ParcelFilters } from "./types";
import { getTokens } from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export type Parcel = {
  sl_uuid: string;
  address: string | null;
  county: string;
  sqft: number | null;
  total_value: number | null;
  lat: number;
  lng: number;
};

export type ParcelsCentroidResponse = {
  count: number;
  items: Parcel[];
  applied: { format: "centroid" | "polygon" };
};

export type ParcelsPolygonResponse = {
  count: number;
  geojson: GeoJSON.FeatureCollection;
  applied: { format: "centroid" | "polygon" };
};

function authHeaders(): HeadersInit {
  const tokens = getTokens();
  const headers: HeadersInit = {};

  if (tokens?.access_token) {
    headers["Authorization"] = `Bearer ${tokens.access_token}`;
  }

  return headers;
}

export async function fetchParcels(
  params: {
    bbox: number[];
    limit?: number;
    format?: "centroid" | "polygon";
  } & ParcelFilters
) {
  const {
    bbox,
    limit = 1000,
    format = "centroid",
    minValue,
    maxValue,
    minSqft,
    maxSqft,
  } = params;

  const qs = new URLSearchParams({
    bbox: bbox.join(","),
    limit: String(limit),
    format,
  });

  if (minValue !== undefined) qs.set("minValue", String(minValue));
  if (maxValue !== undefined) qs.set("maxValue", String(maxValue));
  if (minSqft !== undefined) qs.set("minSqft", String(minSqft));
  if (maxSqft !== undefined) qs.set("maxSqft", String(maxSqft));

  const url = `${API_BASE}/parcels?${qs.toString()}`;

  const res = await fetch(url, { headers: authHeaders() });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch parcels: ${res.status} ${text}`);
  }

  return res.json() as Promise<ParcelsCentroidResponse | ParcelsPolygonResponse>;
}

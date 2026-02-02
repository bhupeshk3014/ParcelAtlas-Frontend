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

export async function fetchParcels(params: {
  bbox: number[];
  limit?: number;
  minValue?: number;
  maxValue?: number;
  minSqft?: number;
  maxSqft?: number;
}) {
  const { bbox, limit = 1000, minValue, maxValue, minSqft, maxSqft } = params;

  const qs = new URLSearchParams({
    bbox: bbox.join(","),
    limit: String(limit),
  });

  if (minValue !== undefined) qs.set("minValue", String(minValue));
  if (maxValue !== undefined) qs.set("maxValue", String(maxValue));
  if (minSqft !== undefined) qs.set("minSqft", String(minSqft));
  if (maxSqft !== undefined) qs.set("maxSqft", String(maxSqft));

  const res = await fetch(`${API_BASE}/parcels?${qs.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch parcels: ${res.status}`);
  return res.json() as Promise<{ count: number; items: Parcel[] }>;
}

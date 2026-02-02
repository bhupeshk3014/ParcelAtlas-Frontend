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
}) {
  const { bbox, limit = 1000 } = params;

  const qs = new URLSearchParams({
    bbox: bbox.join(","),
    limit: String(limit),
  });

  const res = await fetch(`${API_BASE}/parcels?${qs}`);
  if (!res.ok) throw new Error("Failed to fetch parcels");
  return res.json();
}

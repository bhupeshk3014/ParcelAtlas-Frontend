import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchParcels, type Parcel } from "../lib/api";
import type { ParcelFilters } from "../lib/types";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function getBbox(map: mapboxgl.Map): number[] {
  const b = map.getBounds();
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
}

const SOURCE_ID = "parcels-src";
const LAYER_ID = "parcels-layer";

type Props = {
  filters: ParcelFilters;
  filtersVersion: number; // increments when user clicks Apply/Reset
};

export default function MapView({ filters, filtersVersion }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number>(0);
  const [items, setItems] = useState<Parcel[]>([]);

  const debounceRef = useRef<number | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Convert parcels to GeoJSON FeatureCollection (Mapbox-friendly)
  const geojson = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: items
        .filter((p) => Number.isFinite(p.lng) && Number.isFinite(p.lat))
        .map((p) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [p.lng, p.lat],
          },
          properties: {
            sl_uuid: p.sl_uuid,
            address: p.address ?? "",
            county: p.county,
            sqft: p.sqft ?? null,
            total_value: p.total_value ?? null,
          },
        })),
    };
  }, [items]);

  // Keep latest filters available inside map event handlers without re-registering them
  const filtersRef = useRef<ParcelFilters>({});
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapDivRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-96.8, 32.78],
      zoom: 10,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Resize fixes
    requestAnimationFrame(() => map.resize());
    setTimeout(() => map.resize(), 250);

    const ro = new ResizeObserver(() => map.resize());
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    const loadParcels = async () => {
      if (!mapRef.current) return;
      const bbox = getBbox(mapRef.current);

      try {
        setLoading(true);

        const data = await fetchParcels({
          bbox,
          limit: 1500,
          ...filtersRef.current, // ✅ apply current filters
        });

        setCount(data.count);
        setItems(data.items);
      } catch (err) {
        console.error("failed to load parcels", err);
      } finally {
        setLoading(false);
      }
    };

    map.on("load", () => {
      // Create source + layer once
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": 4,
          "circle-opacity": 0.75,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
          "circle-color": "#2563eb",
        },
      });

      // cursor polish
      map.on("mouseenter", LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });

      // click popup
      map.on("click", LAYER_ID, (e) => {
        const feature = e.features?.[0];
        if (!feature) return;

        const coords = (feature.geometry as any).coordinates as [number, number];
        const props = feature.properties as any;

        const address = props.address || "(no address)";
        const value = props.total_value ?? "N/A";
        const sqft = props.sqft ?? "N/A";
        const county = props.county ?? "";

        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(coords)
          .setHTML(
            `<div style="font-size:12px;line-height:1.4">
              <div style="font-weight:600;margin-bottom:4px">${address}</div>
              <div><b>County:</b> ${county}</div>
              <div><b>Total Value:</b> ${value}</div>
              <div><b>Sqft:</b> ${sqft}</div>
            </div>`
          )
          .addTo(map);
      });

      // initial load
      loadParcels();
    });

    map.on("moveend", () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => loadParcels(), 350);
    });

    mapRef.current = map;

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      popupRef.current?.remove();
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ✅ Whenever geojson changes, update the existing source data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(geojson as any);
  }, [geojson]);

  // ✅ When user clicks Apply/Reset, re-fetch immediately (no need to move the map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const bbox = getBbox(map);

    setLoading(true);
    fetchParcels({ bbox, limit: 1500, ...filters })
      .then((data) => {
        setCount(data.count);
        setItems(data.items);
      })
      .catch((err) => console.error("failed to load parcels", err))
      .finally(() => setLoading(false));
  }, [filtersVersion]); // important: only refetch when Apply/Reset clicked

  return (
    <div ref={wrapperRef} className="h-full w-full relative">
      <div ref={mapDivRef} className="h-full w-full" />

      <div className="absolute bottom-3 left-3 bg-white/90 border rounded-md px-3 py-2 text-xs text-gray-700 shadow">
        {loading ? "Loading parcels..." : `Points shown: ${items.length} (count: ${count})`}
      </div>
    </div>
  );
}

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
const POLY_SOURCE_ID = "parcels-poly-src";
const POLY_FILL_ID = "parcels-poly-fill";
const POLY_LINE_ID = "parcels-poly-line";

type Props = {
  filters: ParcelFilters;
  filtersVersion: number; 
  onBboxChange: (bbox: number[]) => void;
};

export default function MapView({ filters, filtersVersion, onBboxChange }: Props) {
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
      const map = mapRef.current;
      const bbox = getBbox(map);

      try {
        setLoading(true);

        // 1) Always fetch centroids first (fast)
        const centroidData = await fetchParcels({
          bbox,
          limit: 1500,
          format: "centroid",
          ...filtersRef.current,
        });

        if ("items" in centroidData) {
          setCount(centroidData.count);
          setItems(centroidData.items);
        }

        // 2) Decide if we should fetch polygons
        const zoom = map.getZoom();
        const itemCount = "items" in centroidData ? centroidData.items.length : 0;

        const shouldUsePolygons = zoom >= 17;

        if (!shouldUsePolygons) {
          // remove polygon layers if present
          if (map.getLayer(POLY_FILL_ID)) map.removeLayer(POLY_FILL_ID);
          if (map.getLayer(POLY_LINE_ID)) map.removeLayer(POLY_LINE_ID);
          if (map.getSource(POLY_SOURCE_ID)) map.removeSource(POLY_SOURCE_ID);
          return;
        }

        // 3) Fetch polygons 
        const polyData = await fetchParcels({
          bbox,
          limit: 200, // your backend default/safe
          format: "polygon",
          ...filtersRef.current,
        });

        if ("geojson" in polyData) {
          if (map.getSource(POLY_SOURCE_ID)) {
            (map.getSource(POLY_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(polyData.geojson as any);
          } else {
            map.addSource(POLY_SOURCE_ID, {
              type: "geojson",
              data: polyData.geojson as any,
            });

            map.addLayer({
              id: POLY_FILL_ID,
              type: "fill",
              source: POLY_SOURCE_ID,
              paint: {
                "fill-color": "#2563eb",
                "fill-opacity": 0.15,
              },
            });

            map.addLayer({
              id: POLY_LINE_ID,
              type: "line",
              source: POLY_SOURCE_ID,
              paint: {
                "line-color": "#2563eb",
                "line-width": 2,
                "line-opacity": 0.9,
              },
            });
          }
        }
      } catch (err) {
        console.error("failed to load parcels", err);
      } finally {
        setLoading(false);
      }
    };

    map.on("load", () => {
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(geojson as any);
  }, [geojson]);

  // When user clicks Apply/Reset, re-fetch immediately (no need to move the map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const bbox = getBbox(map);
    onBboxChange(bbox);

    setLoading(true);
    fetchParcels({ bbox, limit: 1500, ...filters })
      .then((data) => {
        setCount(data.count);
        setItems(data.items);
      })
      .catch((err) => console.error("failed to load parcels", err))
      .finally(() => setLoading(false));
  }, [filtersVersion]); 

  return (
    <div ref={wrapperRef} className="h-full w-full relative">
      <div ref={mapDivRef} className="h-full w-full" />

      <div className="absolute bottom-3 left-3 bg-white/90 border rounded-md px-3 py-2 text-xs text-gray-700 shadow">
        {loading ? "Loading parcels..." : `Points: ${items.length} | Count: ${count} | Zoom: ${mapRef.current?.getZoom().toFixed(1) ?? "-"}`}
      </div>
    </div>
  );
}

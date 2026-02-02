import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import { fetchParcels, type Parcel } from "../lib/api";
import type { ParcelFilters } from "../lib/types";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function getBbox(map: mapboxgl.Map): number[] {
  const b = map.getBounds();
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
}

function formatMoney(v: number | null | undefined) {
  if (v === null || v === undefined) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function formatMoneyFull(v: number | null | undefined) {
  if (v === null || v === undefined) return "N/A";
  const n = Number(v);
  if (!Number.isFinite(n)) return "N/A";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatNumber(v: number | null | undefined) {
  if (v === null || v === undefined) return "N/A";
  const n = Number(v);
  if (!Number.isFinite(n)) return "N/A";
  return n.toLocaleString("en-US");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[c] || c;
  });
}

function shouldRenderPolygons(zoom: number, itemCount: number) {
  return zoom >= 14 && itemCount > 0 && itemCount <= 100;
}

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

  const itemsRef = useRef<Parcel[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const debounceRef = useRef<number | null>(null);

  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const openIdRef = useRef<string | null>(null);

  const filtersRef = useRef<ParcelFilters>(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const aliveRef = useRef(true);

  const reqIdRef = useRef(0);

  const loadRef = useRef<null | (() => void)>(null);

  function clearMarkers() {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }

  function closePopup() {
    popupRef.current?.remove();
    popupRef.current = null;
    openIdRef.current = null;
  }

  function clearPolygons(map: mapboxgl.Map) {
    closePopup();

    if (map.getLayer(POLY_FILL_ID)) map.removeLayer(POLY_FILL_ID);
    if (map.getLayer(POLY_LINE_ID)) map.removeLayer(POLY_LINE_ID);
    if (map.getSource(POLY_SOURCE_ID)) map.removeSource(POLY_SOURCE_ID);
  }

  function showPopup(map: mapboxgl.Map, lngLat: mapboxgl.LngLatLike, props: any) {
    const address = escapeHtml(props?.address || "(no address)");
    const county = escapeHtml(props?.county || "—");
    const valueFull = formatMoneyFull(props?.total_value);
    const sqft = formatNumber(props?.sqft);

    popupRef.current?.remove();

    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false, 
      maxWidth: "340px",
      offset: 18,
    })
      .setLngLat(lngLat)
      .setHTML(`
        <div class="pa-popup">
          <div class="pa-popup__top">
            <div class="pa-popup__addr">${address}</div>
            <div class="pa-popup__pill">${valueFull}</div>
          </div>

          <div class="pa-popup__grid">
            <div class="pa-popup__box">
              <div class="pa-popup__label">County</div>
              <div class="pa-popup__value">${county}</div>
            </div>

            <div class="pa-popup__box">
              <div class="pa-popup__label">Sqft</div>
              <div class="pa-popup__value">${sqft}</div>
            </div>
          </div>
        </div>
      `)
      .addTo(map);

    popupRef.current.on("close", () => {
      openIdRef.current = null;
    });
  }

  function safeToDraw(map: mapboxgl.Map) {
    if (!aliveRef.current) return false;
    try {
      const c = map.getCanvasContainer?.();
      return !!c;
    } catch {
      return false;
    }
  }

  function drawPillMarkers(map: mapboxgl.Map, parcels: Parcel[]) {
    if (!safeToDraw(map)) return;

    clearMarkers();

    const zoom = map.getZoom();
    const max = zoom < 11 ? 120 : zoom < 13 ? 250 : zoom < 15 ? 600 : 1200;

    parcels
      .filter((p) => Number.isFinite(p.lng) && Number.isFinite(p.lat))
      .slice(0, max)
      .forEach((p) => {
        if (!safeToDraw(map)) return;

        const el = document.createElement("button");
        el.type = "button";

        el.className =
          "pa-pill px-2.5 py-1 rounded-full text-[11px] font-semibold " +
          "bg-blue-600 text-white shadow-md border border-white/70 " +
          "hover:bg-blue-700 active:bg-blue-800 transition " +
          "whitespace-nowrap select-none";

        el.textContent = formatMoney(p.total_value ?? null) || "—";

        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const id = p.sl_uuid;

          if (openIdRef.current === id) {
            closePopup();
            return;
          }

          openIdRef.current = id;

          showPopup(map, [p.lng as number, p.lat as number], {
            address: p.address,
            county: p.county,
            sqft: p.sqft,
            total_value: p.total_value,
          });
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([p.lng as number, p.lat as number])
          .addTo(map);

        markersRef.current.push(marker);
      });
  }

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    aliveRef.current = true;

    const map = new mapboxgl.Map({
      container: mapDivRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-96.8, 32.78],
      zoom: 10,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    requestAnimationFrame(() => map.resize());
    setTimeout(() => map.resize(), 250);

    const ro = new ResizeObserver(() => map.resize());
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    map.on("click", () => closePopup());

    const onPolyClick = (e: mapboxgl.MapLayerMouseEvent) => {
      e.preventDefault();
      e.originalEvent.stopPropagation();

      const feature = e.features?.[0];
      if (!feature) return;

      openIdRef.current = null;
      showPopup(map, e.lngLat, feature.properties);
    };

    const loadParcels = async () => {
      const currentReq = ++reqIdRef.current;

      if (!mapRef.current) return;
      const m = mapRef.current;

      const bbox = getBbox(m);
      onBboxChange(bbox);

      try {
        setLoading(true);

        // ---- CENTROIDS ----
        const centroidData = await fetchParcels({
          bbox,
          limit: 1500,
          format: "centroid",
          ...filtersRef.current,
        });

        if (!aliveRef.current || currentReq !== reqIdRef.current || !mapRef.current) return;

        if ("items" in centroidData) {
          setCount(centroidData.count);
          setItems(centroidData.items);
          drawPillMarkers(m, centroidData.items);

          const zoom = m.getZoom();
          const itemCount = centroidData.items.length;

          if (!shouldRenderPolygons(zoom, itemCount)) {
            clearPolygons(m);
            return;
          }
        }

        // ---- POLYGONS ----
        const zoom = m.getZoom();
        const itemCount = itemsRef.current.length;

        if (!shouldRenderPolygons(zoom, itemCount)) {
          clearPolygons(m);
          return;
        }

        const polyData = await fetchParcels({
          bbox,
          limit: 200,
          format: "polygon",
          ...filtersRef.current,
        });

        if (!aliveRef.current || currentReq !== reqIdRef.current || !mapRef.current) return;

        if (!("geojson" in polyData)) {
          clearPolygons(m);
          return;
        }

        if (m.getSource(POLY_SOURCE_ID)) {
          (m.getSource(POLY_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(polyData.geojson as any);
        } else {
          m.addSource(POLY_SOURCE_ID, { type: "geojson", data: polyData.geojson as any });

          m.addLayer({
            id: POLY_FILL_ID,
            type: "fill",
            source: POLY_SOURCE_ID,
            paint: { "fill-color": "#2563eb", "fill-opacity": 0.12 },
          });

          m.addLayer({
            id: POLY_LINE_ID,
            type: "line",
            source: POLY_SOURCE_ID,
            paint: { "line-color": "#2563eb", "line-width": 2, "line-opacity": 0.9 },
          });

          m.on("click", POLY_FILL_ID, onPolyClick);
        }
      } catch (err) {
        console.error("failed to load parcels", err);
      } finally {
        if (aliveRef.current) setLoading(false);
      }
    };

    map.on("load", () => loadParcels());

    map.on("moveend", () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => loadParcels(), 350);
    });

    map.on("zoomend", () => {
      drawPillMarkers(map, itemsRef.current);

      const z = map.getZoom();
      const n = itemsRef.current.length;
      if (!shouldRenderPolygons(z, n)) {
        clearPolygons(map);
      }
    });

    mapRef.current = map;
    loadRef.current = () => loadParcels();

    return () => {
      aliveRef.current = false;

      if (debounceRef.current) window.clearTimeout(debounceRef.current);

      closePopup();
      clearMarkers();
      ro.disconnect();

      if (map.getLayer(POLY_FILL_ID)) {
        map.off("click", POLY_FILL_ID, onPolyClick);
      }

      map.remove();
      mapRef.current = null;
      loadRef.current = null;
    };
  }, [onBboxChange]);

  useEffect(() => {
    loadRef.current?.();
  }, [filtersVersion]);

  return (
    <div ref={wrapperRef} className="h-full w-full relative">
      <div ref={mapDivRef} className="h-full w-full" />

      <div className="absolute bottom-3 left-3 bg-white/90 border rounded-md px-3 py-2 text-xs text-gray-700 shadow">
        {loading
          ? "Loading parcels..."
          : `Shown: ${items.length} | Count: ${count} | Zoom: ${mapRef.current?.getZoom().toFixed(1) ?? "-"}`}
      </div>
    </div>
  );
}

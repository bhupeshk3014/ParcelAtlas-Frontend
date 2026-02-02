import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export default function MapView() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

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

    mapRef.current = map;

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <div ref={mapDivRef} className="h-full w-full" />
    </div>
  );
}

import type { ParcelFilters } from "../lib/types";
import { buildExportUrl, downloadByUrl } from "../lib/exportCsv";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Header(props: { bbox: number[] | null; filters: ParcelFilters }) {
  const { bbox, filters } = props;

  const handleExport = () => {
    if (!bbox) return;

    const url = buildExportUrl({
      apiBaseUrl: API_BASE,
      bbox,
      filters,
      limit: 5000,
    });

    downloadByUrl(url, "parcels_export.csv");
  };

  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-4">
      <div className="font-semibold">ParcelAtlas</div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">Guest (Dallas only)</span>

        <button
          onClick={handleExport}
          disabled={!bbox}
          className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50 disabled:opacity-60"
          title={!bbox ? "Move the map once before exporting" : "Export visible parcels"}
        >
          Export CSV
        </button>

        <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">
          Login
        </button>
      </div>
    </header>
  );
}

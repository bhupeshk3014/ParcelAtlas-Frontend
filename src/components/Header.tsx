import type { ParcelFilters } from "../lib/types";
import { buildExportUrl, downloadByUrl } from "../lib/exportCsv";
import { isLoggedIn, login, logout } from "../lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Header(props: { bbox: number[] | null; filters: ParcelFilters }) {
  const { bbox, filters } = props;
  const authed = isLoggedIn();

  const handleExport = () => {
    if (!bbox) return;
    const url = buildExportUrl({ apiBaseUrl: API_BASE, bbox, filters, limit: 5000 });
    downloadByUrl(url, "parcels_export.csv");
  };

  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-4">
      <div className="font-semibold">ParcelAtlas</div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">
          {authed ? "Logged in (Full access)" : "Guest (Dallas only)"}
        </span>

        <button
          type="button"
          onClick={handleExport}
          disabled={!bbox}
          className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50 disabled:opacity-60"
        >
          Export CSV
        </button>

        {!authed ? (
          <button
            type="button"
            onClick={() => login()}
            className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Login / Sign up
          </button>
        ) : (
          <button
            type="button"
            onClick={() => logout()}
            className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50"
          >
            Logout
          </button>
        )}

      </div>
    </header>
  );
}

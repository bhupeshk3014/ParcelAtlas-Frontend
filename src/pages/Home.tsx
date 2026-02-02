import { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import MapView from "../components/MapView";
import type { ParcelFilters } from "../lib/types";

export default function Home() {
  const [filters, setFilters] = useState<ParcelFilters>({});
  const [filtersVersion, setFiltersVersion] = useState(0);

  const applyFilters = (f: ParcelFilters) => {
    setFilters(f);
    setFiltersVersion((v) => v + 1); // forces reload
  };

  const resetFilters = () => {
    setFilters({});
    setFiltersVersion((v) => v + 1);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex flex-1 min-h-0">
        <aside className="w-[360px] border-r bg-white overflow-y-auto">
          <Sidebar initial={filters} onApply={applyFilters} onReset={resetFilters} />
        </aside>

        <main className="flex-1 min-h-0 overflow-hidden">
          <MapView filters={filters} filtersVersion={filtersVersion} />
        </main>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import MapView from "../components/MapView";
import type { ParcelFilters } from "../lib/types";
import { loadSavedFilters, saveFilters, clearSavedFilters } from "../lib/filterStorage";
import { AUTH_CHANGED, getUserSub } from "../lib/auth";

export default function Home() {
  const [filters, setFilters] = useState<ParcelFilters>({});
  const [filtersVersion, setFiltersVersion] = useState(0);
  const [bbox, setBbox] = useState<number[] | null>(null);

  const [sub, setSub] = useState<string | null>(() => getUserSub());

  const reloadFilters = (nextSub?: string | null) => {
    const s = nextSub ?? getUserSub();
    setFilters(loadSavedFilters(s));
    setFiltersVersion((v) => v + 1);
  };

  useEffect(() => {
    reloadFilters(sub);
  }, []);

  useEffect(() => {
    const onAuthChanged = () => {
      const nextSub = getUserSub();
      setSub(nextSub);
      reloadFilters(nextSub);
    };

    window.addEventListener(AUTH_CHANGED, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED, onAuthChanged);
  }, []);

  const applyFilters = (f: ParcelFilters) => {
    setFilters(f);
    saveFilters(sub, f);
    setFiltersVersion((v) => v + 1);
  };

  const resetFilters = () => {
    setFilters({});
    clearSavedFilters(sub);
    setFiltersVersion((v) => v + 1);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header bbox={bbox} filters={filters} />
      <div className="flex flex-1 min-h-0">
        <aside className="w-[360px] border-r bg-white overflow-y-auto">
          <Sidebar initial={filters} onApply={applyFilters} onReset={resetFilters} />
        </aside>
        <main className="flex-1 min-h-0 overflow-hidden">
          <MapView filters={filters} filtersVersion={filtersVersion} onBboxChange={setBbox} />
        </main>
      </div>
    </div>
  );
}

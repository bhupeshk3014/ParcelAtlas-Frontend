import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import MapView from "../components/MapView";

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[360px] border-r bg-white overflow-y-auto">
          <Sidebar />
        </aside>

        <main className="flex-1 relative">
          <MapView />
        </main>
      </div>
    </div>
  );
}

export default function Header() {
  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-4">
      <div className="font-semibold">ParcelAtlas</div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">Guest (Dallas only)</span>
        <button className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50">
          Export CSV
        </button>
        <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">
          Login
        </button>
      </div>
    </header>
  );
}
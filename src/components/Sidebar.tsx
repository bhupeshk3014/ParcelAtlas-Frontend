export default function Sidebar() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="font-semibold">Filters</h2>
        <p className="text-sm text-gray-600">
          Filters apply to the current map viewport.
        </p>
      </div>

      <div className="space-y-3">
        <Field label="Min Value" placeholder="e.g. 100000" />
        <Field label="Max Value" placeholder="e.g. 500000" />
        <Field label="Min Sqft" placeholder="e.g. 1500" />
        <Field label="Max Sqft" placeholder="e.g. 3000" />
      </div>

      <div className="flex gap-2">
        <button className="flex-1 px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">
          Apply
        </button>
        <button className="flex-1 px-3 py-2 rounded-md border text-sm hover:bg-gray-50">
          Reset
        </button>
      </div>
    </div>
  );
}

function Field(props: { label: string; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-700">{props.label}</label>
      <input
        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
        placeholder={props.placeholder}
      />
    </div>
  );
}

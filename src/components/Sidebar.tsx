import { useEffect, useMemo, useState } from "react";
import type { ParcelFilters } from "../lib/types";

type Props = {
  initial: ParcelFilters;
  onApply: (filters: ParcelFilters) => void;
  onReset: () => void;
};

function toNum(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export default function Sidebar({ initial, onApply, onReset }: Props) {
  const [minValue, setMinValue] = useState(initial.minValue?.toString() ?? "");
  const [maxValue, setMaxValue] = useState(initial.maxValue?.toString() ?? "");
  const [minSqft, setMinSqft] = useState(initial.minSqft?.toString() ?? "");
  const [maxSqft, setMaxSqft] = useState(initial.maxSqft?.toString() ?? "");

  // If Home loads saved filters later, update the input fields
  useEffect(() => {
    setMinValue(initial.minValue?.toString() ?? "");
    setMaxValue(initial.maxValue?.toString() ?? "");
    setMinSqft(initial.minSqft?.toString() ?? "");
    setMaxSqft(initial.maxSqft?.toString() ?? "");
  }, [initial.minValue, initial.maxValue, initial.minSqft, initial.maxSqft]);

  const error = useMemo(() => {
    const a = toNum(minValue);
    const b = toNum(maxValue);
    const c = toNum(minSqft);
    const d = toNum(maxSqft);

    if (a !== undefined && b !== undefined && a > b)
      return "Min Value cannot be greater than Max Value";
    if (c !== undefined && d !== undefined && c > d)
      return "Min Sqft cannot be greater than Max Sqft";
    return "";
  }, [minValue, maxValue, minSqft, maxSqft]);

  const handleApply = () => {
    if (error) return;

    onApply({
      minValue: toNum(minValue),
      maxValue: toNum(maxValue),
      minSqft: toNum(minSqft),
      maxSqft: toNum(maxSqft),
    });
  };

  const handleReset = () => {
    setMinValue("");
    setMaxValue("");
    setMinSqft("");
    setMaxSqft("");
    onReset();
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="font-semibold">Filters</h2>
        <p className="text-sm text-gray-600">
          Apply filters to parcels in the current viewport.
        </p>
      </div>

      <div className="space-y-3">
        <Field label="Min Value" value={minValue} setValue={setMinValue} placeholder="e.g. 100000" />
        <Field label="Max Value" value={maxValue} setValue={setMaxValue} placeholder="e.g. 500000" />
        <Field label="Min Sqft" value={minSqft} setValue={setMinSqft} placeholder="e.g. 1500" />
        <Field label="Max Sqft" value={maxSqft} setValue={setMaxSqft} placeholder="e.g. 3000" />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-2">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleApply}
          disabled={Boolean(error)}
          className="flex-1 px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60 disabled:hover:bg-blue-600"
        >
          Apply
        </button>
        <button
          onClick={handleReset}
          className="flex-1 px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-700">{props.label}</label>
      <input
        value={props.value}
        onChange={(e) => props.setValue(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
        placeholder={props.placeholder}
      />
    </div>
  );
}

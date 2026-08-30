import { useEffect, useRef, useState } from "react";
import api from "../api/axios.js";

/**
 * Type-ahead property picker. Fixes the old bug where users had to paste a raw
 * MongoDB _id — instead they type a name/area and pick from real results,
 * and we quietly carry the actual ObjectId behind the scenes.
 */
export default function PropertySearchSelect({ value, onChange }) {
  const [query, setQuery] = useState(value?.name || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!query || (value && query === value.name)) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/properties", { params: { query, limit: 8 } });
        setResults(data.results);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const select = (property) => {
    onChange({ id: property.id, name: property.name });
    setQuery(property.name);
    setOpen(false);
  };

  return (
    <div className="relative" ref={boxRef}>
      <label className="text-sm font-medium">Property</label>
      <input
        className="input mt-1"
        placeholder="Start typing a property name or area — e.g. Green View Apartment, Mirpur"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(null); // clear selection until they pick a real result
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {value?.id && (
        <p className="text-xs text-brand-600 mt-1">✓ Selected: {value.name}</p>
      )}
      {open && (
        <div className="absolute z-20 mt-1 w-full card max-h-64 overflow-y-auto">
          {loading && <p className="p-3 text-sm text-neutral-400">Searching...</p>}
          {!loading && results.length === 0 && (
            <p className="p-3 text-sm text-neutral-400">
              No matching property found. Can't find it? It may not be listed yet —
              try the <a href="/report-issue" className="text-brand-600 underline">anonymous issue report</a> instead.
            </p>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => select(p)}
              className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm"
            >
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-neutral-400">{p.address?.area}, {p.address?.city}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

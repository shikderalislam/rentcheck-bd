import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import PropertyCard from "../components/PropertyCard.jsx";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    query: params.get("query") || "",
    area: params.get("area") || "",
    minRent: "",
    maxRent: "",
    verifiedOnly: false,
  });

  const runSearch = async (e) => {
    e?.preventDefault();
    setLoading(true);
    const query = {};
    Object.entries(filters).forEach(([k, v]) => v && (query[k] = v));
    setParams(query);
    try {
      const { data } = await api.get("/properties", { params: query });
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold mb-6">Find a property</h1>

      <form onSubmit={runSearch} className="card p-4 mb-8 grid sm:grid-cols-5 gap-3">
        <input
          className="input sm:col-span-2"
          placeholder="Area, property, landlord..."
          value={filters.query}
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
        />
        <input
          className="input"
          placeholder="Min rent (৳)"
          type="number"
          value={filters.minRent}
          onChange={(e) => setFilters((f) => ({ ...f, minRent: e.target.value }))}
        />
        <input
          className="input"
          placeholder="Max rent (৳)"
          type="number"
          value={filters.maxRent}
          onChange={(e) => setFilters((f) => ({ ...f, maxRent: e.target.value }))}
        />
        <button type="submit" className="btn-primary">Search</button>
        <label className="sm:col-span-5 flex items-center gap-2 text-sm text-neutral-500">
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(e) => setFilters((f) => ({ ...f, verifiedOnly: e.target.checked }))}
          />
          Verified properties only
        </label>
      </form>

      {loading ? (
        <p className="text-neutral-400">Loading...</p>
      ) : results.length === 0 ? (
        <div className="card p-10 text-center text-neutral-500">No properties found. Try a different area or clear filters.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}

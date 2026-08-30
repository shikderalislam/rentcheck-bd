import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios.js";
import RatingStars from "../components/RatingStars.jsx";
import ReviewCard from "../components/ReviewCard.jsx";
import PropertyCard from "../components/PropertyCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function LandlordDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [claiming, setClaiming] = useState(false);

  const load = () => api.get(`/landlords/${slug}`).then((res) => setData(res.data));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await api.post(`/landlords/${data.landlord.id}/claim`);
      await load();
    } catch (e) {
      alert(e.response?.data?.message || "Could not submit claim");
    } finally {
      setClaiming(false);
    }
  };

  if (!data) return <div className="container-page py-16 text-neutral-400">Loading...</div>;
  const { landlord, properties, reviews } = data;

  return (
    <div className="container-page py-10">
      <div className="card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{landlord.name}</h1>
            {landlord.isVerified && <span className="badge bg-brand-100 text-brand-700">✓ Verified Landlord</span>}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <RatingStars value={landlord.reputation.overall} />
            <span className="text-sm text-neutral-400">
              {landlord.reputation.reviewCount} reviews · {landlord.reputation.responseRate}% response rate
            </span>
          </div>
        </div>
        {landlord.isClaimable && user?.role === "landlord" && (
          <button onClick={handleClaim} disabled={claiming} className="btn-primary">
            {claiming ? "Submitting..." : "Claim this profile"}
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {[
          ["Communication", landlord.reputation.communication],
          ["Privacy", landlord.reputation.privacy],
          ["Maintenance", landlord.reputation.maintenance],
          ["Agreement fairness", landlord.reputation.fairness],
          ["Deposit handling", landlord.reputation.depositHandling],
        ].map(([label, val]) => (
          <div key={label} className="card p-4">
            <p className="text-sm text-neutral-500">{label}</p>
            <RatingStars value={val} size="text-xs" />
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-lg mb-3">Properties</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {properties.map((p) => (
          <PropertyCard key={p.id} property={p} />
        ))}
      </div>

      <h2 className="font-semibold text-lg mb-3">Tenant experiences</h2>
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="card p-8 text-center text-neutral-400">No reviews yet.</div>
        ) : (
          reviews.map((r) => <ReviewCard key={r._id} review={r} />)
        )}
      </div>
    </div>
  );
}

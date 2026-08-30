import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios.js";
import RatingStars from "../components/RatingStars.jsx";
import ReviewCard from "../components/ReviewCard.jsx";
import { stockPhotoUrl } from "../utils/stockPhoto.js";

export default function PropertyDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/properties/${slug}`)
      .then((res) => setData(res.data))
      .catch(() => setError("Property not found."));
  }, [slug]);

  if (error) return <div className="container-page py-16 text-center text-neutral-500">{error}</div>;
  if (!data) return <div className="container-page py-16 text-neutral-400">Loading...</div>;

  const { property, landlord, reviews } = data;
  const categories = [
    ["Privacy", property.reputation.privacy],
    ["Maintenance", property.reputation.maintenance],
    ["Communication", property.reputation.communication],
    ["Fairness", property.reputation.fairness],
    ["Safety", property.reputation.safety],
    ["Value", property.reputation.value],
  ];

  return (
    <div className="container-page py-10">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{property.name}</h1>
              {property.isVerified && <span className="badge bg-brand-100 text-brand-700">✓ Verified Property</span>}
            </div>
            <p className="text-neutral-500 mt-1">
              {property.address.addressLine}, {property.address.area}, {property.address.city}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <RatingStars value={property.reputation.overall} />
              <span className="text-sm text-neutral-400">
                {property.reputation.reviewCount} experiences · {property.reputation.verifiedReviewCount} verified
              </span>
            </div>
          </div>

          <div className="h-64 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
            <img
              src={property.photos?.[0] || stockPhotoUrl(property.id, 1200, 500)}
              alt={property.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="card p-5">
            <h2 className="font-semibold mb-3">Category ratings</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {categories.map(([label, val]) => (
                <div key={label}>
                  <p className="text-sm text-neutral-500">{label}</p>
                  <RatingStars value={val} size="text-xs" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">Tenant experiences</h2>
              <Link to={`/submit-review?propertySlug=${property.slug}`} className="btn-primary !py-1.5 !px-3 text-sm">
                Share your experience
              </Link>
            </div>
            {reviews.length === 0 ? (
              <div className="card p-8 text-center text-neutral-400">No reviews yet. Be the first to share your experience.</div>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <ReviewCard key={r._id} review={r} />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card p-5">
            <p className="text-sm text-neutral-500">Rent range</p>
            <p className="text-2xl font-bold">
              ৳{property.rent.min.toLocaleString()} – ৳{property.rent.max.toLocaleString()}
            </p>
            <p className="text-sm text-neutral-500 mt-1">Deposit: ৳{property.deposit?.toLocaleString()}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {property.amenities?.map((a) => (
                <span key={a} className="badge bg-neutral-100 text-neutral-600">{a}</span>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <p className="text-sm text-neutral-500 mb-2">Managed by</p>
            <Link to={`/landlords/${landlord.slug}`} className="font-semibold hover:text-brand-600">
              {landlord.name} {landlord.isVerified && "✓"}
            </Link>
            <div className="mt-2">
              <RatingStars value={landlord.reputation?.overall || 0} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

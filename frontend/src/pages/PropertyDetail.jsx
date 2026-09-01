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
              <h1 className="text-2xl font-bold" data-no-translate>{property.name}</h1>
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
          <RentBreakdown property={property} />

          {property.contact && (property.contact.phone || property.contact.whatsapp || property.contact.allowMessages) && (
            <div className="card p-5">
              <p className="font-semibold mb-1">📞 বাড়িওয়ালার সাথে যোগাযোগ করুন</p>
              {property.contact.name && (
                <p className="text-sm">
                  <span data-no-translate>{property.contact.name}</span>{" "}
                  {property.isVerified && <span className="text-brand-600">✓ Verified</span>}
                </p>
              )}
              <div className="mt-3 space-y-2">
                {property.contact.showPhone !== false && property.contact.phone && (
                  <a href={`tel:${property.contact.phone}`} className="btn-primary w-full">📞 {property.contact.phone}</a>
                )}
                {property.contact.showWhatsapp !== false && property.contact.whatsapp && (
                  <a
                    href={`https://wa.me/${property.contact.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary w-full"
                  >
                    💬 WhatsApp
                  </a>
                )}
                {property.contact.allowMessages !== false && (
                  <Link to={`/landlords/${landlord.slug}`} className="btn-secondary w-full">✉ Send message</Link>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-2">যোগাযোগ সম্পূর্ণ ফ্রি — কোনো পেমেন্ট লাগবে না।</p>
            </div>
          )}

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

function RentBreakdown({ property }) {
  const rd = property.rentDetails || {};
  const monthly = rd.monthly || property.rent?.min || 0;
  const extras = [
    ["Service charge", rd.serviceCharge],
    ["Parking", rd.parkingCharge],
    ["Electricity", rd.electricity],
    ["Gas", rd.gas],
    ["Water", rd.water],
    ["Internet", rd.internet],
    ["Other", rd.otherCharges],
  ].filter(([, v]) => v > 0);
  const total = monthly + extras.reduce((a, [, v]) => a + v, 0);
  return (
    <div className="card p-5">
      <p className="text-sm text-neutral-500">Monthly rent</p>
      <p className="text-2xl font-bold">৳{monthly.toLocaleString()}</p>
      {rd.advanceMonths ? <p className="text-sm text-neutral-500 mt-1">Advance: {rd.advanceMonths} months</p> : null}
      {extras.length > 0 && (
        <dl className="mt-3 space-y-1 text-sm border-t border-neutral-100 dark:border-neutral-800 pt-3">
          {extras.map(([k, v]) => (
            <div key={k} className="flex justify-between"><dt className="text-neutral-500">{k}</dt><dd>৳{v.toLocaleString()}</dd></div>
          ))}
          <div className="flex justify-between font-semibold pt-1"><dt>Estimated monthly total</dt><dd>৳{total.toLocaleString()}</dd></div>
        </dl>
      )}
      {property.amenities?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {property.amenities.map((a) => (
            <span key={a} className="badge bg-neutral-100 text-neutral-600" data-no-translate>{a}</span>
          ))}
        </div>
      )}
    </div>
  );
}

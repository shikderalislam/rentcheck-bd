import { Link } from "react-router-dom";
import RatingStars from "./RatingStars.jsx";
import { stockPhotoUrl } from "../utils/stockPhoto.js";

export default function PropertyCard({ property }) {
  return (
    <Link to={`/properties/${property.slug}`} className="card overflow-hidden group hover:shadow-lg transition-shadow">
      <div className="relative h-44 bg-neutral-100 dark:bg-neutral-800">
        <img
          src={property.photos?.[0] || stockPhotoUrl(property.id || property.slug)}
          alt={property.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {property.isPromoted && (
          <span className="badge absolute top-2 left-2 bg-amber-100 text-amber-800">Promoted</span>
        )}
        {property.isVerified && (
          <span className="badge absolute top-2 right-2 bg-brand-100 text-brand-700">✓ Verified</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-neutral-900 dark:text-white group-hover:text-brand-600 line-clamp-1">
          {property.name}
        </h3>
        <p className="text-sm text-neutral-500 mt-0.5">
          {property.address?.area}, {property.address?.city}
        </p>
        <div className="flex items-center justify-between mt-3">
          <RatingStars value={property.reputation?.overall || 0} />
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            ৳{property.rent?.min?.toLocaleString()}+
          </span>
        </div>
        <p className="text-xs text-neutral-400 mt-1">
          {property.reputation?.reviewCount || 0} experiences · {property.reputation?.verifiedReviewCount || 0} verified
        </p>
      </div>
    </Link>
  );
}

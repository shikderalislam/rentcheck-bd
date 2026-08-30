import { Link } from "react-router-dom";
import RatingStars from "./RatingStars.jsx";
import { stockAreaPhotoUrl } from "../utils/stockPhoto.js";

export default function AreaCard({ area }) {
  return (
    <div className="card overflow-hidden">
      <img src={stockAreaPhotoUrl(area.area)} alt={area.area} loading="lazy" className="h-28 w-full object-cover" />
      <div className="p-4">
        <h4 className="font-semibold">{area.area}</h4>
        <p className="text-xs text-neutral-400 mb-2">{area.city}</p>
        <RatingStars value={area.avgRating} size="text-xs" />
        <ul className="mt-3 space-y-1 text-sm text-neutral-500">
          <li>গড় ভাড়া: ৳{area.rentRange.min?.toLocaleString()} – ৳{area.rentRange.max?.toLocaleString()}</li>
          <li>{area.propertyCount} প্রপার্টি · {area.reviewCount} অভিজ্ঞতা</li>
        </ul>
        <Link
          to={`/search?area=${encodeURIComponent(area.area)}`}
          className="btn-secondary w-full mt-4 !py-1.5 text-sm"
        >
          বিস্তারিত দেখুন →
        </Link>
      </div>
    </div>
  );
}

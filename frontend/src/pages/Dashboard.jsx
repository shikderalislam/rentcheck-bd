import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import RatingStars from "../components/RatingStars.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    api.get("/reviews/mine").then((res) => setReviews(res.data.reviews));
  }, []);

  const statusColor = {
    APPROVED: "bg-brand-100 text-brand-700",
    SUBMITTED: "bg-amber-100 text-amber-700",
    UNDER_REVIEW: "bg-amber-100 text-amber-700",
    REJECTED: "bg-rose-100 text-rose-700",
    HIDDEN: "bg-neutral-100 text-neutral-500",
    REMOVED: "bg-neutral-100 text-neutral-500",
  };

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.displayName}</h1>
      <p className="text-neutral-500 mb-8">Manage your reviews and rental verifications here.</p>

      <div className="flex gap-3 mb-8">
        <Link to="/submit-review" className="btn-primary">Share a new experience</Link>
      </div>

      <h2 className="font-semibold text-lg mb-3">Your reviews</h2>
      {reviews.length === 0 ? (
        <div className="card p-8 text-center text-neutral-400">You haven't submitted any reviews yet.</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r._id} className="card p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <RatingStars value={r.overallRating} showValue={false} />
                  <span className={`badge ${statusColor[r.status] || "bg-neutral-100 text-neutral-500"}`}>{r.status}</span>
                  {r.isVerified && <span className="badge bg-brand-100 text-brand-700">Verified</span>}
                </div>
                <p className="text-sm text-neutral-600 mt-1 line-clamp-1">{r.body}</p>
              </div>
              <span className="text-xs text-neutral-400">{new Date(r.createdAt).toLocaleDateString("en-GB")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import PropertySearchSelect from "../components/PropertySearchSelect.jsx";

const CATEGORIES = [
  ["landlordBehavior", "Landlord behavior"],
  ["privacy", "Privacy"],
  ["maintenance", "Maintenance"],
  ["communication", "Communication"],
  ["agreementFairness", "Agreement fairness"],
  ["depositHandling", "Deposit handling"],
  ["serviceQuality", "Utility / service quality"],
  ["safety", "Safety"],
  ["valueForMoney", "Value for money"],
];

export default function SubmitReview() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selectedProperty, setSelectedProperty] = useState(null);
  const [form, setForm] = useState({
    propertyId: "",
    overallRating: 5,
    categoryRatings: Object.fromEntries(CATEGORIES.map(([k]) => [k, 5])),
    wouldRentAgain: true,
    wouldRecommend: true,
    title: "",
    body: "",
    pros: "",
    cons: "",
  });

  const setCategory = (key, val) =>
    setForm((f) => ({ ...f, categoryRatings: { ...f.categoryRatings, [key]: val } }));

  const preselectedSlug = params.get("propertySlug");

  // If we arrived via "Share your experience" on a property page, it passes
  // the slug — look the property up so the name shows and the picker is skipped.
  useEffect(() => {
    if (!preselectedSlug) return;
    api.get(`/properties/${preselectedSlug}`).then(({ data }) => {
      setSelectedProperty({ id: data.property.id, name: data.property.name });
      setForm((f) => ({ ...f, propertyId: data.property.id }));
    });
  }, [preselectedSlug]);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await api.post("/reviews", {
        ...form,
        reviewType: "property",
        pros: form.pros.split("\n").filter(Boolean),
        cons: form.cons.split("\n").filter(Boolean),
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page py-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Share your rental experience</h1>
      <p className="text-neutral-500 mb-6">Step {step} of 4 — your review will be published after moderation.</p>

      {error && <p className="text-sm text-rose-600 mb-4">{error}</p>}

      {step === 1 && (
        <div className="card p-6 space-y-4">
          <PropertySearchSelect
            value={selectedProperty}
            onChange={(p) => {
              setSelectedProperty(p);
              setForm((f) => ({ ...f, propertyId: p?.id || "" }));
            }}
          />
          <label className="text-sm font-medium block">Overall rating (1–5)</label>
          <input
            type="range"
            min="1"
            max="5"
            value={form.overallRating}
            onChange={(e) => setForm((f) => ({ ...f, overallRating: Number(e.target.value) }))}
            className="w-full"
          />
          <p className="text-sm text-neutral-500">Selected: {form.overallRating} / 5</p>
          <button className="btn-primary" onClick={() => setStep(2)} disabled={!form.propertyId}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold">Rate your experience by category</h3>
          {CATEGORIES.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <select
                className="input !w-24"
                value={form.categoryRatings[key]}
                onChange={(e) => setCategory(key, Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          ))}
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" onClick={() => setStep(3)}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card p-6 space-y-4">
          <label className="text-sm font-medium">Title (optional)</label>
          <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />

          <label className="text-sm font-medium">Your experience</label>
          <textarea
            className="input min-h-[120px]"
            placeholder="Describe your experience honestly. Avoid personal attacks or sharing anyone's private information."
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          />

          <label className="text-sm font-medium">Positives (one per line)</label>
          <textarea className="input" value={form.pros} onChange={(e) => setForm((f) => ({ ...f, pros: e.target.value }))} />

          <label className="text-sm font-medium">Common concerns (one per line)</label>
          <textarea className="input" value={form.cons} onChange={(e) => setForm((f) => ({ ...f, cons: e.target.value }))} />

          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.wouldRentAgain} onChange={(e) => setForm((f) => ({ ...f, wouldRentAgain: e.target.checked }))} />
              Would rent here again
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.wouldRecommend} onChange={(e) => setForm((f) => ({ ...f, wouldRecommend: e.target.checked }))} />
              Would recommend
            </label>
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary" onClick={() => setStep(4)} disabled={form.body.length < 15}>Preview</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold">Preview</h3>
          <p className="text-sm text-neutral-500">
            Your review will be marked <strong>Unverified Experience</strong> unless linked to a verified rental relationship, and will only go public after moderation.
          </p>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <p className="font-semibold">{form.title || "(no title)"}</p>
            <p className="text-sm text-neutral-600 mt-1">{form.body}</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setStep(3)}>Back</button>
            <button className="btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit review"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

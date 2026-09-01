import { useState } from "react";
import api from "../api/axios.js";
import { DIVISIONS, DIVISION_BN } from "../lib/reportLabels.js";

const TYPES = [
  ["apartment", "Apartment"], ["flat", "Flat"], ["house", "House"], ["room", "Room"],
  ["sublet", "Sublet"], ["hostel_mess", "Hostel / Mess"], ["bachelor_room", "Bachelor Room"],
  ["family_residence", "Family Residence"], ["building", "Building"], ["other", "Other"],
];
const STATUSES = [["available", "Available"], ["rented", "Rented"], ["coming_soon", "Coming Soon"], ["draft", "Draft"]];
const FURNISHING = [["", "—"], ["unfurnished", "Unfurnished"], ["semi_furnished", "Semi-Furnished"], ["furnished", "Furnished"]];
const FEATURES = [
  ["parking", "Parking"], ["lift", "Lift"], ["generator", "Generator"], ["gas", "Gas"],
  ["water", "Water"], ["electricityBackup", "Electricity backup"], ["security", "Security"],
  ["cctv", "CCTV"], ["caretaker", "Caretaker"], ["wifi", "Wi-Fi"], ["rooftop", "Rooftop"],
  ["gym", "Gym"], ["communitySpace", "Community space"], ["washingFacility", "Washing facility"],
];
const TENANTS = [
  ["family", "Family"], ["bachelor", "Bachelor"], ["female", "Female"], ["male", "Male"],
  ["students", "Students"], ["professionals", "Working professionals"],
];
const POLICY_BOOL = [
  ["pets", "Pets allowed"], ["smoking", "Smoking allowed"], ["subletting", "Subletting allowed"],
  ["guests", "Guests allowed"], ["cooking", "Cooking allowed"], ["officeUse", "Office use allowed"],
];

const num = (v) => (v === "" || v === null || v === undefined ? undefined : Number(v));

export default function PropertyForm({ initial, onDone, onCancel }) {
  const editing = !!initial;
  const [f, setF] = useState(() => ({
    name: initial?.name || "",
    propertyType: initial?.propertyType || "apartment",
    listingStatus: initial?.listingStatus || "available",
    description: initial?.description || "",
    address: {
      division: initial?.address?.division || "",
      district: initial?.address?.district || "",
      area: initial?.address?.area || "",
      road: initial?.address?.road || "",
      block: initial?.address?.block || "",
      landmark: initial?.address?.landmark || "",
      addressLine: initial?.address?.addressLine || "",
    },
    location: { mapUrl: initial?.location?.mapUrl || "" },
    bedrooms: initial?.bedrooms ?? 1,
    bathrooms: initial?.bathrooms ?? 1,
    balconies: initial?.balconies ?? 0,
    floor: initial?.floor ?? "",
    totalFloors: initial?.totalFloors ?? "",
    sizeSqft: initial?.sizeSqft ?? "",
    furnishing: initial?.furnishing || "",
    features: { ...Object.fromEntries(FEATURES.map(([k]) => [k, !!initial?.features?.[k]])) },
    rentDetails: {
      monthly: initial?.rentDetails?.monthly ?? "",
      advanceMonths: initial?.rentDetails?.advanceMonths ?? "",
      serviceCharge: initial?.rentDetails?.serviceCharge ?? "",
      electricity: initial?.rentDetails?.electricity ?? "",
      gas: initial?.rentDetails?.gas ?? "",
      water: initial?.rentDetails?.water ?? "",
      internet: initial?.rentDetails?.internet ?? "",
      parkingCharge: initial?.rentDetails?.parkingCharge ?? "",
      otherCharges: initial?.rentDetails?.otherCharges ?? "",
    },
    deposit: initial?.deposit ?? "",
    availableFrom: initial?.availableFrom ? String(initial.availableFrom).slice(0, 10) : "",
    rentalPolicy: {
      allowedTenants: initial?.rentalPolicy?.allowedTenants || [],
      ...Object.fromEntries(POLICY_BOOL.map(([k]) => [k, initial?.rentalPolicy?.[k] ?? (k === "guests" || k === "cooking")])),
      notes: initial?.rentalPolicy?.notes || "",
    },
    amenities: (initial?.amenities || []).join(", "),
    coverPhoto: initial?.coverPhoto || "",
    photos: (initial?.photos || []).join("\n"),
    contact: {
      name: initial?.contact?.name || "",
      phone: initial?.contact?.phone || "",
      whatsapp: initial?.contact?.whatsapp || "",
      showPhone: initial?.contact?.showPhone ?? true,
      showWhatsapp: initial?.contact?.showWhatsapp ?? true,
      allowMessages: initial?.contact?.allowMessages ?? true,
    },
  }));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setIn = (grp, k, v) => setF((p) => ({ ...p, [grp]: { ...p[grp], [k]: v } }));
  const toggleTenant = (v) =>
    setF((p) => ({
      ...p,
      rentalPolicy: {
        ...p.rentalPolicy,
        allowedTenants: p.rentalPolicy.allowedTenants.includes(v)
          ? p.rentalPolicy.allowedTenants.filter((x) => x !== v)
          : [...p.rentalPolicy.allowedTenants, v],
      },
    }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!f.name.trim()) return setErr("Property name is required");
    if (!f.address.division || !f.address.area) return setErr("Division and area are required");
    if (!num(f.rentDetails.monthly)) return setErr("Monthly rent is required");

    const payload = {
      name: f.name.trim(),
      propertyType: f.propertyType,
      listingStatus: f.listingStatus,
      description: f.description,
      address: { ...f.address },
      location: { mapUrl: f.location.mapUrl },
      bedrooms: num(f.bedrooms),
      bathrooms: num(f.bathrooms),
      balconies: num(f.balconies),
      floor: num(f.floor),
      totalFloors: num(f.totalFloors),
      sizeSqft: num(f.sizeSqft),
      furnishing: f.furnishing,
      features: f.features,
      rentDetails: Object.fromEntries(Object.entries(f.rentDetails).map(([k, v]) => [k, num(v)])),
      deposit: num(f.deposit),
      availableFrom: f.availableFrom || undefined,
      rentalPolicy: { ...f.rentalPolicy },
      amenities: f.amenities.split(",").map((s) => s.trim()).filter(Boolean),
      coverPhoto: f.coverPhoto.trim(),
      photos: f.photos.split("\n").map((s) => s.trim()).filter(Boolean),
      contact: f.contact,
    };

    setSaving(true);
    try {
      if (editing) await api.patch(`/landlord/properties/${initial.id}`, payload);
      else await api.post("/landlord/properties", payload);
      onDone();
    } catch (e2) {
      setErr(e2.response?.data?.message || "Save failed");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{editing ? "Edit listing" : "নতুন বাসা যোগ করুন"}</h2>
        <button type="button" onClick={onCancel} className="text-sm text-neutral-400 hover:text-neutral-700">Cancel</button>
      </div>
      {err && <p className="text-sm text-rose-600">{err}</p>}

      <Card title="১ · মৌলিক তথ্য">
        <L label="Property name *"><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Green View Apartment" /></L>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <L label="Type *">
            <select className="input" value={f.propertyType} onChange={(e) => set("propertyType", e.target.value)}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </L>
          <L label="Status">
            <select className="input" value={f.listingStatus} onChange={(e) => set("listingStatus", e.target.value)}>
              {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </L>
        </div>
        <L label="Short description"><textarea className="input min-h-[70px]" value={f.description} onChange={(e) => set("description", e.target.value)} /></L>
      </Card>

      <Card title="২ · অবস্থান">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <L label="Division *">
            <select className="input" value={f.address.division} onChange={(e) => setIn("address", "division", e.target.value)}>
              <option value="">—</option>
              {DIVISIONS.map((d) => <option key={d} value={d}>{DIVISION_BN[d]}</option>)}
            </select>
          </L>
          <L label="District"><input className="input" value={f.address.district} onChange={(e) => setIn("address", "district", e.target.value)} /></L>
          <L label="Area *"><input className="input" value={f.address.area} onChange={(e) => setIn("address", "area", e.target.value)} placeholder="Mirpur 10" /></L>
          <L label="City"><input className="input" value={f.address.addressLine} onChange={(e) => setIn("address", "addressLine", e.target.value)} placeholder="optional" /></L>
          <L label="Road"><input className="input" value={f.address.road} onChange={(e) => setIn("address", "road", e.target.value)} /></L>
          <L label="Block"><input className="input" value={f.address.block} onChange={(e) => setIn("address", "block", e.target.value)} /></L>
        </div>
        <L label="Landmark (approximate — no exact unit)"><input className="input" value={f.address.landmark} onChange={(e) => setIn("address", "landmark", e.target.value)} placeholder="Near Mirpur 10 bus stand" /></L>
        <L label="Google Maps link"><input className="input" value={f.location.mapUrl} onChange={(e) => setIn("location", "mapUrl", e.target.value)} /></L>
      </Card>

      <Card title="৩ · বিস্তারিত">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <L label="Bedrooms"><input type="number" className="input" value={f.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} /></L>
          <L label="Bathrooms"><input type="number" className="input" value={f.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} /></L>
          <L label="Balconies"><input type="number" className="input" value={f.balconies} onChange={(e) => set("balconies", e.target.value)} /></L>
          <L label="Floor"><input type="number" className="input" value={f.floor} onChange={(e) => set("floor", e.target.value)} /></L>
          <L label="Total floors"><input type="number" className="input" value={f.totalFloors} onChange={(e) => set("totalFloors", e.target.value)} /></L>
          <L label="Size (sq ft)"><input type="number" className="input" value={f.sizeSqft} onChange={(e) => set("sizeSqft", e.target.value)} /></L>
        </div>
        <L label="Furnishing">
          <select className="input" value={f.furnishing} onChange={(e) => set("furnishing", e.target.value)}>
            {FURNISHING.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </L>
        <div className="flex flex-wrap gap-2 pt-1">
          {FEATURES.map(([k, l]) => (
            <Chip key={k} active={f.features[k]} onClick={() => setIn("features", k, !f.features[k])}>{l}</Chip>
          ))}
        </div>
      </Card>

      <Card title="৪ · ভাড়ার তথ্য">
        <L label="Monthly rent (৳) *"><input type="number" className="input" value={f.rentDetails.monthly} onChange={(e) => setIn("rentDetails", "monthly", e.target.value)} /></L>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <L label="Advance (months)"><input type="number" className="input" value={f.rentDetails.advanceMonths} onChange={(e) => setIn("rentDetails", "advanceMonths", e.target.value)} /></L>
          <L label="Service charge"><input type="number" className="input" value={f.rentDetails.serviceCharge} onChange={(e) => setIn("rentDetails", "serviceCharge", e.target.value)} /></L>
          <L label="Parking charge"><input type="number" className="input" value={f.rentDetails.parkingCharge} onChange={(e) => setIn("rentDetails", "parkingCharge", e.target.value)} /></L>
          <L label="Electricity"><input type="number" className="input" value={f.rentDetails.electricity} onChange={(e) => setIn("rentDetails", "electricity", e.target.value)} /></L>
          <L label="Gas"><input type="number" className="input" value={f.rentDetails.gas} onChange={(e) => setIn("rentDetails", "gas", e.target.value)} /></L>
          <L label="Water"><input type="number" className="input" value={f.rentDetails.water} onChange={(e) => setIn("rentDetails", "water", e.target.value)} /></L>
          <L label="Internet"><input type="number" className="input" value={f.rentDetails.internet} onChange={(e) => setIn("rentDetails", "internet", e.target.value)} /></L>
          <L label="Other charges"><input type="number" className="input" value={f.rentDetails.otherCharges} onChange={(e) => setIn("rentDetails", "otherCharges", e.target.value)} /></L>
          <L label="Available from"><input type="date" className="input" value={f.availableFrom} onChange={(e) => set("availableFrom", e.target.value)} /></L>
        </div>
      </Card>

      <Card title="৫ · ভাড়ার নিয়ম">
        <p className="text-xs text-neutral-500">Who can rent?</p>
        <div className="flex flex-wrap gap-2">
          {TENANTS.map(([v, l]) => (
            <Chip key={v} active={f.rentalPolicy.allowedTenants.includes(v)} onClick={() => toggleTenant(v)}>{l}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {POLICY_BOOL.map(([k, l]) => (
            <Chip key={k} active={f.rentalPolicy[k]} onClick={() => setIn("rentalPolicy", k, !f.rentalPolicy[k])}>{l}</Chip>
          ))}
        </div>
        <L label="Extra rules"><textarea className="input min-h-[60px]" value={f.rentalPolicy.notes} onChange={(e) => setIn("rentalPolicy", "notes", e.target.value)} /></L>
      </Card>

      <Card title="৬ · সুবিধা ও ছবি">
        <L label="Other amenities (comma separated)"><input className="input" value={f.amenities} onChange={(e) => set("amenities", e.target.value)} placeholder="Rooftop garden, prayer room" /></L>
        <L label="Cover photo URL"><input className="input" value={f.coverPhoto} onChange={(e) => set("coverPhoto", e.target.value)} placeholder="https://…" /></L>
        <L label="Photo URLs (one per line)"><textarea className="input min-h-[70px] font-mono text-xs" value={f.photos} onChange={(e) => set("photos", e.target.value)} /></L>
        <p className="text-xs text-neutral-400">File upload comes with cloud storage — for now paste image links.</p>
      </Card>

      <Card title="৭ · যোগাযোগ (ফ্রি)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <L label="Contact name"><input className="input" value={f.contact.name} onChange={(e) => setIn("contact", "name", e.target.value)} /></L>
          <L label="Phone"><input className="input" value={f.contact.phone} onChange={(e) => setIn("contact", "phone", e.target.value)} /></L>
          <L label="WhatsApp"><input className="input" value={f.contact.whatsapp} onChange={(e) => setIn("contact", "whatsapp", e.target.value)} /></L>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Chip active={f.contact.showPhone} onClick={() => setIn("contact", "showPhone", !f.contact.showPhone)}>Show phone publicly</Chip>
          <Chip active={f.contact.showWhatsapp} onClick={() => setIn("contact", "showWhatsapp", !f.contact.showWhatsapp)}>Show WhatsApp</Chip>
          <Chip active={f.contact.allowMessages} onClick={() => setIn("contact", "allowMessages", !f.contact.allowMessages)}>Allow messages</Chip>
        </div>
      </Card>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : editing ? "Save listing" : "Publish listing"}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

const Card = ({ title, children }) => (
  <div className="card p-5 space-y-3">
    <p className="font-semibold text-sm">{title}</p>
    {children}
  </div>
);
const L = ({ label, children }) => (
  <label className="block"><span className="text-xs text-neutral-500">{label}</span><div className="mt-1">{children}</div></label>
);
const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1 text-sm ${
      active ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300" : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-brand-400"
    }`}
  >
    {children}
  </button>
);

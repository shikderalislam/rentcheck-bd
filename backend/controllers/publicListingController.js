import asyncHandler from "express-async-handler";
import crypto from "crypto";
import slugify from "slugify";
import Landlord from "../models/Landlord.js";
import Property, { PROPERTY_TYPES } from "../models/Property.js";
import { applyListingFields, uniquePropertySlug } from "./landlordDashController.js";
import { recordAudit } from "../utils/audit.js";

const BD_DIVISIONS = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Mymensingh"];

function fingerprint(req) {
  const raw = `${req.ip}|${req.headers["user-agent"] || ""}|${new Date().toDateString()}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// @route POST /api/public/property-listings   (anonymous — creates an unverified listing)
export const submitPublicListing = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const addr = b.address || {};

  if (!b.name || !b.propertyType || !PROPERTY_TYPES.includes(b.propertyType)) {
    res.status(400);
    throw new Error("Property name and a valid type are required");
  }
  if (!addr.area || !addr.division || !BD_DIVISIONS.includes(addr.division)) {
    res.status(400);
    throw new Error("A valid division and an area are required");
  }
  const monthly = Number(b.rentDetails?.monthly);
  if (!(monthly > 0)) {
    res.status(400);
    throw new Error("Monthly rent is required");
  }
  const phone = String(b.contact?.phone || "").trim();
  if (!/^(\+?880|0)1[3-9]\d{8}$/.test(phone.replace(/[\s-]/g, ""))) {
    res.status(400);
    throw new Error("A valid Bangladeshi contact phone number is required");
  }

  // Anonymous listings get their own unclaimed landlord profile so a real
  // landlord can claim it later. Nothing is marked verified.
  const llName = String(b.contact?.name || "").trim() || `Listed by owner — ${addr.area}`;
  const landlord = await Landlord.create({
    name: llName.slice(0, 120),
    slug: await (async () => {
      const base = slugify(llName, { lower: true, strict: true }) || "owner";
      let s = base;
      let n = 1;
      while (await Landlord.findOne({ slug: s })) s = `${base}-${n++}`;
      return s;
    })(),
    isClaimable: true,
    isVerified: false,
  });

  const property = new Property({
    name: String(b.name).trim().slice(0, 160),
    slug: await uniquePropertySlug(b.name, addr.area),
    landlord: landlord._id,
    listedBy: null,
    propertyType: b.propertyType,
    listingStatus: "available",
    isVerified: false,
    address: {
      addressLine: addr.addressLine || addr.landmark || addr.area,
      area: addr.area,
      district: addr.district || addr.area,
      city: addr.city || addr.district || addr.area,
      division: addr.division,
      road: addr.road || "",
      block: addr.block || "",
      landmark: addr.landmark || "",
    },
    rent: { min: monthly, max: monthly },
  });
  applyListingFields(property, { ...b, address: undefined, listingStatus: undefined });
  await property.save();

  await recordAudit({
    req,
    actor: null,
    action: "property.public_submit",
    entityType: "Property",
    entityId: property._id,
    metadata: { anonymous: true, area: property.address.area, fp: fingerprint(req) },
  });

  res.status(201).json({
    success: true,
    message: "Your listing is live. It is marked unverified until our team or a claimed landlord confirms it.",
    property: { id: property._id, slug: property.slug, name: property.name },
  });
});

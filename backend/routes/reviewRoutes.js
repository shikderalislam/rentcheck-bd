import express from "express";
import {
  createRentalRelationship,
  addRentalEvidence,
  verifyRentalRelationship,
  submitReview,
  getMyReviews,
  respondToReview,
  reportReview,
  markHelpful,
} from "../controllers/reviewController.js";
import { protect, requireRole, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// Rental relationships
router.post("/rentals", protect, createRentalRelationship);
router.post("/rentals/:id/evidence", protect, addRentalEvidence);
router.put("/rentals/:id/verify", protect, requireRole("moderator", "admin", "super_admin"), verifyRentalRelationship);

// Reviews
router.post("/reviews", protect, submitReview);
router.get("/reviews/mine", protect, getMyReviews);
router.post("/reviews/:id/response", protect, requireRole("landlord", "property_manager", "admin", "super_admin"), respondToReview);
// Anyone can flag a review — logged-in users are deduped by id, anonymous
// reporters by a coarse non-PII fingerprint.
router.post("/reviews/:id/report", optionalAuth, reportReview);
router.post("/reviews/:id/helpful", protect, markHelpful);

export default router;

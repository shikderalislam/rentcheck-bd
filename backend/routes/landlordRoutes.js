import express from "express";
import { searchLandlords, getLandlordBySlug, createLandlord, claimLandlord } from "../controllers/landlordController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/", searchLandlords);
router.get("/:slug", getLandlordBySlug);
router.post("/", protect, requireRole("admin", "super_admin"), createLandlord);
router.post("/:id/claim", protect, requireRole("landlord", "property_manager"), claimLandlord);

export default router;

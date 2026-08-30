import express from "express";
import { searchProperties, getPropertyBySlug, createProperty } from "../controllers/propertyController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/", searchProperties);
router.get("/:slug", getPropertyBySlug);
router.post("/", protect, requireRole("landlord", "property_manager", "admin", "super_admin"), createProperty);

export default router;

import express from "express";
import { protect, requireRoleGroup } from "../middleware/auth.js";
import {
  getLandlordSummary,
  getLandlordReviews,
  getMyProperties,
  getMyProperty,
  createMyProperty,
  updateMyProperty,
  deleteMyProperty,
} from "../controllers/landlordDashController.js";

const router = express.Router();
router.use(protect, requireRoleGroup("LANDLORD", "SUPER_ADMIN"));

router.get("/summary", getLandlordSummary);
router.get("/reviews", getLandlordReviews);

router.get("/properties", getMyProperties);
router.post("/properties", createMyProperty);
router.get("/properties/:id", getMyProperty);
router.patch("/properties/:id", updateMyProperty);
router.delete("/properties/:id", deleteMyProperty);

export default router;

import express from "express";
import { protect, requireRoleGroup } from "../middleware/auth.js";
import { getLandlordSummary, getLandlordReviews } from "../controllers/landlordDashController.js";

const router = express.Router();
router.use(protect, requireRoleGroup("LANDLORD", "SUPER_ADMIN"));

router.get("/summary", getLandlordSummary);
router.get("/reviews", getLandlordReviews);

export default router;

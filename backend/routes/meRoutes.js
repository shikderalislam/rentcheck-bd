import express from "express";
import { protect } from "../middleware/auth.js";
import {
  getMySummary,
  getMyReports,
  updateMyReport,
  deleteMyReport,
  getMyConfirmations,
} from "../controllers/meController.js";

const router = express.Router();
router.use(protect);

router.get("/summary", getMySummary);
router.get("/reports", getMyReports);
router.patch("/reports/:id", updateMyReport);
router.delete("/reports/:id", deleteMyReport);
router.get("/confirmations", getMyConfirmations);

export default router;

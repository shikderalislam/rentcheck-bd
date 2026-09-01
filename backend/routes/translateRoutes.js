import express from "express";
import rateLimit from "express-rate-limit";
import { translateBatch } from "../controllers/translateController.js";

const router = express.Router();

// Generous — the client caches hard (localStorage + DB memory) so real
// provider traffic is a fraction of this.
const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

router.post("/", limiter, translateBatch);

export default router;

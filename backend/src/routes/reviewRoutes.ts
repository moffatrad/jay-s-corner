import { Router } from "express";
import * as reviewController from "../controllers/reviewController";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.get("/product/:productId", asyncHandler(reviewController.listProductReviews));
router.get("/mine", requireAuth, asyncHandler(reviewController.listMyReviews));
router.get("/", requireAdmin, asyncHandler(reviewController.listAllReviews));
router.post("/", requireAuth, asyncHandler(reviewController.upsertReview));
router.delete("/:id", requireAuth, asyncHandler(reviewController.deleteReview));

export default router;

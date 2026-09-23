import { Router } from "express";
import * as cartController from "../controllers/cartController";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.get("/", optionalAuth, asyncHandler(cartController.getCart));
router.post("/", optionalAuth, asyncHandler(cartController.addToCart));
router.post("/sync", requireAuth, asyncHandler(cartController.syncCart));
router.put("/:itemId", optionalAuth, asyncHandler(cartController.updateCartItem));
router.delete("/:itemId", optionalAuth, asyncHandler(cartController.removeCartItem));

export default router;

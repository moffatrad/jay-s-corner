import { Router } from "express";
import * as orderController from "../controllers/orderController";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.get("/mine", requireAuth, asyncHandler(orderController.listMyOrders));
router.get("/", requireAdmin, asyncHandler(orderController.listAllOrders));

export default router;

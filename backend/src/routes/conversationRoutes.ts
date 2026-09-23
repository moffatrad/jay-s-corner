import { Router } from "express";
import * as conversationController from "../controllers/conversationController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.post("/", requireAuth, asyncHandler(conversationController.createConversation));
router.get("/", requireAuth, asyncHandler(conversationController.listConversations));
router.get("/:id/messages", requireAuth, asyncHandler(conversationController.getMessages));
router.post("/:id/messages", requireAuth, asyncHandler(conversationController.postMessage));
router.put("/:id/status", requireAuth, asyncHandler(conversationController.updateStatus));

export default router;

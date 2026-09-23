import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import * as uploadController from "../controllers/uploadController";
import { requireAuth } from "../middleware/auth";
import { imageUpload } from "../lib/upload";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

function handleUpload(req: Request, res: Response, next: NextFunction) {
  imageUpload.single("image")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

router.post("/", requireAuth, handleUpload, asyncHandler(uploadController.uploadImage));

export default router;

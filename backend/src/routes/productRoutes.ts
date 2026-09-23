import { Router } from "express";
import * as productController from "../controllers/productController";
import { requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.get("/", asyncHandler(productController.listProducts));
router.get("/categories", asyncHandler(productController.listCategories));
router.get("/:id", asyncHandler(productController.getProduct));

router.post("/", requireAdmin, asyncHandler(productController.createProduct));
router.put("/:id", requireAdmin, asyncHandler(productController.updateProduct));
router.delete("/:id", requireAdmin, asyncHandler(productController.deleteProduct));

export default router;

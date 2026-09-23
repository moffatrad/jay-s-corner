import type { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { reviews } from "../db/schema";

function summarize(rows: { rating: number }[]) {
  const count = rows.length;
  const average = count === 0 ? 0 : rows.reduce((sum, r) => sum + r.rating, 0) / count;
  return { average: Math.round(average * 10) / 10, count };
}

/** GET /api/reviews/product/:productId — public: a product's reviews plus its rating summary. */
export async function listProductReviews(req: Request, res: Response) {
  const rows = await db.query.reviews.findMany({
    where: eq(reviews.productId, req.params.productId),
    orderBy: desc(reviews.createdAt),
    with: { customer: { columns: { id: true, name: true } } },
  });
  res.json({ reviews: rows, ...summarize(rows) });
}

/** GET /api/reviews/mine — the logged-in customer's own reviews. */
export async function listMyReviews(req: Request, res: Response) {
  const rows = await db.query.reviews.findMany({
    where: eq(reviews.customerId, req.user!.sub),
    orderBy: desc(reviews.createdAt),
    with: { product: { columns: { id: true, name: true, images: true } } },
  });
  res.json({ reviews: rows });
}

/** GET /api/reviews — admin: every review, newest first, with product + customer names. */
export async function listAllReviews(_req: Request, res: Response) {
  const rows = await db.query.reviews.findMany({
    orderBy: desc(reviews.createdAt),
    with: {
      product: { columns: { id: true, name: true, images: true } },
      customer: { columns: { id: true, name: true, email: true } },
    },
  });
  res.json({ reviews: rows });
}

const MAX_REVIEW_IMAGES = 5;

/** POST /api/reviews — customer creates or updates their own review for a product (one per product). */
export async function upsertReview(req: Request, res: Response) {
  const { productId, rating, comment, images } = req.body ?? {};
  const customerId = req.user!.sub;

  const ratingNum = Number(rating);
  if (!productId || typeof productId !== "string") {
    return res.status(400).json({ error: "productId is required." });
  }
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: "rating must be a whole number from 1 to 5." });
  }

  const imageList = Array.isArray(images)
    ? images.filter((url): url is string => typeof url === "string" && url.trim().length > 0).slice(0, MAX_REVIEW_IMAGES)
    : [];

  const existing = await db.query.reviews.findFirst({
    where: and(eq(reviews.productId, productId), eq(reviews.customerId, customerId)),
  });

  const [review] = existing
    ? await db
        .update(reviews)
        .set({ rating: ratingNum, comment: String(comment ?? "").trim(), images: imageList, updatedAt: new Date() })
        .where(eq(reviews.id, existing.id))
        .returning()
    : await db
        .insert(reviews)
        .values({ productId, customerId, rating: ratingNum, comment: String(comment ?? "").trim(), images: imageList })
        .returning();

  res.status(existing ? 200 : 201).json({ review });
}

/** DELETE /api/reviews/:id — a customer removing their own review. */
export async function deleteReview(req: Request, res: Response) {
  const review = await db.query.reviews.findFirst({ where: eq(reviews.id, req.params.id) });
  if (!review) return res.status(404).json({ error: "Review not found." });
  if (review.customerId !== req.user!.sub) {
    return res.status(403).json({ error: "You can only delete your own review." });
  }
  await db.delete(reviews).where(eq(reviews.id, review.id));
  res.status(204).send();
}

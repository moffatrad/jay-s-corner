import type { Request, Response } from "express";
import { and, asc, desc, eq, gte, ilike, lte, SQL } from "drizzle-orm";
import { db } from "../db/client";
import { products } from "../db/schema";

export async function listProducts(req: Request, res: Response) {
  const { category, minPrice, maxPrice, inStock, search, sort } = req.query;

  const conditions: SQL[] = [eq(products.isActive, true)];

  if (category && typeof category === "string") {
    conditions.push(eq(products.category, category));
  }
  if (minPrice && !Number.isNaN(Number(minPrice))) {
    conditions.push(gte(products.price, String(Number(minPrice))));
  }
  if (maxPrice && !Number.isNaN(Number(maxPrice))) {
    conditions.push(lte(products.price, String(Number(maxPrice))));
  }
  if (inStock === "true") {
    conditions.push(gte(products.stockQuantity, 1));
  }
  if (search && typeof search === "string" && search.trim()) {
    conditions.push(ilike(products.name, `%${search.trim()}%`));
  }

  let orderBy = desc(products.createdAt);
  if (sort === "price_asc") orderBy = asc(products.price) as unknown as typeof orderBy;
  if (sort === "price_desc") orderBy = desc(products.price) as unknown as typeof orderBy;
  if (sort === "name_asc") orderBy = asc(products.name) as unknown as typeof orderBy;

  const rows = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(orderBy);

  res.json({ products: rows });
}

export async function listCategories(_req: Request, res: Response) {
  const rows = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(eq(products.isActive, true));
  res.json({ categories: rows.map((r) => r.category).sort() });
}

export async function getProduct(req: Request, res: Response) {
  const product = await db.query.products.findFirst({ where: eq(products.id, req.params.id) });
  if (!product) return res.status(404).json({ error: "Product not found." });
  res.json({ product });
}

const AVAILABILITY_VALUES = ["READILY_AVAILABLE", "BY_ORDER"] as const;

export async function createProduct(req: Request, res: Response) {
  const { name, description, price, images, category, stockQuantity, availability, isActive } = req.body ?? {};

  if (!name || !description || price === undefined || !category) {
    return res.status(400).json({ error: "name, description, price and category are required." });
  }

  const [product] = await db
    .insert(products)
    .values({
      name: String(name).trim(),
      description: String(description),
      price: String(price),
      images: Array.isArray(images) ? images : [],
      category: String(category).trim(),
      stockQuantity: Number.isFinite(Number(stockQuantity)) ? Number(stockQuantity) : 0,
      availability: AVAILABILITY_VALUES.includes(availability) ? availability : "READILY_AVAILABLE",
      isActive: isActive ?? true,
    })
    .returning();

  res.status(201).json({ product });
}

export async function updateProduct(req: Request, res: Response) {
  const { name, description, price, images, category, stockQuantity, availability, isActive } = req.body ?? {};

  const [updated] = await db
    .update(products)
    .set({
      ...(name !== undefined && { name: String(name).trim() }),
      ...(description !== undefined && { description: String(description) }),
      ...(price !== undefined && { price: String(price) }),
      ...(images !== undefined && { images: Array.isArray(images) ? images : [] }),
      ...(category !== undefined && { category: String(category).trim() }),
      ...(stockQuantity !== undefined && { stockQuantity: Number(stockQuantity) }),
      ...(availability !== undefined &&
        AVAILABILITY_VALUES.includes(availability) && { availability }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      updatedAt: new Date(),
    })
    .where(eq(products.id, req.params.id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Product not found." });
  res.json({ product: updated });
}

export async function deleteProduct(req: Request, res: Response) {
  const [deleted] = await db.delete(products).where(eq(products.id, req.params.id)).returning();
  if (!deleted) return res.status(404).json({ error: "Product not found." });
  res.status(204).send();
}

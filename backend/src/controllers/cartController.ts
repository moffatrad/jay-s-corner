import type { Request, Response } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { cartItems, products } from "../db/schema";

function getSessionId(req: Request): string | undefined {
  const header = req.headers["x-session-id"];
  if (typeof header === "string" && header.trim()) return header.trim();
  return undefined;
}

/** Resolves the (userId | sessionId) identity for the requesting cart owner. */
function resolveOwner(req: Request, res: Response): { userId?: string; sessionId?: string } | null {
  const userId = req.user?.sub;
  const sessionId = getSessionId(req);
  if (!userId && !sessionId) {
    res.status(400).json({ error: "Missing auth token or x-session-id header for guest cart." });
    return null;
  }
  return { userId, sessionId: userId ? undefined : sessionId };
}

function ownerWhere(owner: { userId?: string; sessionId?: string }) {
  return owner.userId ? eq(cartItems.userId, owner.userId) : eq(cartItems.sessionId, owner.sessionId!);
}

async function serializeCart(owner: { userId?: string; sessionId?: string }) {
  const rows = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      product: products,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(ownerWhere(owner));

  const items = rows.map((row) => ({
    id: row.id,
    quantity: row.quantity,
    product: row.product,
    lineTotal: Number(row.product.price) * row.quantity,
  }));
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, subtotal, itemCount };
}

export async function getCart(req: Request, res: Response) {
  const owner = resolveOwner(req, res);
  if (!owner) return;
  res.json(await serializeCart(owner));
}

export async function addToCart(req: Request, res: Response) {
  const owner = resolveOwner(req, res);
  if (!owner) return;

  const { productId, quantity } = req.body ?? {};
  if (!productId) return res.status(400).json({ error: "productId is required." });
  const qty = Number.isFinite(Number(quantity)) && Number(quantity) > 0 ? Number(quantity) : 1;

  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!product) return res.status(404).json({ error: "Product not found." });

  const existing = await db.query.cartItems.findFirst({
    where: and(ownerWhere(owner), eq(cartItems.productId, productId)),
  });

  if (existing) {
    await db
      .update(cartItems)
      .set({ quantity: existing.quantity + qty, updatedAt: new Date() })
      .where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({
      userId: owner.userId,
      sessionId: owner.sessionId,
      productId,
      quantity: qty,
    });
  }

  res.status(201).json(await serializeCart(owner));
}

export async function updateCartItem(req: Request, res: Response) {
  const owner = resolveOwner(req, res);
  if (!owner) return;

  const { quantity } = req.body ?? {};
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty < 1) {
    return res.status(400).json({ error: "quantity must be a positive number." });
  }

  const [updated] = await db
    .update(cartItems)
    .set({ quantity: qty, updatedAt: new Date() })
    .where(and(eq(cartItems.id, req.params.itemId), ownerWhere(owner)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Cart item not found." });
  res.json(await serializeCart(owner));
}

export async function removeCartItem(req: Request, res: Response) {
  const owner = resolveOwner(req, res);
  if (!owner) return;

  const [deleted] = await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, req.params.itemId), ownerWhere(owner)))
    .returning();

  if (!deleted) return res.status(404).json({ error: "Cart item not found." });
  res.json(await serializeCart(owner));
}

/** Merges a guest session cart into the now-logged-in user's cart. Called right after login. */
export async function syncCart(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Authentication required." });
  const sessionId = getSessionId(req);
  if (!sessionId) return res.json(await serializeCart({ userId: req.user.sub }));

  const guestItems = await db.query.cartItems.findMany({ where: eq(cartItems.sessionId, sessionId) });

  for (const guestItem of guestItems) {
    const existing = await db.query.cartItems.findFirst({
      where: and(eq(cartItems.userId, req.user.sub), eq(cartItems.productId, guestItem.productId)),
    });
    if (existing) {
      await db
        .update(cartItems)
        .set({ quantity: existing.quantity + guestItem.quantity, updatedAt: new Date() })
        .where(eq(cartItems.id, existing.id));
      await db.delete(cartItems).where(eq(cartItems.id, guestItem.id));
    } else {
      await db
        .update(cartItems)
        .set({ userId: req.user.sub, sessionId: null, updatedAt: new Date() })
        .where(eq(cartItems.id, guestItem.id));
    }
  }

  res.json(await serializeCart({ userId: req.user.sub }));
}

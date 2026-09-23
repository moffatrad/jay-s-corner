import type { Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { orders } from "../db/schema";

/** GET /api/orders/mine — the logged-in customer's own orders, newest first. */
export async function listMyOrders(req: Request, res: Response) {
  const rows = await db.query.orders.findMany({
    where: eq(orders.customerId, req.user!.sub),
    orderBy: desc(orders.createdAt),
  });
  res.json({ orders: rows });
}

/** GET /api/orders — admin: every order across every customer, newest first. */
export async function listAllOrders(_req: Request, res: Response) {
  const rows = await db.query.orders.findMany({
    orderBy: desc(orders.createdAt),
    with: { customer: { columns: { id: true, name: true, email: true } } },
  });
  res.json({ orders: rows });
}

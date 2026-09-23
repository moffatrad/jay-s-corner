import type { Request, Response } from "express";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "../db/client";
import { cartItems, conversations, messages, orders, products, users } from "../db/schema";
import { getIO, conversationRoom, ADMIN_ROOM } from "../sockets/registry";

async function getSeller() {
  const seller = await db.query.users.findFirst({ where: eq(users.role, "ADMIN") });
  if (!seller) throw new Error("No admin/seller account exists yet. Run the seed script first.");
  return seller;
}

function isParticipant(conversation: { customerId: string; sellerId: string }, userId: string) {
  return conversation.customerId === userId || conversation.sellerId === userId;
}

/** Builds the structured order-summary payload from the caller's current cart. */
async function buildOrderSummaryFromCart(userId: string) {
  const rows = await db
    .select({ quantity: cartItems.quantity, product: products })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId));

  const items = rows.map((row) => ({
    productId: row.product.id,
    name: row.product.name,
    price: Number(row.product.price),
    quantity: row.quantity,
    lineTotal: Number(row.product.price) * row.quantity,
  }));
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { items, total };
}

/** POST /api/conversations — "Checkout": creates (or reuses) a conversation seeded with an order summary. */
export async function createConversation(req: Request, res: Response) {
  const customerId = req.user!.sub;
  const seller = await getSeller();

  const { items, total } = await buildOrderSummaryFromCart(customerId);
  if (items.length === 0) {
    return res.status(400).json({ error: "Your cart is empty — add items before checking out." });
  }

  const [conversation] = await db
    .insert(conversations)
    .values({ customerId, sellerId: seller.id, status: "NEW", lastMessageAt: new Date() })
    .returning();

  const [orderSummaryMessage] = await db
    .insert(messages)
    .values({
      conversationId: conversation.id,
      senderId: customerId,
      type: "ORDER_SUMMARY",
      content: JSON.stringify({ items, total }),
    })
    .returning();

  await db.insert(orders).values({
    conversationId: conversation.id,
    customerId,
    items,
    total: String(total),
    status: "NEW",
  });

  // Checkout clears the cart — the order now lives in the conversation/order record.
  await db.delete(cartItems).where(eq(cartItems.userId, customerId));

  const io = getIO();
  if (io) {
    io.to(ADMIN_ROOM).emit("conversation:new", {
      conversationId: conversation.id,
      customerId,
      total,
    });
  }

  res.status(201).json({ conversation, message: orderSummaryMessage });
}

/** GET /api/conversations — scoped to the caller: their own threads, or every thread for the admin. */
export async function listConversations(req: Request, res: Response) {
  const isAdmin = req.user!.role === "ADMIN";

  const rows = await db.query.conversations.findMany({
    where: isAdmin ? eq(conversations.sellerId, req.user!.sub) : eq(conversations.customerId, req.user!.sub),
    orderBy: desc(conversations.lastMessageAt),
    with: {
      customer: { columns: { id: true, name: true, email: true } },
      order: true,
    },
  });

  const withUnread = rows.map((c) => {
    const lastReadAt = isAdmin ? c.adminLastReadAt : c.customerLastReadAt;
    const unread = !lastReadAt || c.lastMessageAt > lastReadAt;
    return { ...c, unread };
  });

  res.json({ conversations: withUnread });
}

/** GET /api/conversations/:id/messages */
export async function getMessages(req: Request, res: Response) {
  const conversation = await db.query.conversations.findFirst({ where: eq(conversations.id, req.params.id) });
  if (!conversation) return res.status(404).json({ error: "Conversation not found." });
  if (!isParticipant(conversation, req.user!.sub)) {
    return res.status(403).json({ error: "You do not have access to this conversation." });
  }

  const rows = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversation.id),
    orderBy: messages.createdAt,
  });

  // Mark as read for whichever side is asking.
  const isAdmin = req.user!.role === "ADMIN";
  await db
    .update(conversations)
    .set(isAdmin ? { adminLastReadAt: new Date() } : { customerLastReadAt: new Date() })
    .where(eq(conversations.id, conversation.id));

  res.json({ conversation, messages: rows });
}

/** POST /api/conversations/:id/messages — REST fallback for sending (primary path is the socket event). */
export async function postMessage(req: Request, res: Response) {
  const conversation = await db.query.conversations.findFirst({ where: eq(conversations.id, req.params.id) });
  if (!conversation) return res.status(404).json({ error: "Conversation not found." });
  if (!isParticipant(conversation, req.user!.sub)) {
    return res.status(403).json({ error: "You do not have access to this conversation." });
  }

  const { content, type } = req.body ?? {};
  if (!content || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "content is required." });
  }

  const [message] = await db
    .insert(messages)
    .values({
      conversationId: conversation.id,
      senderId: req.user!.sub,
      type: type === "IMAGE" ? "IMAGE" : "TEXT",
      content: content.trim(),
    })
    .returning();

  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversation.id));

  const io = getIO();
  if (io) {
    io.to(conversationRoom(conversation.id)).emit("message:receive", message);
    io.to(ADMIN_ROOM).emit("conversation:updated", { conversationId: conversation.id });
  }

  res.status(201).json({ message });
}

/** PUT /api/conversations/:id/status — admin sets a status tag (New, Confirmed, Paid, Shipped, Completed). */
export async function updateStatus(req: Request, res: Response) {
  const { status } = req.body ?? {};
  const allowed = ["NEW", "CONFIRMED", "PAID", "SHIPPED", "COMPLETED"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
  }

  const conversation = await db.query.conversations.findFirst({ where: eq(conversations.id, req.params.id) });
  if (!conversation) return res.status(404).json({ error: "Conversation not found." });
  if (conversation.sellerId !== req.user!.sub) {
    return res.status(403).json({ error: "Only the seller can update conversation status." });
  }

  const [updated] = await db
    .update(conversations)
    .set({ status, updatedAt: new Date() })
    .where(eq(conversations.id, conversation.id))
    .returning();

  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.conversationId, conversation.id));

  const io = getIO();
  if (io) {
    io.to(conversationRoom(conversation.id)).emit("conversation:status", { conversationId: conversation.id, status });
  }

  res.json({ conversation: updated });
}

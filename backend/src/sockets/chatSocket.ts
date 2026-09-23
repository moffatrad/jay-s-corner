import type { Server, Socket } from "socket.io";
import { eq } from "drizzle-orm";
import { verifyToken } from "../lib/jwt";
import { db } from "../db/client";
import { conversations, messages } from "../db/schema";
import { setIO, conversationRoom, ADMIN_ROOM } from "./registry";

interface AuthedSocket extends Socket {
  data: {
    userId: string;
    role: "CUSTOMER" | "ADMIN";
  };
}

export function initChatSocket(io: Server) {
  setIO(io);

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.query?.token as string | undefined);
    if (!token) return next(new Error("Authentication token required."));
    try {
      const payload = verifyToken(token);
      (socket as AuthedSocket).data = { userId: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error("Invalid or expired token."));
    }
  });

  io.on("connection", (socket: Socket) => {
    const s = socket as AuthedSocket;

    if (s.data.role === "ADMIN") {
      s.join(ADMIN_ROOM);
    }

    // Client joins a conversation room to receive/send its messages in real time.
    s.on("conversation:join", async (conversationId: string, ack?: (ok: boolean, err?: string) => void) => {
      const conversation = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
      if (!conversation) return ack?.(false, "Conversation not found.");
      const allowed = conversation.customerId === s.data.userId || conversation.sellerId === s.data.userId;
      if (!allowed) return ack?.(false, "Not authorized for this conversation.");
      s.join(conversationRoom(conversationId));
      ack?.(true);
    });

    s.on("conversation:leave", (conversationId: string) => {
      s.leave(conversationRoom(conversationId));
    });

    // Primary real-time send path (REST POST /messages is the fallback).
    s.on(
      "message:send",
      async (
        payload: { conversationId: string; content: string; type?: "TEXT" | "IMAGE" },
        ack?: (ok: boolean, data?: unknown, err?: string) => void
      ) => {
        try {
          const { conversationId, content, type } = payload ?? {};
          if (!conversationId || !content?.trim()) {
            return ack?.(false, undefined, "conversationId and content are required.");
          }

          const conversation = await db.query.conversations.findFirst({
            where: eq(conversations.id, conversationId),
          });
          if (!conversation) return ack?.(false, undefined, "Conversation not found.");
          const allowed = conversation.customerId === s.data.userId || conversation.sellerId === s.data.userId;
          if (!allowed) return ack?.(false, undefined, "Not authorized for this conversation.");

          const [message] = await db
            .insert(messages)
            .values({
              conversationId,
              senderId: s.data.userId,
              type: type === "IMAGE" ? "IMAGE" : "TEXT",
              content: content.trim(),
            })
            .returning();

          await db
            .update(conversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversations.id, conversationId));

          io.to(conversationRoom(conversationId)).emit("message:receive", message);
          io.to(ADMIN_ROOM).emit("conversation:updated", { conversationId });

          ack?.(true, message);
        } catch (err) {
          console.error("message:send failed", err);
          ack?.(false, undefined, "Failed to send message.");
        }
      }
    );

    s.on("typing", (payload: { conversationId: string; isTyping: boolean }) => {
      s.to(conversationRoom(payload.conversationId)).emit("typing", {
        conversationId: payload.conversationId,
        userId: s.data.userId,
        isTyping: payload.isTyping,
      });
    });

    s.on("disconnect", () => {
      // socket.io automatically leaves all rooms on disconnect
    });
  });
}

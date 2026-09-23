import type { Server } from "socket.io";

let ioInstance: Server | null = null;

export function setIO(io: Server) {
  ioInstance = io;
}

export function getIO(): Server | null {
  return ioInstance;
}

/** Room name used for a single conversation's socket broadcasts. */
export function conversationRoom(conversationId: string) {
  return `conversation:${conversationId}`;
}

/** Room the admin(s) join to receive "a new conversation was created" / inbox updates. */
export const ADMIN_ROOM = "admin:inbox";

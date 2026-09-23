import crypto from "node:crypto";

/**
 * Small, dependency-free unique id generator (cuid-like).
 * Sortable-ish, URL-safe, good enough for primary keys in this app.
 */
export function createId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(9).toString("base64url");
  return `c${timestamp}${random}`;
}

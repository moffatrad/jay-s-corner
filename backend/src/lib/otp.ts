import crypto from "node:crypto";

/** Generates a random 6-digit code, zero-padded (e.g. "042817"). */
export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

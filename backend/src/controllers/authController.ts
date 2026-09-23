import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "../db/client";
import { otpCodes, users } from "../db/schema";
import { signPendingToken, signToken, verifyPendingToken } from "../lib/jwt";
import { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE } from "../lib/password";
import { isRealPhoneNumber, normalizePhoneNumber, PHONE_REQUIREMENTS_MESSAGE } from "../lib/phone";
import { generateOtpCode } from "../lib/otp";
import { sendOtpEmail } from "../lib/otpEmail";
import { syncCustomerContact } from "../lib/resendAudience";

const OTP_EXPIRES_MINUTES = 10;
const RESEND_MIN_GAP_SECONDS = 30;
const MAX_CODES_PER_WINDOW = 5;

class RateLimitError extends Error {}

function toPublicUser(user: typeof users.$inferSelect) {
  const { passwordHash, ...rest } = user;
  return rest;
}

async function latestOtp(userId: string) {
  return db.query.otpCodes.findFirst({
    where: eq(otpCodes.userId, userId),
    orderBy: desc(otpCodes.createdAt),
  });
}

async function createAndSendOtp(user: typeof users.$inferSelect) {
  // Only the most recently issued code should ever be valid.
  await db.update(otpCodes).set({ consumed: true }).where(eq(otpCodes.userId, user.id));

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60_000);

  await db.insert(otpCodes).values({ userId: user.id, codeHash, expiresAt });
  await sendOtpEmail(user.email, user.name, code);

  return { pendingToken: signPendingToken(user.id), expiresInSeconds: OTP_EXPIRES_MINUTES * 60 };
}

/** Issues (or reuses, if login was just retried) a code when a login's password check succeeds. */
async function issueOtpForLogin(user: typeof users.$inferSelect) {
  const recent = await latestOtp(user.id);
  if (recent && !recent.consumed && (Date.now() - recent.createdAt.getTime()) / 1000 < RESEND_MIN_GAP_SECONDS) {
    return {
      pendingToken: signPendingToken(user.id),
      expiresInSeconds: Math.max(0, Math.round((recent.expiresAt.getTime() - Date.now()) / 1000)),
    };
  }
  return createAndSendOtp(user);
}

/** Issues a fresh code for an explicit "resend code" click, rate-limited. */
async function issueOtpForResend(user: typeof users.$inferSelect) {
  const recent = await latestOtp(user.id);
  if (recent && !recent.consumed) {
    const secondsSince = (Date.now() - recent.createdAt.getTime()) / 1000;
    if (secondsSince < RESEND_MIN_GAP_SECONDS) {
      throw new RateLimitError(`Please wait ${Math.ceil(RESEND_MIN_GAP_SECONDS - secondsSince)}s before requesting another code.`);
    }
  }

  const windowStart = new Date(Date.now() - OTP_EXPIRES_MINUTES * 60_000);
  const recentCount = await db.query.otpCodes.findMany({
    where: and(eq(otpCodes.userId, user.id), gt(otpCodes.createdAt, windowStart)),
  });
  if (recentCount.length >= MAX_CODES_PER_WINDOW) {
    throw new RateLimitError("Too many codes requested. Please wait a few minutes and try again.");
  }

  return createAndSendOtp(user);
}

export async function register(req: Request, res: Response) {
  const { name, email, password, phone } = req.body ?? {};

  if (!name || !email || !password || !phone) {
    return res.status(400).json({ error: "name, email, password and phone are required." });
  }
  if (typeof password !== "string" || !isStrongPassword(password)) {
    return res.status(400).json({ error: PASSWORD_REQUIREMENTS_MESSAGE });
  }
  if (typeof phone !== "string" || !isRealPhoneNumber(phone)) {
    return res.status(400).json({ error: PHONE_REQUIREMENTS_MESSAGE });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      phone: normalizePhoneNumber(phone),
      role: "CUSTOMER",
    })
    .returning();

  void syncCustomerContact(user.email, user.name);

  const token = signToken({ sub: user.id, role: user.role, email: user.email });
  res.status(201).json({ token, user: toPublicUser(user) });
}

/** Step 1 of login: checks the password, then emails a 6-digit code instead of returning a JWT. */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  try {
    const { pendingToken, expiresInSeconds } = await issueOtpForLogin(user);
    res.json({ pendingToken, expiresInSeconds });
  } catch (err) {
    console.error("Failed to send login code:", err);
    res.status(502).json({ error: "Couldn't send your verification code. Please try again shortly." });
  }
}

/** Step 2 of login: exchanges the pending token + emailed code for the real JWT. */
export async function verifyOtp(req: Request, res: Response) {
  const { pendingToken, code } = req.body ?? {};
  if (!pendingToken || !code) {
    return res.status(400).json({ error: "pendingToken and code are required." });
  }

  let userId: string;
  try {
    userId = verifyPendingToken(pendingToken);
  } catch {
    return res.status(401).json({ error: "Your session expired. Please log in again." });
  }

  const record = await latestOtp(userId);
  if (!record || record.consumed || record.expiresAt < new Date()) {
    return res.status(401).json({ error: "That code has expired. Request a new one." });
  }

  const matches = await bcrypt.compare(String(code).trim(), record.codeHash);
  if (!matches) {
    return res.status(401).json({ error: "Incorrect code. Please try again." });
  }

  await db.update(otpCodes).set({ consumed: true }).where(eq(otpCodes.id, record.id));

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return res.status(404).json({ error: "User not found." });

  const token = signToken({ sub: user.id, role: user.role, email: user.email });
  res.json({ token, user: toPublicUser(user) });
}

/** Sends a new code for the pending login session, rate-limited. */
export async function resendOtp(req: Request, res: Response) {
  const { pendingToken } = req.body ?? {};
  if (!pendingToken) {
    return res.status(400).json({ error: "pendingToken is required." });
  }

  let userId: string;
  try {
    userId = verifyPendingToken(pendingToken);
  } catch {
    return res.status(401).json({ error: "Your session expired. Please log in again." });
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return res.status(404).json({ error: "User not found." });

  try {
    const { expiresInSeconds } = await issueOtpForResend(user);
    res.json({ pendingToken: signPendingToken(user.id), expiresInSeconds });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return res.status(429).json({ error: err.message });
    }
    console.error("Failed to resend login code:", err);
    res.status(502).json({ error: "Couldn't send your verification code. Please try again shortly." });
  }
}

export async function me(req: Request, res: Response) {
  const user = await db.query.users.findFirst({ where: eq(users.id, req.user!.sub) });
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user: toPublicUser(user) });
}

export async function updateMe(req: Request, res: Response) {
  const { name, addressLine1, addressLine2, city, region, postalCode, country, phone } = req.body ?? {};

  if (phone !== undefined && phone !== null && phone !== "" && !isRealPhoneNumber(phone)) {
    return res.status(400).json({ error: PHONE_REQUIREMENTS_MESSAGE });
  }

  const [updated] = await db
    .update(users)
    .set({
      ...(name !== undefined && { name: String(name).trim() }),
      ...(addressLine1 !== undefined && { addressLine1 }),
      ...(addressLine2 !== undefined && { addressLine2 }),
      ...(city !== undefined && { city }),
      ...(region !== undefined && { region }),
      ...(postalCode !== undefined && { postalCode }),
      ...(country !== undefined && { country }),
      ...(phone !== undefined && { phone: phone ? normalizePhoneNumber(phone) : phone }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, req.user!.sub))
    .returning();

  if (!updated) return res.status(404).json({ error: "User not found." });
  res.json({ user: toPublicUser(updated) });
}

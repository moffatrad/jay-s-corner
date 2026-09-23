import jwt from "jsonwebtoken";

export interface JwtPayload {
  sub: string; // user id
  role: "CUSTOMER" | "ADMIN";
  email: string;
}

const JWT_SECRET = process.env.JWT_SECRET ?? "insecure-dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

const OTP_PURPOSE = "otp_login";
const PENDING_TOKEN_EXPIRES_IN = "10m";

/** Short-lived token identifying "this user passed the password check" while the OTP step is pending. */
export function signPendingToken(userId: string): string {
  return jwt.sign({ sub: userId, purpose: OTP_PURPOSE }, JWT_SECRET, { expiresIn: PENDING_TOKEN_EXPIRES_IN });
}

/** Returns the user id if the pending token is valid and unexpired; throws otherwise. */
export function verifyPendingToken(token: string): string {
  const payload = jwt.verify(token, JWT_SECRET) as { sub: string; purpose: string };
  if (payload.purpose !== OTP_PURPOSE) {
    throw new Error("Invalid token.");
  }
  return payload.sub;
}

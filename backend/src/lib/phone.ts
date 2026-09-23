import { parsePhoneNumberFromString } from "libphonenumber-js";

const DEFAULT_COUNTRY = "BW"; // Botswana — used when the number has no country code.

/** Validates that a phone number is a real, dialable number (not just digits of the right length). */
export function isRealPhoneNumber(phone: string): boolean {
  const parsed = parsePhoneNumberFromString(phone, DEFAULT_COUNTRY);
  return !!parsed && parsed.isValid();
}

/** Normalizes a phone number to E.164 format (e.g. +26771234567) for storage. */
export function normalizePhoneNumber(phone: string): string {
  const parsed = parsePhoneNumberFromString(phone, DEFAULT_COUNTRY);
  return parsed?.isValid() ? parsed.number : phone.trim();
}

export const PHONE_REQUIREMENTS_MESSAGE = "Enter a valid phone number, e.g. +267 71 234 567.";

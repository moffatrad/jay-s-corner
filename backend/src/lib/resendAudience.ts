import { resend } from "./resend";

const AUDIENCE_NAME = "Jay's Corner Customers";

let cachedAudienceId: string | null = null;

/**
 * Resolves the Resend audience (segment) customers get synced into for broadcasts.
 * Reuses RESEND_AUDIENCE_ID if set; otherwise finds-or-creates one by name and
 * caches it in memory for this process (logging the id so it can be pinned in .env).
 */
async function getOrCreateAudienceId(): Promise<string> {
  if (process.env.RESEND_AUDIENCE_ID) return process.env.RESEND_AUDIENCE_ID;
  if (cachedAudienceId) return cachedAudienceId;

  const list = await resend.audiences.list();
  const existing = list.data?.data.find((a) => a.name === AUDIENCE_NAME);
  if (existing) {
    cachedAudienceId = existing.id;
    return existing.id;
  }

  const created = await resend.audiences.create({ name: AUDIENCE_NAME });
  if (created.error || !created.data) {
    throw new Error(created.error?.message ?? "Failed to create Resend audience.");
  }
  cachedAudienceId = created.data.id;
  console.log(
    `[resend] Created audience "${AUDIENCE_NAME}" (${cachedAudienceId}). ` +
      `Add RESEND_AUDIENCE_ID=${cachedAudienceId} to .env to reuse it across restarts.`
  );
  return cachedAudienceId;
}

/** Best-effort sync of a customer into the Resend audience for future broadcasts. Never throws. */
export async function syncCustomerContact(email: string, name: string) {
  try {
    const audienceId = await getOrCreateAudienceId();
    const [firstName, ...rest] = name.trim().split(/\s+/);
    await resend.contacts.create({
      email,
      firstName,
      lastName: rest.join(" ") || undefined,
      segments: [{ id: audienceId }],
    });
  } catch (err) {
    console.error("[resend] Failed to sync contact to audience:", err);
  }
}

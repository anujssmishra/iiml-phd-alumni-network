/** Mailbox identity is independent of doctoral membership approval. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email)) {
    return null;
  }
  const local = email.split("@")[0];
  if (local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
  return email;
}

export function isVerifiedGoogleIdentity({ provider, profile, email }: { provider: unknown; profile: unknown; email: unknown }): boolean {
  if (provider !== "google" || !profile || typeof profile !== "object") return false;
  const google = profile as Record<string, unknown>;
  const normalized = normalizeEmail(google.email);
  return google.email_verified === true && typeof google.sub === "string" && google.sub.length > 0
    && normalized !== null && normalized === normalizeEmail(email);
}

/** Exact matches are evidence of mailbox affiliation, never automatic approval. */
export function hasExactAcademicDomain(email: unknown, domains: readonly string[]): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const domain = normalized.slice(normalized.lastIndexOf("@") + 1);
  return domains.some((candidate) => candidate.trim().toLowerCase() === domain);
}

/** Only local callback paths are accepted; reject protocol-relative/open redirects. */
export function safeCallbackPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/membership";
  try {
    const parsed = new URL(value, "https://callback.invalid");
    if (parsed.origin !== "https://callback.invalid" || parsed.pathname.startsWith("/api/auth") || /^\/signin(?:\/|$)/.test(parsed.pathname)) return "/membership";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch { return "/membership"; }
}

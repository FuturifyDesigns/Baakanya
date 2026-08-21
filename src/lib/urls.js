/** Accept bare domains (futurifydesigns.com) or full URLs. */
export function normalizeWebsite(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

export function isValidWebsite(value) {
  const raw = String(value || "").trim();
  if (!raw) return true;
  try {
    const url = new URL(normalizeWebsite(raw));
    if (!/^https?:$/i.test(url.protocol)) return false;
    // Require a real hostname with a dot (domain.tld) or localhost.
    const host = url.hostname;
    if (host === "localhost") return true;
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
      host,
    );
  } catch {
    return false;
  }
}

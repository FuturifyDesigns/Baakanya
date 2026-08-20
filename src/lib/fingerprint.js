const encoder = new TextEncoder();

const sha256 = async (value) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

const getInstallationId = () => {
  const key = "baakanya_installation_id";
  try {
    let value = localStorage.getItem(key);
    if (!value) {
      value = crypto.randomUUID();
      localStorage.setItem(key, value);
    }
    return value;
  } catch {
    return crypto.randomUUID();
  }
};

export async function getDeviceFingerprint() {
  const installationId = getInstallationId();
  const screenBucket = `${Math.round(screen.width / 100) * 100}x${Math.round(screen.height / 100) * 100}`;
  const signals = [
    navigator.userAgent,
    navigator.platform || "unknown",
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
    screenBucket,
    screen.colorDepth,
    navigator.hardwareConcurrency || 0,
    navigator.deviceMemory || 0,
    navigator.maxTouchPoints || 0,
    installationId,
  ];
  return {
    installationId,
    deviceFingerprint: await sha256(signals.join("|")),
  };
}

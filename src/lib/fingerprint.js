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
  const deviceSignals = [
    navigator.platform || "unknown",
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
    screenBucket,
    screen.colorDepth,
    navigator.hardwareConcurrency || 0,
    navigator.deviceMemory || 0,
    navigator.maxTouchPoints || 0,
  ];
  const legacySignals = [navigator.userAgent, ...deviceSignals];
  const stableSignals = [
    navigator.userAgent.replace(/\d+(?:[._]\d+)*/g, "#"),
    (navigator.languages || []).join(","),
    ...deviceSignals,
  ];
  return {
    installationId,
    // Keep the original installation-bound hash for existing trial records.
    deviceFingerprint: await sha256(
      [...legacySignals, installationId].join("|"),
    ),
    // This remains stable when local storage is cleared or another account is used.
    deviceFingerprintV2: await sha256(stableSignals.join("|")),
  };
}

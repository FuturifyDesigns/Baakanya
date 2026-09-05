import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://baakanya.co.bw",
  "https://www.baakanya.co.bw",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);

const cors = (request: Request) => {
  const origin = request.headers.get("origin") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    Vary: "Origin",
  };
  if (allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
};

const encoder = new TextEncoder();
const hex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

const sha256 = async (value: string) =>
  hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));

const hmac = async (secret: string, value: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
};

const normalizeEmail = (raw: string) => {
  const [rawLocal, rawDomain] = raw.trim().toLowerCase().split("@");
  if (!rawLocal || !rawDomain || rawDomain.includes("@")) return null;
  let local = rawLocal.split("+")[0];
  let domain = rawDomain;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replaceAll(".", "");
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
};

const disposableDomains = new Set([
  "10minutemail.com",
  "dispostable.com",
  "guerrillamail.com",
  "maildrop.cc",
  "mailinator.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempmail.com",
  "throwawaymail.com",
  "yopmail.com",
]);

const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};

Deno.serve(async (request) => {
  const headers = cors(request);
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const fingerprintSecret = Deno.env.get("TRIAL_FINGERPRINT_SECRET");
  if (!supabaseUrl || !serviceKey || !fingerprintSecret) {
    return Response.json(
      { error: "Trial service unavailable" },
      { status: 503, headers },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let emailHash: string | null = null;
  let deviceHash: string | null = null;
  let deviceV2Hash: string | null = null;
  let ipHash: string | null = null;

  const record = async (allowed: boolean, reason: string) => {
    await admin.from("abuse_events").insert({
      event_type: "trial_reservation",
      email_fingerprint_hash: emailHash,
      device_fingerprint_hash: deviceHash,
      device_fingerprint_v2_hash: deviceV2Hash,
      ip_fingerprint_hash: ipHash,
      allowed,
      reason,
      user_agent_hash: await hmac(
        fingerprintSecret,
        request.headers.get("user-agent") || "unknown",
      ),
    });
  };

  try {
    const bodyText = await request.text();
    if (bodyText.length > 5000) throw new Error("Invalid request");
    const body = JSON.parse(bodyText);
    const checkOnly = body.mode === "check";
    const email = typeof body.email === "string" ? body.email : "";
    const normalizedEmail = normalizeEmail(email);
    const deviceFingerprint =
      typeof body.deviceFingerprint === "string" ? body.deviceFingerprint : "";
    const deviceFingerprintV2 =
      typeof body.deviceFingerprintV2 === "string"
        ? body.deviceFingerprintV2
        : "";
    const installationId =
      typeof body.installationId === "string" ? body.installationId : "";
    const honeypot = typeof body.website === "string" ? body.website : "";
    if (
      !normalizedEmail ||
      !/^[a-f0-9]{64}$/.test(deviceFingerprint) ||
      !/^[a-f0-9]{64}$/.test(deviceFingerprintV2) ||
      !/^[a-f0-9-]{20,64}$/i.test(installationId) ||
      honeypot
    ) {
      await record(false, honeypot ? "honeypot" : "invalid_payload");
      return Response.json(
        { error: "We could not start a trial from this request." },
        { status: 400, headers },
      );
    }
    const emailDomain = normalizedEmail.split("@")[1];
    if (
      disposableDomains.has(emailDomain) ||
      /\.(invalid|local|test)$/.test(emailDomain)
    ) {
      await record(false, "disposable_email");
      return Response.json(
        { error: "Please use a permanent email address for your trial." },
        { status: 403, headers },
      );
    }

    const forwarded = request.headers.get("x-forwarded-for") || "";
    const clientIp =
      forwarded.split(",")[0].trim() ||
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      "";
    if (!clientIp) {
      await record(false, "ip_unavailable");
      return Response.json(
        { error: "Your network could not be verified for a free trial." },
        { status: 403, headers },
      );
    }
    emailHash = await hmac(fingerprintSecret, `email:${normalizedEmail}`);
    deviceHash = await hmac(
      fingerprintSecret,
      `device:${deviceFingerprint}:${installationId}`,
    );
    deviceV2Hash = await hmac(
      fingerprintSecret,
      `device-v2:${deviceFingerprintV2}`,
    );
    ipHash = await hmac(fingerprintSecret, `ip:${clientIp}`);

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [
      normalizedTrial,
      emailTrial,
      deviceTrial,
      deviceV2Trial,
      ipTrial,
      identityClaims,
      ipAttempts,
      deviceAttempts,
      emailAttempts,
    ] = await Promise.all([
      admin
        .from("trial_records")
        .select("id", { count: "exact", head: true })
        .eq("email_normalized", normalizedEmail),
      admin
        .from("trial_records")
        .select("id", { count: "exact", head: true })
        .eq("email_fingerprint_hash", emailHash),
      admin
        .from("trial_records")
        .select("id", { count: "exact", head: true })
        .eq("device_fingerprint_hash", deviceHash),
      admin
        .from("trial_records")
        .select("id", { count: "exact", head: true })
        .eq("device_fingerprint_v2_hash", deviceV2Hash),
      admin
        .from("trial_records")
        .select("id", { count: "exact", head: true })
        .eq("ip_fingerprint_hash", ipHash),
      admin
        .from("trial_identity_claims")
        .select("identity_type")
        .in("identity_hash", [emailHash, deviceHash, deviceV2Hash, ipHash]),
      admin
        .from("abuse_events")
        .select("id", { count: "exact", head: true })
        .eq("ip_fingerprint_hash", ipHash)
        .gte("created_at", hourAgo),
      admin
        .from("abuse_events")
        .select("id", { count: "exact", head: true })
        .eq("device_fingerprint_hash", deviceHash)
        .gte("created_at", hourAgo),
      admin
        .from("abuse_events")
        .select("id", { count: "exact", head: true })
        .eq("email_fingerprint_hash", emailHash)
        .gte("created_at", hourAgo),
    ]);

    if (
      normalizedTrial.error ||
      emailTrial.error ||
      deviceTrial.error ||
      deviceV2Trial.error ||
      ipTrial.error ||
      identityClaims.error ||
      ipAttempts.error ||
      deviceAttempts.error ||
      emailAttempts.error
    ) {
      throw new Error("Eligibility check failed");
    }

    let reason = "eligible";
    if ((normalizedTrial.count || 0) > 0 || (emailTrial.count || 0) > 0) {
      reason = "email_already_used";
    } else if (
      (deviceTrial.count || 0) > 0 ||
      (deviceV2Trial.count || 0) > 0 ||
      identityClaims.data?.some((row) =>
        ["device", "device_v2"].includes(row.identity_type),
      )
    ) {
      reason = "device_already_used";
    } else if (
      (ipTrial.count || 0) > 0 ||
      identityClaims.data?.some((row) => row.identity_type === "ip")
    ) {
      reason = "ip_already_used";
    } else if (
      identityClaims.data?.some((row) => row.identity_type === "email")
    ) {
      reason = "email_already_used";
    } else if ((ipAttempts.count || 0) >= 10) {
      reason = "ip_rate_limit";
    } else if ((deviceAttempts.count || 0) >= 5) {
      reason = "device_rate_limit";
    } else if ((emailAttempts.count || 0) >= 3) {
      reason = "email_rate_limit";
    }

    if (reason !== "eligible") {
      await record(false, reason);
      if (checkOnly) {
        return Response.json({ eligible: false, reason }, { headers });
      }
      return Response.json(
        {
          error: reason.endsWith("rate_limit")
            ? "Too many trial attempts. Please try again later."
            : "This request is not eligible for a free trial.",
          reason,
        },
        { status: reason.endsWith("rate_limit") ? 429 : 403, headers },
      );
    }

    if (checkOnly) {
      await record(true, "eligible_check");
      return Response.json({ eligible: true }, { headers });
    }

    const reservationToken = randomToken();
    const { error } = await admin.from("trial_reservations").insert({
      token_hash: await sha256(reservationToken),
      email_normalized: normalizedEmail,
      email_fingerprint_hash: emailHash,
      device_fingerprint_hash: deviceHash,
      device_fingerprint_v2_hash: deviceV2Hash,
      ip_fingerprint_hash: ipHash,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    if (error) throw error;
    await record(true, "eligible");
    return Response.json({ reservationToken }, { headers });
  } catch (error) {
    await record(false, "internal_error").catch(() => undefined);
    console.error(error);
    return Response.json(
      { error: "Trial eligibility could not be checked. Please try again." },
      { status: 500, headers },
    );
  }
});

import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://baakanya.co.bw",
  "https://www.baakanya.co.bw",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);
const getCorsHeaders = (request: Request) => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    Vary: "Origin",
  };
  const origin = request.headers.get("origin") || "";
  if (allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
};
const encoder = new TextEncoder();
const hex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
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

Deno.serve(async (request) => {
  const corsHeaders = getCorsHeaders(request);
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    const url = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const secret = Deno.env.get("TRIAL_FINGERPRINT_SECRET") || "";
    if (!token || !secret) throw new Error("Sign in required");
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } =
      await authClient.auth.getUser(token);
    if (authError || !authData.user) throw new Error("Sign in required");

    const bodyText = await request.text();
    if (bodyText.length > 8000) throw new Error("Invalid generation request");
    const body = JSON.parse(bodyText);
    const toolName = typeof body.toolName === "string" ? body.toolName : "";
    const mode = body.mode === "check" ? "check" : "consume";
    const draftKey =
      typeof body.draftKey === "string" && body.draftKey.length > 0
        ? body.draftKey
        : null;
    const deviceFingerprint =
      typeof body.deviceFingerprint === "string" ? body.deviceFingerprint : "";
    const installationId =
      typeof body.installationId === "string" ? body.installationId : "";
    if (
      !/^[a-z0-9_]{2,40}$/.test(toolName) ||
      !/^[a-f0-9]{64}$/.test(deviceFingerprint)
    ) {
      return Response.json(
        { error: "Invalid generation request" },
        { status: 400, headers: corsHeaders },
      );
    }
    if (draftKey && !/^[a-f0-9-]{8,64}$/.test(draftKey)) {
      return Response.json(
        { error: "Invalid document draft" },
        { status: 400, headers: corsHeaders },
      );
    }
    const deviceHash = await hmac(
      secret,
      `device:${deviceFingerprint}:${installationId}`,
    );
    const forwarded = request.headers.get("x-forwarded-for") || "";
    const clientIp =
      forwarded.split(",")[0].trim() ||
      request.headers.get("cf-connecting-ip") ||
      "unknown";
    const ipHash = await hmac(secret, `ip:${clientIp}`);
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userId = authData.user.id;
    const { data: trial } = await admin
      .from("trial_records")
      .select("device_fingerprint_hash,ip_fingerprint_hash,trial_end_date")
      .eq("user_id", userId)
      .maybeSingle();
    const trialActive =
      trial?.trial_end_date && new Date(trial.trial_end_date) > new Date();
    if (trialActive && trial.device_fingerprint_hash !== deviceHash) {
      await admin.from("abuse_events").insert({
        event_type: "generation_denied",
        device_fingerprint_hash: deviceHash,
        ip_fingerprint_hash: ipHash,
        allowed: false,
        reason: "trial_device_mismatch",
        user_id: userId,
      });
      return Response.json(
        { error: "This trial is linked to the device where it was activated." },
        { status: 403, headers: corsHeaders },
      );
    }

    const { data, error } =
      mode === "check"
        ? await admin.rpc("check_generation_access", {
            target_user: userId,
            tool_name: toolName,
          })
        : await admin.rpc("authorize_generation", {
            target_user: userId,
            tool_name: toolName,
            p_draft_key: draftKey,
          });
    if (error) throw error;
    if (trialActive && trial.ip_fingerprint_hash !== ipHash) {
      await admin.from("abuse_events").insert({
        event_type: "generation_ip_change",
        device_fingerprint_hash: deviceHash,
        ip_fingerprint_hash: ipHash,
        allowed: true,
        reason: "trusted_device_new_ip",
        user_id: userId,
      });
    }
    return Response.json(data, { headers: corsHeaders });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generation denied";
    console.error("generation-gate failed", error);
    return Response.json(
      {
        error:
          message === "Sign in required"
            ? message
            : "The generation request could not be completed.",
      },
      {
        status: message === "Sign in required" ? 401 : 500,
        headers: corsHeaders,
      },
    );
  }
});

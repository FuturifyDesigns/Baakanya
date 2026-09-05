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
const clean = (value: unknown) =>
  typeof value === "string"
    ? value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim()
    : "";

const looksSpammy = (tool: string, details: string) => {
  const text = `${tool} ${details}`.toLowerCase();
  if (/(https?:\/\/|www\.|bit\.ly|t\.me\/)/i.test(text)) return true;
  if (/(viagra|crypto\s*giveaway|casino|porn|xxx)/i.test(text)) return true;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 8) {
    const unique = new Set(words);
    if (unique.size / words.length < 0.35) return true;
  }
  return false;
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
    const bodyText = await request.text();
    if (bodyText.length > 3000) throw new Error("Request is too large");
    const body = JSON.parse(bodyText);
    const email = clean(body.email).toLowerCase();
    const tool = clean(body.tool);
    const details = clean(body.reason);

    // Honeypot — pretend success so bots do not retry differently.
    if (clean(body.website))
      return Response.json({ ok: true }, { headers: corsHeaders });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400, headers: corsHeaders },
      );
    if (
      tool.length < 3 ||
      tool.length > 120 ||
      details.length < 10 ||
      details.length > 800
    )
      return Response.json(
        { error: "Add a short tool name and a useful description." },
        { status: 400, headers: corsHeaders },
      );
    if (looksSpammy(tool, details))
      return Response.json(
        { error: "That request looks invalid. Please rewrite it clearly." },
        { status: 400, headers: corsHeaders },
      );

    const url = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const secret = Deno.env.get("TRIAL_FINGERPRINT_SECRET") || "";
    if (!url || !serviceKey || !secret)
      return Response.json(
        { error: "Your request could not be sent right now." },
        { status: 500, headers: corsHeaders },
      );

    const forwarded = request.headers.get("x-forwarded-for") || "";
    const ip =
      forwarded.split(",")[0].trim() ||
      request.headers.get("cf-connecting-ip") ||
      "unknown";
    const emailHash = await hmac(secret, `automation-email:${email}`);
    const ipHash = await hmac(secret, `automation-ip:${ip}`);
    const contentHash = await hmac(
      secret,
      `automation-content:${email}:${tool.toLowerCase()}:${details.toLowerCase()}`,
    );
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const now = Date.now();
    const dayAgo = new Date(now - 86400000).toISOString();
    const hourAgo = new Date(now - 3600000).toISOString();
    const coolDownAgo = new Date(now - 5 * 60 * 1000).toISOString();

    const [
      emailDay,
      ipDay,
      emailHour,
      ipHour,
      emailRecent,
      ipRecent,
      duplicate,
    ] = await Promise.all([
      admin
        .from("automation_requests")
        .select("id", { count: "exact", head: true })
        .eq("email_fingerprint_hash", emailHash)
        .gte("created_at", dayAgo),
      admin
        .from("automation_requests")
        .select("id", { count: "exact", head: true })
        .eq("ip_fingerprint_hash", ipHash)
        .gte("created_at", dayAgo),
      admin
        .from("automation_requests")
        .select("id", { count: "exact", head: true })
        .eq("email_fingerprint_hash", emailHash)
        .gte("created_at", hourAgo),
      admin
        .from("automation_requests")
        .select("id", { count: "exact", head: true })
        .eq("ip_fingerprint_hash", ipHash)
        .gte("created_at", hourAgo),
      admin
        .from("automation_requests")
        .select("id", { count: "exact", head: true })
        .eq("email_fingerprint_hash", emailHash)
        .gte("created_at", coolDownAgo),
      admin
        .from("automation_requests")
        .select("id", { count: "exact", head: true })
        .eq("ip_fingerprint_hash", ipHash)
        .gte("created_at", coolDownAgo),
      admin
        .from("automation_requests")
        .select("id", { count: "exact", head: true })
        .eq("email_fingerprint_hash", emailHash)
        .eq("tool_name", tool)
        .eq("details", details)
        .gte("created_at", dayAgo),
    ]);

    if ((emailRecent.count || 0) > 0 || (ipRecent.count || 0) > 0)
      return Response.json(
        {
          error:
            "Please wait at least 5 minutes before sending another recommendation.",
        },
        { status: 429, headers: corsHeaders },
      );
    if ((emailHour.count || 0) >= 2 || (ipHour.count || 0) >= 3)
      return Response.json(
        { error: "Too many recommendations this hour. Try again later." },
        { status: 429, headers: corsHeaders },
      );
    if ((emailDay.count || 0) >= 3 || (ipDay.count || 0) >= 5)
      return Response.json(
        { error: "Daily recommendation limit reached. Try again tomorrow." },
        { status: 429, headers: corsHeaders },
      );
    if ((duplicate.count || 0) > 0)
      return Response.json(
        {
          error:
            "You already sent this recommendation today. Try a different idea.",
        },
        { status: 429, headers: corsHeaders },
      );

    let userId: string | null = null;
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (token && token !== anonKey) {
      const authClient = createClient(url, anonKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await authClient.auth.getUser(token);
      userId = data.user?.id || null;
    }

    const { error } = await admin.from("automation_requests").insert({
      user_id: userId,
      email,
      tool_name: tool,
      details,
      email_fingerprint_hash: emailHash,
      ip_fingerprint_hash: ipHash,
    });
    if (error) throw error;

    // Best-effort abuse log for admin monitoring.
    try {
      await admin.from("abuse_events").insert({
        event_type: "automation_request",
        email_fingerprint_hash: emailHash,
        ip_fingerprint_hash: ipHash,
        allowed: true,
        reason: `content:${contentHash.slice(0, 16)}`,
        user_id: userId,
      });
    } catch (_) {
      // ignore if schema differs
    }

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Your request could not be sent right now." },
      { status: 500, headers: corsHeaders },
    );
  }
});

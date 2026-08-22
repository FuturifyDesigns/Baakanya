import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AuthContext = {
  userId: string;
  isAdmin: boolean;
  admin: ReturnType<typeof createClient>;
};

const getIloveToken = async (publicKey: string) => {
  const response = await fetch("https://api.ilovepdf.com/v1/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_key: publicKey }),
  });
  if (!response.ok) {
    throw new Error("Could not authenticate with the conversion service.");
  }
  const payload = await response.json();
  if (!payload?.token) {
    throw new Error("Conversion service authentication failed.");
  }
  return payload.token as string;
};

const startOfficeTask = async (publicKey: string, region: string) => {
  const token = await getIloveToken(publicKey);
  const startResponse = await fetch(
    `https://api.ilovepdf.com/v1/start/officepdf/${region}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!startResponse.ok) {
    throw new Error("Could not start Word to PDF conversion.");
  }
  const startPayload = await startResponse.json();
  return {
    token,
    server: startPayload?.server as string,
    task: startPayload?.task as string,
    remainingCredits:
      typeof startPayload?.remaining_credits === "number"
        ? startPayload.remaining_credits
        : null,
  };
};

const saveCreditBalance = async (
  admin: ReturnType<typeof createClient>,
  remaining: number | null,
) => {
  if (remaining == null) return;
  const { error } = await admin.from("platform_settings").upsert({
    key: "ilovepdf_credits",
    value: { remaining },
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn("platform_settings upsert skipped:", error.message);
};

const logConversion = async (
  admin: ReturnType<typeof createClient>,
  payload: {
    userId: string;
    fileName?: string;
    fileSizeBytes?: number;
    engine: "ilovepdf" | "browser";
    creditsRemaining?: number | null;
  },
) => {
  const { error } = await admin.from("word_conversion_logs").insert({
    user_id: payload.userId,
    file_name: payload.fileName || null,
    file_size_bytes: payload.fileSizeBytes ?? null,
    engine: payload.engine,
    credits_remaining: payload.creditsRemaining ?? null,
  });
  if (error) console.warn("word_conversion_logs insert skipped:", error.message);
};

const convertOfficeToPdf = async (
  fileBytes: ArrayBuffer,
  fileName: string,
  started: Awaited<ReturnType<typeof startOfficeTask>>,
) => {
  const { token, server, task, remainingCredits } = started;
  if (!server || !task) {
    throw new Error("Conversion service did not return a task.");
  }

  const form = new FormData();
  form.append("task", task);
  form.append(
    "file",
    new Blob([fileBytes], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    fileName,
  );

  const uploadResponse = await fetch(`https://${server}/v1/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!uploadResponse.ok) {
    throw new Error("Could not upload the Word file for conversion.");
  }
  const uploadPayload = await uploadResponse.json();
  const serverFilename = uploadPayload?.server_filename;
  if (!serverFilename) {
    throw new Error("Conversion upload did not complete.");
  }

  const processResponse = await fetch(`https://${server}/v1/process`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task,
      tool: "officepdf",
      files: [{ server_filename: serverFilename, filename: fileName }],
    }),
  });
  if (!processResponse.ok) {
    throw new Error("Word to PDF conversion failed.");
  }

  const downloadResponse = await fetch(`https://${server}/v1/download/${task}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!downloadResponse.ok) {
    throw new Error("Could not download the converted PDF.");
  }

  const creditsAfter =
    remainingCredits != null ? Math.max(remainingCredits - 1, 0) : null;

  return {
    pdfBytes: await downloadResponse.arrayBuffer(),
    creditsRemaining: creditsAfter,
  };
};

const authenticate = async (
  request: Request,
): Promise<AuthContext | Response> => {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) {
    return Response.json(
      { error: "Sign in required." },
      { status: 401, headers: corsHeaders },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } =
    await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    return Response.json(
      { error: "Sign in required." },
      { status: 401, headers: corsHeaders },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: adminRow } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  return {
    userId: authData.user.id,
    isAdmin: Boolean(adminRow),
    admin,
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const publicKey = Deno.env.get("ILOVEPDF_PUBLIC_KEY") || "";
    const region = Deno.env.get("ILOVEPDF_REGION") || "eu";
    const minCredits = Number(Deno.env.get("ILOVEPDF_MIN_CREDITS") || "50");

    const authResult = await authenticate(request);
    if (authResult instanceof Response) return authResult;
    const { userId, isAdmin, admin } = authResult;

    const body = await request.json();
    const mode = typeof body.mode === "string" ? body.mode : "convert";

    if (mode === "refresh_credits") {
      if (!isAdmin) {
        return Response.json(
          { error: "Admin only." },
          { status: 403, headers: corsHeaders },
        );
      }
      if (!publicKey) {
        return Response.json(
          { error: "Word conversion service is not configured." },
          { status: 503, headers: corsHeaders },
        );
      }
      const started = await startOfficeTask(publicKey, region);
      await saveCreditBalance(admin, started.remainingCredits);
      return Response.json(
        {
          remainingCredits: started.remainingCredits,
          minCreditsReserve: minCredits,
        },
        { headers: corsHeaders },
      );
    }

    if (mode === "log_browser") {
      const fileName =
        typeof body.fileName === "string" ? body.fileName.slice(0, 255) : null;
      const fileSizeBytes =
        typeof body.fileSizeBytes === "number" ? body.fileSizeBytes : null;
      await logConversion(admin, {
        userId,
        fileName: fileName || undefined,
        fileSizeBytes: fileSizeBytes ?? undefined,
        engine: "browser",
      });
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    if (!publicKey) {
      return Response.json(
        { fallback: true, error: "Word conversion service is not configured." },
        { headers: corsHeaders },
      );
    }

    const storagePath =
      typeof body.storagePath === "string" ? body.storagePath : "";
    const fileName =
      typeof body.fileName === "string" && body.fileName.trim()
        ? body.fileName.trim()
        : "document.docx";

    if (
      !storagePath ||
      !storagePath.startsWith(`${userId}/`) ||
      !/\.docx$/i.test(storagePath)
    ) {
      return Response.json(
        { error: "Invalid document upload." },
        { status: 400, headers: corsHeaders },
      );
    }

    const started = await startOfficeTask(publicKey, region);
    await saveCreditBalance(admin, started.remainingCredits);

    if (
      started.remainingCredits != null &&
      started.remainingCredits <= minCredits
    ) {
      await logConversion(admin, {
        userId,
        fileName,
        engine: "browser",
        creditsRemaining: started.remainingCredits,
      });
      return Response.json(
        {
          fallback: true,
          reason: "credits_low",
          remainingCredits: started.remainingCredits,
          minCreditsReserve: minCredits,
        },
        { headers: corsHeaders },
      );
    }

    const download = await admin.storage
      .from("converter-temp")
      .download(storagePath);
    if (download.error || !download.data) {
      return Response.json(
        { error: "Could not read the uploaded Word file." },
        { status: 400, headers: corsHeaders },
      );
    }

    const fileBytes = await download.data.arrayBuffer();
    if (!fileBytes.byteLength) {
      return Response.json(
        { error: "The Word file is empty." },
        { status: 400, headers: corsHeaders },
      );
    }

    const { pdfBytes, creditsRemaining } = await convertOfficeToPdf(
      fileBytes,
      fileName,
      started,
    );

    await admin.storage.from("converter-temp").remove([storagePath]);
    await saveCreditBalance(admin, creditsRemaining);
    await logConversion(admin, {
      userId,
      fileName,
      fileSizeBytes: fileBytes.byteLength,
      engine: "ilovepdf",
      creditsRemaining,
    });

    const outputName = fileName.replace(/\.docx$/i, "") + ".pdf";
    const pdfStoragePath = `${userId}/${crypto.randomUUID()}.pdf`;

    const { error: pdfUploadError } = await admin.storage
      .from("converter-temp")
      .upload(pdfStoragePath, new Blob([pdfBytes], { type: "application/pdf" }), {
        contentType: "application/pdf",
        upsert: false,
      });
    if (pdfUploadError) {
      throw new Error("Could not store the converted PDF.");
    }

    const { data: signed, error: signError } = await admin.storage
      .from("converter-temp")
      .createSignedUrl(pdfStoragePath, 300);
    if (signError || !signed?.signedUrl) {
      await admin.storage.from("converter-temp").remove([pdfStoragePath]);
      throw new Error("Could not prepare the converted PDF for download.");
    }

    return Response.json(
      {
        signedUrl: signed.signedUrl,
        pdfStoragePath,
        fileName: outputName,
        engine: "ilovepdf",
        remainingCredits: creditsRemaining,
        minCreditsReserve: minCredits,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Word to PDF conversion failed.";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});

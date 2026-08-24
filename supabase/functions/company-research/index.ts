import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const cleanText = (value: string) =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();

const boilerplate =
  /\b(skip to|main content|cookie|privacy policy|terms (?:of|and)|download acrobat|sign in|log in|menu|navigation|all rights reserved|javascript|enable cookies|home\s*[|>]|contact us)\b/i;

const likelyEnglish = (value: string) => {
  const words = value.toLowerCase().match(/[a-zà-ÿ']+/g) || [];
  if (!words.length) return false;
  const english = words.filter((word) =>
    /^(the|and|with|for|from|that|this|its|our|your|company|business|provides|services|customers|people|through|across|about|into|their|where|which)$/.test(
      word,
    )
  ).length;
  const french = words.filter((word) =>
    /^(le|la|les|des|du|une|un|et|pour|avec|est|sont|dans|notre|votre|vous|nous|qui|que|sur|aux|entreprise|société|leurs|plus)$/.test(
      word,
    )
  ).length;
  return french < 2 || english >= french;
};

const sentenceCandidates = (value: string) =>
  cleanText(value)
    .split(/(?<=[.!?])\s+|\s+[|•]\s+/)
    .map((sentence) => sentence.trim())
    .filter(
      (sentence) =>
        sentence.length >= 45 &&
        sentence.length <= 360 &&
        !boilerplate.test(sentence) &&
        !/(?:https?:\/\/|www\.)/i.test(sentence) &&
        likelyEnglish(sentence),
    );

const extractPageEvidence = (html: string) => {
  const evidence: string[] = [];
  const metaPatterns = [
    /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/gi,
  ];
  for (const pattern of metaPatterns) {
    for (const match of html.matchAll(pattern)) evidence.push(match[1]);
  }
  for (const match of html.matchAll(/<(?:h1|h2|p)[^>]*>([\s\S]*?)<\/(?:h1|h2|p)>/gi)) {
    evidence.push(match[1]);
  }
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]);
      const records = Array.isArray(data) ? data : [data];
      for (const record of records) {
        if (record?.description) evidence.push(String(record.description));
        if (record?.slogan) evidence.push(String(record.slogan));
      }
    } catch {
      // Ignore invalid third-party structured data and continue with page copy.
    }
  }
  return evidence.flatMap(sentenceCandidates);
};

const sameSiteResearchLinks = (html: string, base: URL) => {
  const links: URL[] = [];
  for (const match of html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    try {
      const url = new URL(match[1], base);
      if (
        url.origin === base.origin &&
        /\b(about|company|who-we-are|services|solutions|careers|values|mission)\b/i.test(
          url.pathname,
        )
      ) {
        links.push(url);
      }
    } catch {
      // Ignore malformed links.
    }
  }
  return [...new Map(links.map((url) => [url.href, url])).values()].slice(0, 2);
};

const tokenSet = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .match(/[a-z][a-z-]{3,}/g)
      ?.filter((token) => !/^(that|this|with|from|your|their|have|more|about)$/.test(token)) || [],
  );

const sentenceScore = (sentence: string, company: string, role: string) => {
  const lower = sentence.toLowerCase();
  const companyTokens = [...tokenSet(company)];
  const roleTokens = [...tokenSet(role)];
  let score = Math.min(sentence.length, 180) / 90;
  score += companyTokens.filter((token) => lower.includes(token)).length * 3;
  score += roleTokens.filter((token) => lower.includes(token)).length * 1.5;
  if (/\b(mission|purpose|values|focus|specialis|provid|serv|develop|deliver|customer|community|innovation|technology|sustainab|growth)\w*/i.test(sentence)) score += 3;
  if (/\b(award|leading|largest|founded|established|operates|employs|markets?)\b/i.test(sentence)) score += 1.5;
  return score;
};

const buildOverview = (evidence: string[], company: string, role: string) => {
  const unique = [...new Map(evidence.map((sentence) => [sentence.toLowerCase(), sentence])).values()];
  const ranked = unique.sort(
    (left, right) => sentenceScore(right, company, role) - sentenceScore(left, company, role),
  );
  const selected: string[] = [];
  const selectedTokens: Set<string>[] = [];
  for (const sentence of ranked) {
    const tokens = tokenSet(sentence);
    const duplicate = selectedTokens.some((other) => {
      const overlap = [...tokens].filter((token) => other.has(token)).length;
      return overlap / Math.max(1, Math.min(tokens.size, other.size)) > 0.72;
    });
    if (!duplicate) {
      selected.push(sentence);
      selectedTokens.push(tokens);
    }
    if (selected.length === 2) break;
  }
  if (!selected.length) return "";
  const combined = selected
    .map((sentence) => (/^[A-Z]/.test(sentence) ? sentence : `${company} ${sentence}`))
    .join(" ");
  const factual = (combined.length > 620
    ? `${combined.slice(0, 620).replace(/\s+\S*$/, "")}.`
    : combined
  ).replace(/[,;:]$/, ".");
  const safeRole = role.replace(/[\r\n.!?]+/g, " ").trim().slice(0, 80);
  const roleFit = safeRole
    ? `That focus appeals to me because the ${safeRole} role calls for organised delivery, close collaboration and dependable outcomes.`
    : "";
  return {
    overview: `${factual}${/[.!?]$/.test(factual) ? "" : "."}`,
    roleFit,
  };
};

const safeWebsite = (raw?: string) => {
  if (!raw) return null;
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Website must use HTTP or HTTPS");
  if (
    /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(
      url.hostname,
    )
  ) {
    throw new Error("Private network addresses are not supported");
  }
  return url;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token)
      return Response.json(
        { error: "Sign in required" },
        { status: 401, headers: corsHeaders },
      );
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
        { error: "Sign in required" },
        { status: 401, headers: corsHeaders },
      );
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userId = authData.user.id;
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86400000).toISOString();
    const [profile, subscription, credit, usage] = await Promise.all([
      admin
        .from("profiles")
        .select("trial_end_date,plan_type")
        .eq("id", userId)
        .maybeSingle(),
      admin
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .gt("end_date", now.toISOString())
        .limit(1)
        .maybeSingle(),
      admin
        .from("credits")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("tool_used", "company_research")
        .gte("created_at", dayAgo),
    ]);
    const trialActive =
      profile.data?.plan_type === "trial" &&
      profile.data.trial_end_date &&
      new Date(profile.data.trial_end_date) > now;
    const paidActive =
      Boolean(subscription.data) || (credit.data?.balance || 0) > 0;
    if (!trialActive && !paidActive) {
      return Response.json(
        { error: "Active access is required" },
        { status: 402, headers: corsHeaders },
      );
    }
    const dailyLimit = trialActive ? 10 : 30;
    if ((usage.count || 0) >= dailyLimit) {
      return Response.json(
        { error: "Daily company research limit reached" },
        { status: 429, headers: corsHeaders },
      );
    }
    const { company, role, website } = await request.json();
    if (!company || typeof company !== "string" || company.length > 120) {
      return Response.json(
        { error: "A valid company name is required" },
        { status: 400, headers: corsHeaders },
      );
    }

    const sources: string[] = [];
    const evidence: string[] = [];
    const target = safeWebsite(website);
    if (target) {
      try {
        const response = await fetch(target, {
          headers: { "User-Agent": "Baakanya company research" },
          redirect: "follow",
        });
        if (response.ok) {
          sources.push(response.url);
          const html = await response.text();
          evidence.push(...extractPageEvidence(html));
          const researchPages = sameSiteResearchLinks(html, new URL(response.url));
          const pageResponses = await Promise.allSettled(
            researchPages.map((url) =>
              fetch(url, {
                headers: { "User-Agent": "Baakanya company research" },
                redirect: "follow",
              }),
            ),
          );
          for (const result of pageResponses) {
            if (result.status !== "fulfilled" || !result.value.ok) continue;
            sources.push(result.value.url);
            evidence.push(...extractPageEvidence(await result.value.text()));
          }
        }
      } catch {
        // Continue with independent search results when a site blocks automated access.
      }
    }

    const query = encodeURIComponent(
      `"${company.trim()}" company official about services products customers`,
    );
    try {
      const search = await fetch(
        `https://html.duckduckgo.com/html/?q=${query}&kl=us-en`,
        {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; Baakanya/1.0)" },
        },
      );
      if (search.ok) {
        const html = await search.text();
        const snippets = [
          ...html.matchAll(/result__snippet[^>]*>([\s\S]*?)<\/a>/gi),
        ]
          .slice(0, 4)
          .map((match) => cleanText(match[1]))
          .filter(Boolean);
        evidence.push(...snippets.flatMap(sentenceCandidates));
        const links = [...html.matchAll(/result__a[^>]*href="([^"]+)"/gi)]
          .slice(0, 4)
          .map((match) => match[1]);
        sources.push(...links);
      }
    } catch {
      // Bing RSS below remains available as a separate fallback.
    }

    if (evidence.filter(Boolean).length === 0) {
      const bing = await fetch(
        `https://www.bing.com/search?q=${query}&format=rss`,
        {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; Baakanya/1.0)" },
        },
      );
      if (bing.ok) {
        const rss = await bing.text();
        const items = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(
          0,
          4,
        );
        for (const item of items) {
          const description = item[1].match(
            /<description>([\s\S]*?)<\/description>/i,
          )?.[1];
          const link = item[1].match(/<link>([\s\S]*?)<\/link>/i)?.[1];
          if (description) evidence.push(...sentenceCandidates(description));
          if (link) sources.push(cleanText(link));
        }
      }
    }

    const insight = buildOverview(evidence, company.trim(), String(role || ""));
    const overview = insight?.overview || "";
    const found = overview.length >= 80;
    await admin.from("generations").insert({
      user_id: userId,
      tool_used: "company_research",
      access_type: trialActive ? "trial" : "paid",
    });
    return Response.json(
      {
        company,
        found,
        overview,
        roleFit: insight?.roleFit || "",
        sources: [...new Set(sources)].slice(0, 5),
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Research failed" },
      { status: 500, headers: corsHeaders },
    );
  }
});

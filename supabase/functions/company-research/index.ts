const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cleanText = (value: string) =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const safeWebsite = (raw?: string) => {
  if (!raw) return null;
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Website must use HTTP or HTTPS");
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname)) {
    throw new Error("Private network addresses are not supported");
  }
  return url;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return Response.json({ error: "Sign in required" }, { status: 401, headers: corsHeaders });
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.role !== "authenticated") {
      return Response.json({ error: "Sign in required" }, { status: 401, headers: corsHeaders });
    }
    const { company, role, website } = await request.json();
    if (!company || typeof company !== "string" || company.length > 120) {
      return Response.json({ error: "A valid company name is required" }, { status: 400, headers: corsHeaders });
    }

    const sources: string[] = [];
    const evidence: string[] = [];
    const target = safeWebsite(website);
    if (target) {
      const response = await fetch(target, { headers: { "User-Agent": "Baakanya company research" }, redirect: "follow" });
      if (response.ok) {
        sources.push(response.url);
        evidence.push(cleanText(await response.text()).slice(0, 1800));
      }
    }

    const query = encodeURIComponent(`"${company}" ${role || "Botswana company"}`);
    const search = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Baakanya/1.0)" },
    });
    if (search.ok) {
      const html = await search.text();
      const snippets = [...html.matchAll(/result__snippet[^>]*>([\s\S]*?)<\/a>/gi)]
        .slice(0, 4)
        .map((match) => cleanText(match[1]))
        .filter(Boolean);
      evidence.push(...snippets);
      const links = [...html.matchAll(/result__a[^>]*href="([^"]+)"/gi)]
        .slice(0, 4)
        .map((match) => match[1]);
      sources.push(...links);
    }

    if (evidence.filter(Boolean).length === 0) {
      const bing = await fetch(`https://www.bing.com/search?q=${query}&format=rss`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Baakanya/1.0)" },
      });
      if (bing.ok) {
        const rss = await bing.text();
        const items = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 4);
        for (const item of items) {
          const description = item[1].match(/<description>([\s\S]*?)<\/description>/i)?.[1];
          const link = item[1].match(/<link>([\s\S]*?)<\/link>/i)?.[1];
          if (description) evidence.push(cleanText(description));
          if (link) sources.push(cleanText(link));
        }
      }
    }

    const useful = evidence.filter(Boolean).join(" ").slice(0, 520);
    const overview = useful
      ? useful.replace(/([.!?])\s+.*/, "$1")
      : `Public search results for ${company} were limited. Refer to the organisation's mission, customers, or recent work after checking its official website.`;
    return Response.json({ company, overview, sources: [...new Set(sources)].slice(0, 5) }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Research failed" }, { status: 500, headers: corsHeaders });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BYTES = 12 * 1024 * 1024;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json(401, { error: "Oturum gerekli." });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt);

    if (userError || !user) return json(401, { error: "Geçersiz oturum." });

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) return json(403, { error: "Bu işlem yalnızca yöneticiler içindir." });

    const { url } = (await req.json()) as { url?: string };
    if (!url || typeof url !== "string") return json(400, { error: "XML URL gerekli." });

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return json(400, { error: "Geçersiz URL." });
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return json(400, { error: "Sadece http/https adresleri kabul edilir." });
    }
    if (isPrivateHostname(parsed.hostname)) {
      return json(400, { error: "Yerel veya özel ağ adresleri kullanılamaz." });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/xml, text/xml, */*" },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return json(502, { error: `XML alınamadı (HTTP ${response.status}).` });
    }

    const contentLength = Number(response.headers.get("content-length") || "0");
    if (contentLength > MAX_BYTES) {
      return json(413, { error: "XML dosyası çok büyük." });
    }

    const xml = await response.text();
    if (xml.length > MAX_BYTES) return json(413, { error: "XML dosyası çok büyük." });
    if (!xml.trim()) return json(400, { error: "XML içeriği boş." });

    return json(200, { xml });
  } catch (error) {
    const message = error instanceof Error ? error.message : "XML alınamadı.";
    return json(500, { error: message });
  }
});

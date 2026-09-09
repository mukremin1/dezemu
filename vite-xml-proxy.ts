import type { IncomingMessage, ServerResponse } from "http";
import type { Plugin } from "vite";

const MAX_BYTES = 150 * 1024 * 1024;
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/xml, text/xml, application/rss+xml, application/atom+xml, text/plain, */*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const a = Number(ipv4[1]);
  const b = Number(ipv4[2]);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 100_000) {
        reject(new Error("İstek çok büyük."));
        return;
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function decodeXmlText(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function extractXmlCategoryGroups(xml: string): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const match of xml.matchAll(/<product>([\s\S]*?)<\/product>/g)) {
    const sku = (match[1].match(/<stock_code>([^<]*)/) || [])[1]?.trim();
    const raw = (match[1].match(/<main_category>([^<]*)/) || [])[1];
    if (!sku || !raw) continue;
    const name = decodeXmlText(raw.trim());
    if (!name) continue;
    (groups[name] ||= []).push(sku);
  }
  return groups;
}

async function downloadXml(target: string): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
  try {
    const response = await fetch(target, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleFetchXml(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const urlPath = req.url?.split("?")[0] || "";
  const categoriesOnly = urlPath === "/api/xml-categories";
  if (urlPath !== "/api/fetch-xml" && !categoriesOnly) {
    next();
    return;
  }

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "POST gerekli." });
    return;
  }

  try {
    const payload = JSON.parse((await readBody(req)) || "{}") as { url?: string };
    if (!payload.url || typeof payload.url !== "string") {
      sendJson(res, 400, { error: "XML URL gerekli." });
      return;
    }

    const parsed = new URL(payload.url.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      sendJson(res, 400, { error: "Sadece http/https adresleri kabul edilir." });
      return;
    }
    if (isPrivateHostname(parsed.hostname)) {
      sendJson(res, 400, { error: "Yerel veya özel ağ adresleri kullanılamaz." });
      return;
    }

    const target = parsed.toString();
    let result = await downloadXml(target);

    if (!result.ok && (result.status === 403 || result.status === 401 || result.status === 406)) {
      result = await downloadXml(target);
    }

    if (!result.ok) {
      sendJson(res, 502, {
        error: `XML linki açılmadı (HTTP ${result.status}). Linki tarayıcıda kontrol edin.`,
      });
      return;
    }

    const xml = result.text.replace(/^\uFEFF/, "");
    if (xml.length > MAX_BYTES) {
      sendJson(res, 413, { error: `XML dosyası çok büyük (${Math.round(xml.length / 1024 / 1024)} MB).` });
      return;
    }
    if (!xml.trim()) {
      sendJson(res, 400, { error: "XML içeriği boş." });
      return;
    }
    if (/^<!DOCTYPE html/i.test(xml.trim()) || /^<html/i.test(xml.trim())) {
      sendJson(res, 502, {
        error: "Link XML değil, HTML sayfa döndürdü. Doğrudan .xml adresini kullanın.",
      });
      return;
    }
    if (!xml.includes("<")) {
      sendJson(res, 502, { error: "Dönen içerik XML değil." });
      return;
    }

    if (categoriesOnly) {
      const groups = extractXmlCategoryGroups(xml);
      sendJson(res, 200, {
        groups,
        categoryCount: Object.keys(groups).length,
        productCount: Object.values(groups).reduce((sum, skus) => sum + skus.length, 0),
      });
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(xml);
  } catch (error) {
    const raw = error instanceof Error ? error.message : "XML alınamadı.";
    const message = /abort/i.test(raw) ? "XML linki zaman aşımına uğradı. Feed büyük olabilir, tekrar deneyin." : raw;
    sendJson(res, 500, { error: message });
  }
}

export function xmlFetchProxyPlugin(): Plugin {
  return {
    name: "xml-fetch-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleFetchXml(req, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleFetchXml(req, res, next);
      });
    },
  };
}

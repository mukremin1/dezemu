import { supabase } from "@/integrations/supabase/client";

export type ParsedXmlProduct = {
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  description: string | null;
  shortDescription: string | null;
  stock: number;
  sku: string | null;
  barcode: string | null;
  categoryName: string | null;
  imageUrls: string[];
  taxPercent: number;
};

export const FREE_SHIPPING_LIMIT = 300;

const PRODUCT_TAGS = new Set(["urun", "product", "item", "urunleritem"]);

const NAME_KEYS = [
  "isim",
  "ad",
  "adi",
  "urunadi",
  "urunad",
  "urunismi",
  "title",
  "productname",
  "producttitle",
  "baslik",
  "name",
];

const PRICE_KEYS = [
  "fiyat",
  "satisfiyati",
  "satisfiyat",
  "kdvdahilfiyat",
  "kdvdahil",
  "price",
  "saleprice",
  "amount",
  "birimfiyat",
  "listefiyati",
];

const COMPARE_KEYS = [
  "eskifiyat",
  "piyasafiyati",
  "piyasafiyat",
  "compareprice",
  "listprice",
  "indirimsizfiyat",
  "marketprice",
];

const DESC_KEYS = ["aciklama", "urunaciklama", "description", "details", "detay", "icerik", "longdescription"];
const SHORT_DESC_KEYS = ["kisaaciklama", "shortdescription", "ozet", "summary"];
const STOCK_KEYS = ["stok", "stokadedi", "stokmiktari", "quantity", "qty", "stock", "stockquantity", "inventory"];
const SKU_KEYS = [
  "sku",
  "stockcode",
  "stokkodu",
  "urunkodu",
  "modelkodu",
  "kod",
  "code",
  "productcode",
  "barkodkodu",
  "tedarikcistokkodu",
];
const BARCODE_KEYS = ["barkod", "barcode", "ean", "gtin"];
const CATEGORY_KEYS = [
  "maincategory",
  "kategori",
  "kategoriadi",
  "categoryname",
  "category",
  "grup",
  "producttype",
];
const TAX_KEYS = ["tax", "kdv", "kdvoran", "kdvorani", "vat", "taxrate"];
const SKIP_NESTED = new Set(["variants", "variant", "options", "option", "properties", "property"]);

function localName(tag: string): string {
  return tag.toLowerCase().replace(/^.*:/, "").replace(/[_-\s]/g, "");
}

function firstValue(record: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value != null && value.trim() !== "") return value.trim();
  }
  return "";
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function parsePrice(raw: string): number {
  if (!raw) return NaN;
  let text = raw.replace(/[^\d,.\-]/g, "").trim();
  if (!text) return NaN;
  if (text.includes(",") && text.includes(".")) {
    if (text.lastIndexOf(",") > text.lastIndexOf(".")) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (text.includes(",")) {
    const parts = text.split(",");
    text = parts.length === 2 && parts[1].length <= 2 ? text.replace(",", ".") : text.replace(/,/g, "");
  }
  const num = parseFloat(text);
  return Number.isFinite(num) ? num : NaN;
}

export type PriceSettings = {
  addKdv: boolean;
  profitPercent: number;
  cargoPrice: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function applySellPrice(basePrice: number, taxPercent: number, settings: PriceSettings): number {
  let price = basePrice;
  if (settings.addKdv) {
    const rate = Number.isFinite(taxPercent) && taxPercent > 0 ? taxPercent : 20;
    price *= 1 + rate / 100;
  }
  const profit = Number.isFinite(settings.profitPercent) ? Math.max(0, settings.profitPercent) : 0;
  price *= 1 + profit / 100;
  const cargo = Number.isFinite(settings.cargoPrice) ? Math.max(0, settings.cargoPrice) : 0;
  if (price < FREE_SHIPPING_LIMIT && cargo > 0) {
    price += cargo;
  }
  return roundMoney(price);
}

export function withSellPrices(products: ParsedXmlProduct[], settings: PriceSettings): ParsedXmlProduct[] {
  return products.map((item) => {
    const price = applySellPrice(item.price, item.taxPercent, settings);
    const comparePrice =
      item.comparePrice != null ? applySellPrice(item.comparePrice, item.taxPercent, settings) : null;
    return { ...item, price, comparePrice };
  });
}

const IMAGE_CONTAINERS = new Set(["resimler", "images", "imgs", "pictures", "gorseller"]);

function collectText(el: Element): string {
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

function isImageField(key: string): boolean {
  if (IMAGE_CONTAINERS.has(key)) return false;
  return (
    /^(resim|image|img|photo|picture|gorsel)(\d+)?$/.test(key) ||
    key.includes("imagelink") ||
    key.includes("imageurl")
  );
}

function collectImages(record: Record<string, string>, el: Element): string[] {
  const urls: string[] = [];
  const push = (value: string) => {
    const url = value.trim();
    if (/^https?:\/\//i.test(url) && !urls.includes(url)) urls.push(url);
  };

  for (const [key, value] of Object.entries(record)) {
    if (isImageField(key)) {
      value.split("|").forEach(push);
    }
  }

  Array.from(el.getElementsByTagName("*")).forEach((child) => {
    const name = localName(child.tagName);
    if (!isImageField(name)) return;
    const attr = child.getAttribute("url") || child.getAttribute("src") || child.getAttribute("href") || "";
    if (attr) push(attr);
    const text = collectText(child);
    if (/^https?:\/\//i.test(text) && !text.includes(" ")) push(text);
  });

  return urls;
}

function elementToRecord(el: Element): Record<string, string> {
  const record: Record<string, string> = {};

  const add = (key: string, value: string) => {
    const k = localName(key);
    const v = value.trim();
    if (!k || !v) return;
    if (!record[k]) record[k] = v;
    else if (!record[k].includes(v)) record[k] = `${record[k]} | ${v}`;
  };

  Array.from(el.attributes).forEach((attr) => add(attr.name, attr.value));

  Array.from(el.children).forEach((child) => {
    if (child.children.length === 0) {
      add(child.tagName, collectText(child));
      return;
    }

    const nestedName = localName(child.tagName);
    if (SKIP_NESTED.has(nestedName)) return;
    if (IMAGE_CONTAINERS.has(nestedName)) {
      Array.from(child.getElementsByTagName("*")).forEach((img) => {
        const attr = img.getAttribute("url") || img.getAttribute("src") || img.getAttribute("href") || "";
        if (attr) add("resim", attr);
        const text = collectText(img);
        if (/^https?:\/\//i.test(text)) add("resim", text);
      });
      return;
    }

    const nested = elementToRecord(child);
    Object.entries(nested).forEach(([k, v]) => add(k, v));
    const direct = collectText(child);
    if (direct && direct.length < 400) add(child.tagName, direct);
  });

  return record;
}

function findProductElements(doc: Document): Element[] {
  for (const tag of ["product", "urun", "item", "Product", "Urun", "Item"]) {
    const nodes = Array.from(doc.getElementsByTagName(tag));
    if (nodes.length > 0) return nodes;
  }

  const all = Array.from(doc.getElementsByTagName("*"));
  const byTag = all.filter((el) => PRODUCT_TAGS.has(localName(el.tagName)));
  if (byTag.length > 0) return byTag;

  const counts = new Map<string, Element[]>();
  all.forEach((el) => {
    if (el === doc.documentElement) return;
    const name = localName(el.tagName);
    if (!counts.has(name)) counts.set(name, []);
    counts.get(name)!.push(el);
  });

  let best: Element[] = [];
  counts.forEach((nodes) => {
    if (nodes.length < 2 || nodes.length <= best.length) return;
    const sample = elementToRecord(nodes[0]);
    const hasName = firstValue(sample, NAME_KEYS);
    const hasPrice = firstValue(sample, PRICE_KEYS);
    if (hasName && hasPrice) best = nodes;
  });

  return best;
}

export function parseXmlProducts(xmlText: string): ParsedXmlProduct[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Geçersiz XML formatı. Dosyanın XML olduğundan emin olun.");
  }

  const nodes = findProductElements(doc);
  const products: ParsedXmlProduct[] = [];
  const usedSlugs = new Set<string>();

  nodes.forEach((node, index) => {
    const record = elementToRecord(node);
    const name = firstValue(record, NAME_KEYS);
    const price = parsePrice(firstValue(record, PRICE_KEYS));
    if (!name || Number.isNaN(price) || price < 0) return;

    const compareRaw = firstValue(record, COMPARE_KEYS);
    const comparePrice = compareRaw ? parsePrice(compareRaw) : NaN;
    const sku = firstValue(record, SKU_KEYS) || null;
    const barcode = firstValue(record, BARCODE_KEYS) || null;
    const description = firstValue(record, DESC_KEYS) || null;
    const shortDescription = firstValue(record, SHORT_DESC_KEYS) || description?.slice(0, 180) || null;
    const stockRaw = firstValue(record, STOCK_KEYS);
    const stockParsed = stockRaw ? parseInt(stockRaw.replace(/[^\d-]/g, ""), 10) : 0;
    const categoryName = firstValue(record, CATEGORY_KEYS) || null;
    const taxParsed = parsePrice(firstValue(record, TAX_KEYS));
    const taxPercent = Number.isFinite(taxParsed) && taxParsed > 0 ? taxParsed : 20;

    let slug = slugify(name) || `urun-${index + 1}`;
    if (sku) slug = `${slug}-${slugify(sku)}`.replace(/-+$/g, "");
    if (usedSlugs.has(slug)) slug = `${slug}-${index + 1}`;
    usedSlugs.add(slug);

    products.push({
      name,
      slug: slug.slice(0, 90),
      price,
      comparePrice: Number.isFinite(comparePrice) && comparePrice > 0 ? comparePrice : null,
      description,
      shortDescription,
      stock: Number.isFinite(stockParsed) ? Math.max(0, stockParsed) : 0,
      sku,
      barcode,
      categoryName,
      imageUrls: collectImages(record, node).slice(0, 8),
      taxPercent,
    });
  });

  return products;
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "metadata.google.internal" ||
    host.endsWith(".internal")
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

export function validateXmlUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("Geçerli bir URL girin.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Sadece http veya https adresleri kabul edilir.");
  }

  if (isPrivateHostname(parsed.hostname)) {
    throw new Error("Yerel veya özel ağ adresleri kullanılamaz.");
  }

  return parsed.toString();
}

async function readResponseXml(res: Response): Promise<string> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) throw new Error("XML içeriği boş.");
  if (trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html")) {
    throw new Error("Adres XML yerine HTML döndürdü.");
  }
  if (!trimmed.includes("<")) {
    throw new Error("Dönen içerik XML değil.");
  }
  return text;
}

async function tryReadXml(requestUrl: string, init?: RequestInit): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    const res = await fetch(requestUrl, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await readResponseXml(res);
  } catch {
    return null;
  }
}

async function fetchViaLocalProxy(
  url: string
): Promise<{ xml?: string; error?: string; reachable: boolean }> {
  try {
    const res = await fetch("/api/fetch-xml", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = (await res.json()) as { xml?: string; error?: string };
      if (payload?.xml) return { xml: payload.xml, reachable: true };
      return { error: payload?.error || `XML alınamadı (HTTP ${res.status}).`, reachable: true };
    }
    const xml = await res.text();
    if (res.ok && xml.includes("<")) return { xml, reachable: true };
    return { error: `XML alınamadı (HTTP ${res.status}).`, reachable: true };
  } catch {
    return { reachable: false };
  }
}

export function splitXmlUrls(raw: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const value = part.trim();
    if (!/^https?:\/\//i.test(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    urls.push(value);
  }
  return urls;
}

export function extractXmlCategoryGroups(xmlText: string): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  const decode = (value: string) =>
    value
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

  for (const match of xmlText.matchAll(/<product>([\s\S]*?)<\/product>/g)) {
    const sku = (match[1].match(/<stock_code>([^<]*)/) || [])[1]?.trim();
    const raw = (match[1].match(/<main_category>([^<]*)/) || [])[1];
    if (!sku || !raw) continue;
    const name = decode(raw.trim());
    if (!name) continue;
    (groups[name] ||= []).push(sku);
  }
  return groups;
}

export async function fetchXmlCategoryGroups(rawUrl: string): Promise<Record<string, string[]>> {
  const url = validateXmlUrl(rawUrl);
  try {
    const res = await fetch("/api/xml-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const payload = (await res.json()) as { groups?: Record<string, string[]>; error?: string };
    if (payload?.groups && Object.keys(payload.groups).length > 0) return payload.groups;
    if (payload?.error) throw new Error(payload.error);
  } catch (err) {
    if (err instanceof Error && /XML|link|geçerli|http/i.test(err.message)) throw err;
  }

  const xml = await fetchXmlFromUrl(url);
  return extractXmlCategoryGroups(xml);
}

function fallbackCategorySlug(name: string) {
  const n = name
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
  if (/elektronik|telefon|bilgisayar|tablet|teknoloji|kulaklik|bilisim/.test(n)) return "elektronik";
  if (/giyim|ayakkab|moda|taki|aksesuar|bebek|anne/.test(n)) return "giyim";
  if (/kozmetik|bakim|parfum|makyaj|kisisel/.test(n)) return "kozmetik";
  return "ev-yasam";
}

function skuKey(sku: string) {
  const trimmed = sku.trim();
  const match = trimmed.match(/^(HS\d+-\d+)/i);
  return (match?.[1] || trimmed).toUpperCase();
}

async function loadProductSkuIndex(onProgress?: (message: string) => void) {
  const index = new Map<string, string[]>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku")
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    onProgress?.(`Ürünler okunuyor ${(from + rows.length).toLocaleString("tr-TR")}`);
    for (const row of rows) {
      if (!row.sku) continue;
      const key = skuKey(row.sku);
      const list = index.get(key) ?? [];
      list.push(row.id);
      index.set(key, list);
    }
    if (rows.length < pageSize) break;
  }
  onProgress?.(`${index.size.toLocaleString("tr-TR")} ürün kodu hazır`);
  return index;
}

function classifyName(name: string) {
  const n = name
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
  if (
    /kulaklik|bluetooth|saat|powerbank|projeksiyon|speaker|hoparlor|usb|gps|nfc|amoled|tws|anc|telefon|tablet|sarj|kablosuz|elektronik/.test(
      n
    )
  ) {
    return "elektronik";
  }
  if (/kulot|tanga|corap|sutyen|dantel|slip|elbise|pantolon|sort|tayt|atlet|giyim|tshirt|tisort|jartiyer/.test(n)) {
    return "giyim";
  }
  if (/krem|parfum|makyaj|ruj|sampuan|cilt|kozmetik|maskara/.test(n)) return "kozmetik";
  return "ev-yasam";
}

export async function assignUncategorizedByName(onProgress?: (message: string) => void) {
  const { data: existing } = await supabase.from("categories").select("id, slug");
  const ids = new Map<string, string>();
  (existing ?? []).forEach((row: { id: string; slug: string }) => ids.set(row.slug, row.id));

  const buckets = new Map<string, string[]>();
  const pageSize = 1000;
  let scanned = 0;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name")
      .eq("is_active", true)
      .is("category_id", null)
      .gt("price", 0)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    scanned += rows.length;
    onProgress?.(`Kategorisiz ürünler sınıflandırılıyor ${scanned.toLocaleString("tr-TR")}`);
    for (const row of rows) {
      const slug = classifyName(row.name || "");
      const list = buckets.get(slug) ?? [];
      list.push(row.id);
      buckets.set(slug, list);
    }
    if (rows.length < pageSize) break;
  }

  let updated = 0;
  for (const [slug, productIds] of buckets.entries()) {
    const categoryId = ids.get(slug);
    if (!categoryId) continue;
    for (let i = 0; i < productIds.length; i += 150) {
      const chunk = productIds.slice(i, i + 150);
      onProgress?.(`${slug} bağlanıyor ${Math.min(i + chunk.length, productIds.length)} / ${productIds.length}`);
      const { error, count } = await supabase
        .from("products")
        .update({ category_id: categoryId }, { count: "exact" })
        .in("id", chunk);
      if (!error) updated += count ?? chunk.length;
    }
  }
  return { updated, scanned };
}

export async function assignXmlCategories(
  groups: Record<string, string[]>,
  onProgress?: (message: string) => void
) {
  const { data: existing } = await supabase.from("categories").select("id, slug");
  const ids = new Map<string, string>();
  (existing ?? []).forEach((row: { id: string; slug: string }) => ids.set(row.slug, row.id));

  const names = Object.keys(groups);
  let created = 0;
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const slug = slugify(name);
    onProgress?.(`Kategori hazırlanıyor ${i + 1} / ${names.length}: ${name}`);
    if (slug && !ids.has(slug)) {
      const { data: inserted, error } = await supabase.from("categories").insert({ name, slug }).select("id").single();
      if (!error && inserted?.id) {
        ids.set(slug, inserted.id);
        created += 1;
      }
    }
  }

  onProgress?.("Mağazadaki ürün kodları okunuyor...");
  const index = await loadProductSkuIndex(onProgress);

  let updated = 0;
  let unmatched = 0;
  const totalXml = Object.values(groups).reduce((sum, skus) => sum + skus.length, 0);
  let seen = 0;

  for (const [name, skus] of Object.entries(groups)) {
    const slug = slugify(name);
    const categoryId = (slug && ids.get(slug)) || ids.get(fallbackCategorySlug(name));
    if (!categoryId) {
      unmatched += skus.length;
      continue;
    }

    const productIds = new Set<string>();
    for (const sku of skus) {
      seen += 1;
      const matches = index.get(skuKey(sku)) ?? [];
      if (matches.length === 0) unmatched += 1;
      matches.forEach((id) => productIds.add(id));
    }

    const idsToUpdate = [...productIds];
    for (let i = 0; i < idsToUpdate.length; i += 150) {
      const chunk = idsToUpdate.slice(i, i + 150);
      onProgress?.(`Ürünler bağlanıyor ${name} (${Math.min(i + chunk.length, idsToUpdate.length)}/${idsToUpdate.length}) · XML ${seen.toLocaleString("tr-TR")}/${totalXml.toLocaleString("tr-TR")}`);
      const { error, count } = await supabase
        .from("products")
        .update({ category_id: categoryId }, { count: "exact" })
        .in("id", chunk);
      if (!error) updated += count ?? chunk.length;
    }
  }

  return { updated, failed: unmatched, categories: names.length, created };
}

type ProductLite = { id: string; sku: string | null; name: string; created_at: string };

export function canonicalSku(sku: string) {
  const trimmed = sku.trim();
  const hs = trimmed.match(/^(HS\d+-\d+)/i);
  if (hs) return hs[1].toUpperCase();
  if (/^SKU-\d{13}-\d+$/i.test(trimmed)) return "";
  const stripped = trimmed.replace(/-\d{13}-\d+$/, "");
  return stripped ? stripped.toUpperCase() : trimmed.toUpperCase();
}

function duplicateGroupKey(row: ProductLite) {
  const sku = (row.sku || "").trim();
  if (sku) {
    const key = canonicalSku(sku);
    if (key) return `sku:${key}`;
  }
  return `name:${(row.name || "").trim().toLowerCase()}`;
}

function pickKeeper(rows: ProductLite[]) {
  return [...rows].sort((a, b) => {
    const aKey = a.sku ? canonicalSku(a.sku) : "";
    const bKey = b.sku ? canonicalSku(b.sku) : "";
    const aExact = !!(a.sku && aKey && a.sku.toUpperCase() === aKey);
    const bExact = !!(b.sku && bKey && b.sku.toUpperCase() === bKey);
    if (aExact !== bExact) return aExact ? -1 : 1;
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime;
  })[0];
}

export async function dedupeImportedProducts(onProgress?: (message: string) => void) {
  const pageSize = 1000;
  const rows: ProductLite[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, created_at")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = (data as ProductLite[]) ?? [];
    rows.push(...chunk);
    onProgress?.(`Ürünler okunuyor ${rows.length.toLocaleString("tr-TR")}`);
    if (chunk.length < pageSize) break;
  }

  const groups = new Map<string, ProductLite[]>();
  for (const row of rows) {
    const key = duplicateGroupKey(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const deleteIds: string[] = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const keep = pickKeeper(members);
    if (!keep) continue;
    for (const row of members) {
      if (row.id !== keep.id) deleteIds.push(row.id);
    }
  }

  const byName = new Map<string, ProductLite[]>();
  const deleteSet = new Set(deleteIds);
  for (const row of rows) {
    if (deleteSet.has(row.id)) continue;
    const nameKey = (row.name || "").trim().toLowerCase();
    if (!nameKey) continue;
    const list = byName.get(nameKey) ?? [];
    list.push(row);
    byName.set(nameKey, list);
  }
  for (const members of byName.values()) {
    if (members.length < 2) continue;
    const keep = pickKeeper(members);
    if (!keep) continue;
    for (const row of members) {
      if (row.id !== keep.id && !deleteSet.has(row.id)) {
        deleteIds.push(row.id);
        deleteSet.add(row.id);
      }
    }
  }

  let deleted = 0;
  let deactivated = 0;
  for (let i = 0; i < deleteIds.length; i += 80) {
    const chunk = deleteIds.slice(i, i + 80);
    onProgress?.(`Kopyalar siliniyor ${Math.min(i + chunk.length, deleteIds.length).toLocaleString("tr-TR")} / ${deleteIds.length.toLocaleString("tr-TR")}`);
    const { error, count } = await supabase.from("products").delete({ count: "exact" }).in("id", chunk);
    if (error) {
      const { error: hideError, count: hideCount } = await supabase
        .from("products")
        .update({ is_active: false }, { count: "exact" })
        .in("id", chunk);
      if (!hideError) deactivated += hideCount ?? chunk.length;
    } else {
      deleted += count ?? chunk.length;
    }
  }

  const remaining = rows.length - deleted;
  return { scanned: rows.length, groups: rows.length - deleteIds.length, deleted, deactivated, restored: 0, remaining };
}

export async function keepOnlyXmlSkus(xmlSkus: string[], onProgress?: (message: string) => void) {
  const wanted = new Set(xmlSkus.map((sku) => sku.trim().toUpperCase()).filter(Boolean));
  const pageSize = 1000;
  const rows: ProductLite[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, created_at")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = (data as ProductLite[]) ?? [];
    rows.push(...chunk);
    onProgress?.(`Ürünler okunuyor ${rows.length.toLocaleString("tr-TR")}`);
    if (chunk.length < pageSize) break;
  }

  const bySku = new Map<string, ProductLite[]>();
  for (const row of rows) {
    if (!row.sku) continue;
    const key = skuKey(row.sku);
    if (!wanted.has(key)) continue;
    const list = bySku.get(key) ?? [];
    list.push(row);
    bySku.set(key, list);
  }

  const keepIds = new Set<string>();
  for (const members of bySku.values()) {
    const keep = pickKeeper(members);
    if (keep) keepIds.add(keep.id);
  }

  const deleteIds = rows.filter((row) => !keepIds.has(row.id)).map((row) => row.id);
  let deleted = 0;
  let deactivated = 0;
  for (let i = 0; i < deleteIds.length; i += 80) {
    const chunk = deleteIds.slice(i, i + 80);
    onProgress?.(
      `XML dışı kopyalar siliniyor ${Math.min(i + chunk.length, deleteIds.length).toLocaleString("tr-TR")} / ${deleteIds.length.toLocaleString("tr-TR")}`
    );
    const { error, count } = await supabase.from("products").delete({ count: "exact" }).in("id", chunk);
    if (error) {
      const { error: hideError, count: hideCount } = await supabase
        .from("products")
        .update({ is_active: false }, { count: "exact" })
        .in("id", chunk);
      if (!hideError) deactivated += hideCount ?? chunk.length;
    } else {
      deleted += count ?? chunk.length;
    }
  }

  return {
    scanned: rows.length,
    kept: keepIds.size,
    xmlSkus: wanted.size,
    deleted,
    deactivated,
    remaining: rows.length - deleted,
  };
}

export async function fetchXmlFromUrl(rawUrl: string): Promise<string> {
  const url = validateXmlUrl(rawUrl);

  const proxied = await fetchViaLocalProxy(url);
  if (proxied.xml) return proxied.xml;

  const direct = await tryReadXml(url, {
    headers: {
      Accept: "application/xml, text/xml, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  });
  if (direct) return direct;

  if (proxied.reachable && proxied.error) {
    throw new Error(proxied.error);
  }

  throw new Error("XML linkine erişilemedi. Linkin tarayıcıda doğrudan XML açtığını kontrol edin.");
}

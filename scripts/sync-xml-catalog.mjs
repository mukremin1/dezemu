import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const DEFAULT_XML_FEED_URL =
  "https://hepsicdn.com.tr/xml/Mjg2fDMwNzY2NjYxODcw.e61e1972e3c82d16496fc40029d7ffa1dfdd37c83918754257ce50a52e6ae37e";
const FREE_SHIPPING_LIMIT = 300;
const SELLER_ID = "dezemu";
const PAGE_SIZE = 1000;
const UPDATE_CONCURRENCY = 6;

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

function env(name, fallback = "") {
  const value = (process.env[name] ?? "").trim();
  return value || fallback;
}

function slugify(value) {
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

function canonicalSku(sku) {
  const trimmed = String(sku || "").trim();
  const hs = trimmed.match(/^(HS\d+-\d+)/i);
  if (hs) return hs[1].toUpperCase();
  return trimmed.toUpperCase();
}

function parsePrice(raw) {
  if (!raw) return NaN;
  let text = String(raw).replace(/[^\d,.\-]/g, "").trim();
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

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function applySellPrice(basePrice, taxPercent, settings) {
  let price = basePrice;
  if (settings.addKdv) {
    const rate = Number.isFinite(taxPercent) && taxPercent > 0 ? taxPercent : 20;
    price *= 1 + rate / 100;
  }
  price *= 1 + Math.max(0, settings.profitPercent) / 100;
  if (price < FREE_SHIPPING_LIMIT && settings.cargoPrice > 0) {
    price += settings.cargoPrice;
  }
  return roundMoney(price);
}

function fallbackCategorySlug(name) {
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

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function tagValue(block, names) {
  for (const name of names) {
    const open = `<${name}(?:\\s[^>]*)?>`;
    const close = `</${name}>`;
    const cdata = block.match(new RegExp(`${open}\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*${close}`, "i"));
    if (cdata?.[1]) return decodeXml(cdata[1]);
    const simple = block.match(new RegExp(`${open}([\\s\\S]*?)${close}`, "i"));
    if (simple?.[1]) return decodeXml(simple[1]);
  }
  return "";
}

function collectImages(block) {
  const urls = [];
  for (const match of block.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    const url = match[0].replace(/[.,);]+$/, "");
    if (!/^https?:\/\//i.test(url)) continue;
    if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) || /image|img|cdn|resim|photo/i.test(url)) {
      if (!urls.includes(url)) urls.push(url);
    }
    if (urls.length >= 8) break;
  }
  return urls;
}

function parseXmlProducts(xml) {
  const products = [];
  const seen = new Set();
  for (const match of xml.matchAll(/<product>([\s\S]*?)<\/product>/gi)) {
    const block = match[1];
    const sku = canonicalSku(tagValue(block, ["stock_code", "stockcode", "sku", "stokkodu", "urunkodu"]));
    const name = tagValue(block, ["title", "name", "urunadi", "productname", "baslik"]);
    const priceRaw = tagValue(block, ["sale_price", "saleprice", "price", "satisfiyati", "fiyat"]);
    const price = parsePrice(priceRaw);
    if (!sku || !name || !Number.isFinite(price) || price < 0) continue;
    if (seen.has(sku)) continue;
    seen.add(sku);

    const compareRaw = tagValue(block, ["list_price", "listprice", "compareprice", "eskifiyat", "price"]);
    const compareParsed = parsePrice(compareRaw);
    const stockRaw = tagValue(block, ["quantity", "stock", "inventory", "stok", "stokadedi"]);
    const stockParsed = stockRaw ? parseInt(stockRaw.replace(/[^\d-]/g, ""), 10) : 0;
    const taxParsed = parsePrice(tagValue(block, ["tax", "kdv", "vat", "taxrate"]));
    const description = tagValue(block, ["description", "aciklama", "detail", "details"]) || null;
    const categoryName = tagValue(block, ["main_category", "maincategory", "category", "kategori"]) || null;
    let slug = `${slugify(name)}-${slugify(sku)}`.replace(/-+$/g, "").slice(0, 90);
    if (!slug) slug = `urun-${sku.toLowerCase()}`;

    products.push({
      sku,
      name,
      slug,
      price,
      comparePrice: Number.isFinite(compareParsed) && compareParsed > 0 ? compareParsed : null,
      description,
      shortDescription: description ? description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180) : null,
      stock: Number.isFinite(stockParsed) ? Math.max(0, stockParsed) : 0,
      barcode: tagValue(block, ["barcode", "barkod", "ean"]) || null,
      categoryName,
      imageUrls: collectImages(block),
      taxPercent: Number.isFinite(taxParsed) && taxParsed > 0 ? taxParsed : 20,
    });
  }
  return products;
}

async function fetchXml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/xml, text/xml, */*",
      },
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`XML alınamadı (HTTP ${response.status}).`);
    const xml = (await response.text()).replace(/^\uFEFF/, "");
    if (!xml.includes("<product")) throw new Error("XML içinde ürün bulunamadı.");
    return xml;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadExisting(supabase) {
  const bySku = new Map();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, price, stock_quantity, slug")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data ?? [];
    for (const row of rows) {
      if (!row.sku) continue;
      const key = canonicalSku(row.sku);
      const current = bySku.get(key);
      const exact = row.sku.toUpperCase() === key;
      if (!current || (exact && current.sku.toUpperCase() !== key)) {
        bySku.set(key, row);
      }
    }
    process.stdout.write(`\rMevcut ürünler: ${(from + rows.length).toLocaleString("tr-TR")}`);
    if (rows.length < PAGE_SIZE) break;
  }
  process.stdout.write("\n");
  return bySku;
}

async function loadCategoryIds(supabase) {
  const { data, error } = await supabase.from("categories").select("id, slug");
  if (error) throw error;
  const map = new Map();
  for (const row of data ?? []) map.set(row.slug, row.id);
  return map;
}

async function mapPool(items, concurrency, worker) {
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index++;
      await worker(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, run));
}

function moneyEq(a, b) {
  return roundMoney(Number(a) || 0) === roundMoney(Number(b) || 0);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const xmlUrl = env("XML_FEED_URL", env("VITE_XML_FEED_URL", DEFAULT_XML_FEED_URL));
  const supabaseUrl = env("SUPABASE_URL", env("VITE_SUPABASE_URL"));
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const settings = {
    addKdv: env("XML_ADD_KDV", "true") !== "false",
    profitPercent: Number(env("XML_PROFIT_PERCENT", "20")) || 0,
    cargoPrice: Number(env("XML_CARGO_PRICE", "49")) || 0,
  };

  if (!xmlUrl) throw new Error("XML_FEED_URL tanımlı değil.");
  if (!dryRun && (!supabaseUrl || !serviceKey)) {
    throw new Error("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  }

  console.log(`XML indiriliyor: ${xmlUrl.slice(0, 64)}...`);
  const xml = await fetchXml(xmlUrl);
  const parsed = parseXmlProducts(xml);
  console.log(`XML ürün: ${parsed.length.toLocaleString("tr-TR")}`);
  if (parsed.length === 0) throw new Error("XML'den ürün okunamadı.");

  const priced = parsed.map((item) => ({
    ...item,
    price: applySellPrice(item.price, item.taxPercent, settings),
    comparePrice:
      item.comparePrice != null ? applySellPrice(item.comparePrice, item.taxPercent, settings) : null,
  }));

  if (dryRun) {
    console.log("Dry-run: veritabanına yazılmadı.");
    console.log(`Örnek SKU: ${priced[0].sku} · ${priced[0].name} · ${priced[0].price} ₺ · stok ${priced[0].stock}`);
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const existing = await loadExisting(supabase);
  const categories = await loadCategoryIds(supabase);
  const counts = { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  const usedSlugs = new Set([...existing.values()].map((row) => row.slug));

  const toUpdate = [];
  const toInsert = [];
  for (const item of priced) {
    const row = existing.get(item.sku);
    if (row) {
      if (moneyEq(row.price, item.price) && Number(row.stock_quantity) === item.stock && row.name === item.name) {
        counts.skipped++;
        continue;
      }
      toUpdate.push({ id: row.id, item });
    } else {
      toInsert.push(item);
    }
  }

  console.log(`Güncellenecek: ${toUpdate.length.toLocaleString("tr-TR")} · Yeni: ${toInsert.length.toLocaleString("tr-TR")} · Aynı: ${counts.skipped.toLocaleString("tr-TR")}`);

  await mapPool(toUpdate, UPDATE_CONCURRENCY, async ({ id, item }, index) => {
    const { error } = await supabase
      .from("products")
      .update({
        name: item.name,
        price: item.price,
        compare_price: item.comparePrice,
        description: item.description,
        short_description: item.shortDescription,
        stock_quantity: item.stock,
        barcode: item.barcode,
      })
      .eq("id", id);
    if (error) {
      counts.failed++;
      console.error(`Güncelleme hatası ${item.sku}: ${error.message}`);
      return;
    }
    counts.updated++;
    if ((index + 1) % 200 === 0 || index + 1 === toUpdate.length) {
      console.log(`Güncellendi ${index + 1}/${toUpdate.length}`);
    }
  });

  for (let i = 0; i < toInsert.length; i++) {
    const item = toInsert[i];
    let slug = item.slug;
    if (usedSlugs.has(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 8)}`;
    usedSlugs.add(slug);
    const categoryId = item.categoryName ? categories.get(fallbackCategorySlug(item.categoryName)) ?? null : null;
    const payload = {
      name: item.name,
      slug,
      price: item.price,
      compare_price: item.comparePrice,
      description: item.description,
      short_description: item.shortDescription,
      stock_quantity: item.stock,
      sku: item.sku,
      barcode: item.barcode,
      category_id: categoryId,
      is_active: true,
      is_featured: false,
      is_digital: false,
      seller_id: SELLER_ID,
    };
    const { data, error } = await supabase.from("products").insert(payload).select("id").single();
    if (error) {
      counts.failed++;
      console.error(`Ekleme hatası ${item.sku}: ${error.message}`);
      continue;
    }
    if (data?.id && item.imageUrls.length) {
      await supabase.from("product_images").insert(
        item.imageUrls.map((image_url, position) => ({
          product_id: data.id,
          image_url,
          alt_text: null,
          position,
        }))
      );
    }
    counts.inserted++;
    if ((i + 1) % 50 === 0 || i + 1 === toInsert.length) {
      console.log(`Eklendi ${i + 1}/${toInsert.length}`);
    }
  }

  console.log(
    `Bitti. Yeni: ${counts.inserted} · Güncellenen: ${counts.updated} · Aynı: ${counts.skipped} · Hata: ${counts.failed}`
  );
  if (counts.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

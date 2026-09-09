import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Link2, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_XML_FEED_URL, XML_URL_STORAGE_KEY } from "@/lib/xmlFeed";
import {
  applySellPrice,
  assignXmlCategories,
  assignUncategorizedByName,
  canonicalSku,
  dedupeImportedProducts,
  fetchXmlCategoryGroups,
  fetchXmlFromUrl,
  FREE_SHIPPING_LIMIT,
  keepOnlyXmlSkus,
  parseXmlProducts,
  slugify,
  splitXmlUrls,
  withSellPrices,
  type ParsedXmlProduct,
  type PriceSettings,
} from "@/lib/xmlProductImport";

const SELLER_ID = (import.meta as any).env?.VITE_SUPABASE_SINGLE_SELLER_ID || "dezemu";
const MAX_PRODUCTS = 50000;

type ImportResult = {
  success: number;
  updated: number;
  failed: number;
  skipped: number;
};

async function getOrCreateCategory(
  name: string,
  cache: Map<string, string | null>
): Promise<string | null> {
  const slug = slugify(name);
  if (!slug) return null;
  if (cache.has(slug)) return cache.get(slug) ?? null;

  const { data: existing } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
  if (existing?.id) {
    cache.set(slug, existing.id);
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("categories")
    .insert({ name, slug })
    .select("id")
    .single();

  if (error || !created?.id) {
    cache.set(slug, null);
    return null;
  }

  cache.set(slug, created.id);
  return created.id;
}

async function saveImages(productId: string, urls: string[], replace: boolean) {
  if (replace) {
    await supabase.from("product_images").delete().eq("product_id", productId);
  }
  if (urls.length === 0) return;

  const rows = urls.map((image_url, position) => ({
    product_id: productId,
    image_url,
    alt_text: null,
    position,
  }));
  await supabase.from("product_images").insert(rows);
}

function productPayload(item: ParsedXmlProduct, categoryId: string | null) {
  return {
    name: item.name,
    slug: item.slug,
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
  };
}

async function insertProduct(payload: Record<string, unknown>) {
  const withSeller = { ...payload, seller_id: SELLER_ID };
  const first = await supabase.from("products").insert(withSeller).select("id").single();
  if (!first.error) return first;
  if (!/seller_id/i.test(first.error.message || "")) return first;
  return supabase.from("products").insert(payload).select("id").single();
}

function parseNumber(raw: string, fallback = 0): number {
  const value = parseFloat(raw.replace(",", "."));
  return Number.isFinite(value) ? value : fallback;
}

export default function AdminXmlImport() {
  const [xmlUrl, setXmlUrl] = useState(
    () => import.meta.env.VITE_XML_FEED_URL || DEFAULT_XML_FEED_URL
  );
  const [addKdv, setAddKdv] = useState(true);
  const [profitPercent, setProfitPercent] = useState("20");
  const [cargoPrice, setCargoPrice] = useState("49");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(XML_URL_STORAGE_KEY);
    if (saved) setXmlUrl(saved);
  }, []);

  useEffect(() => {
    if (xmlUrl.trim()) window.localStorage.setItem(XML_URL_STORAGE_KEY, xmlUrl);
  }, [xmlUrl]);

  const settings: PriceSettings = useMemo(
    () => ({
      addKdv,
      profitPercent: parseNumber(profitPercent, 0),
      cargoPrice: parseNumber(cargoPrice, 0),
    }),
    [addKdv, profitPercent, cargoPrice]
  );

  const example = useMemo(() => {
    const afterKdv = addKdv ? 100 * 1.2 : 100;
    const afterProfit = applySellPrice(100, 20, { ...settings, cargoPrice: 0 });
    const finalPrice = applySellPrice(100, 20, settings);
    return { afterKdv, afterProfit, finalPrice };
  }, [addKdv, settings]);

  const importProducts = async (items: ParsedXmlProduct[]) => {
    const counts: ImportResult = { success: 0, updated: 0, failed: 0, skipped: 0 };
    const categoryCache = new Map<string, string | null>();
    const skuList = items.map((p) => p.sku).filter((sku): sku is string => !!sku);
    const existingBySku = new Map<string, { id: string; slug: string }>();

    for (let i = 0; i < skuList.length; i += 100) {
      const chunk = skuList.slice(i, i + 100);
      const orFilter = chunk
        .map((sku) => `sku.eq.${sku},sku.like.${sku}-%`)
        .join(",");
      const { data } = await supabase.from("products").select("id, sku, slug").or(orFilter);
      (data ?? []).forEach((row: any) => {
        if (!row.sku) return;
        existingBySku.set(row.sku, { id: row.id, slug: row.slug });
        existingBySku.set(canonicalSku(row.sku) || row.sku, { id: row.id, slug: row.slug });
      });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setProgress(`Kaydediliyor ${i + 1} / ${items.length}`);

      try {
        const categoryId = item.categoryName
          ? await getOrCreateCategory(item.categoryName, categoryCache)
          : null;
        const existing = item.sku
          ? existingBySku.get(item.sku) || existingBySku.get(canonicalSku(item.sku))
          : undefined;
        const payload = productPayload(item, categoryId);

        if (existing) {
          if (!updateExisting) {
            counts.skipped++;
            continue;
          }
          const { error: updateError } = await supabase
            .from("products")
            .update({
              name: payload.name,
              price: payload.price,
              compare_price: payload.compare_price,
              description: payload.description,
              short_description: payload.short_description,
              stock_quantity: payload.stock_quantity,
              barcode: payload.barcode,
              category_id: payload.category_id,
              is_active: true,
            })
            .eq("id", existing.id);
          if (updateError) throw updateError;
          await saveImages(existing.id, item.imageUrls, true);
          counts.updated++;
          continue;
        }

        let slug = payload.slug;
        const { data: slugHit } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
        if (slugHit?.id) slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;

        const { data: inserted, error: insertError } = await insertProduct({ ...payload, slug });
        if (insertError) throw insertError;
        if (inserted?.id) await saveImages(inserted.id, item.imageUrls, false);
        counts.success++;
      } catch (err) {
        console.error("XML product import error:", err, item);
        counts.failed++;
      }
    }

    return counts;
  };

  const handleAssignCategories = async () => {
    setError(null);
    setSuccess(null);
    setResult(null);
    setBusy(true);
    try {
      const urls = splitXmlUrls(xmlUrl);
      if (urls.length === 0) {
        throw new Error("Geçerli bir XML linki girin. http veya https ile başlamalı.");
      }
      const merged: Record<string, string[]> = {};
      for (let i = 0; i < urls.length; i++) {
        setProgress(`Kategoriler okunuyor ${i + 1} / ${urls.length}`);
        const groups = await fetchXmlCategoryGroups(urls[i]);
        Object.entries(groups).forEach(([name, skus]) => {
          merged[name] = [...(merged[name] ?? []), ...skus];
        });
      }
      if (Object.keys(merged).length === 0) {
        throw new Error("XML içinde ana kategori bulunamadı.");
      }
      const counts = await assignXmlCategories(merged, setProgress);
      const named = await assignUncategorizedByName(setProgress);
      setSuccess(
        `${counts.categories} XML kategorisi işlendi, ${counts.updated + named.updated} ürün bağlandı${
          named.scanned ? ` (${named.updated} ürün isme göre tamamlandı)` : ""
        }.`
      );
    } catch (err: any) {
      setError(err?.message || "Kategoriler bağlanırken bir hata oluştu.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const handleLoad = async () => {
    setError(null);
    setSuccess(null);
    setResult(null);
    setBusy(true);
    try {
      const urls = splitXmlUrls(xmlUrl);
      if (urls.length === 0) {
        throw new Error("Geçerli bir XML linki girin. http veya https ile başlamalı.");
      }

      const all: ParsedXmlProduct[] = [];
      const failures: string[] = [];
      for (let i = 0; i < urls.length; i++) {
        setProgress(`XML okunuyor ${i + 1} / ${urls.length}`);
        try {
          const xmlText = await fetchXmlFromUrl(urls[i]);
          const parsed = parseXmlProducts(xmlText);
          if (parsed.length === 0) {
            failures.push(`${urls[i]} → ürün bulunamadı`);
            continue;
          }
          all.push(...parsed);
        } catch (err: any) {
          failures.push(`${urls[i]} → ${err?.message || "alınamadı"}`);
        }
      }

      if (all.length === 0) {
        throw new Error(failures.join("\n") || "XML içinden ürün alınamadı.");
      }
      if (all.length > MAX_PRODUCTS) {
        throw new Error(`En fazla ${MAX_PRODUCTS} ürün içe aktarılabilir.`);
      }

      const priced = withSellPrices(all, settings);
      const counts = await importProducts(priced);
      setResult(counts);
      setSuccess(
        `${counts.success} yeni ürün yüklendi${counts.updated ? `, ${counts.updated} ürün güncellendi` : ""}${
          counts.skipped ? `, ${counts.skipped} ürün atlandı` : ""
        }${counts.failed ? `, ${counts.failed} üründe hata oluştu` : ""}.`
      );
      if (failures.length) setError(failures.join("\n"));
    } catch (err: any) {
      setError(err?.message || "XML yüklenirken bir hata oluştu.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const handleDedupe = async () => {
    setError(null);
    setSuccess(null);
    setResult(null);
    setBusy(true);
    try {
      const urls = splitXmlUrls(xmlUrl);
      if (urls.length > 0) {
        const xmlSkus: string[] = [];
        for (let i = 0; i < urls.length; i++) {
          setProgress(`XML stok kodları okunuyor ${i + 1} / ${urls.length}`);
          const groups = await fetchXmlCategoryGroups(urls[i]);
          Object.values(groups).forEach((skus) => xmlSkus.push(...skus));
        }
        const counts = await keepOnlyXmlSkus(xmlSkus, setProgress);
        setSuccess(
          `XML’deki ${counts.xmlSkus.toLocaleString("tr-TR")} gerçek ürün bırakıldı. ${counts.deleted.toLocaleString("tr-TR")} kopya silindi.`
        );
        return;
      }
      const counts = await dedupeImportedProducts(setProgress);
      setSuccess(
        `${counts.deleted.toLocaleString("tr-TR")} kopya silindi${
          counts.deactivated ? `, ${counts.deactivated.toLocaleString("tr-TR")} kopya gizlendi` : ""
        }. Kalan kayıt: ${counts.remaining.toLocaleString("tr-TR")} (${counts.groups.toLocaleString("tr-TR")} benzersiz ürün).`
      );
    } catch (err: any) {
      setError(err?.message || "Kopyalar silinirken bir hata oluştu.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const cargoDisabledForHighPrice = parseNumber(cargoPrice, 0) > 0;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <p className="text-sm text-gray-500 mb-1">
          <Link to="/dashboard" className="hover:underline">
            Dashboard
          </Link>{" "}
          /{" "}
          <Link to="/admin/products" className="hover:underline">
            Ürün yönetimi
          </Link>{" "}
          / XML ürün yükleme
        </p>
        <h1 className="text-2xl font-bold">XML linki ile ürün yükle</h1>
        <p className="text-gray-600 mt-1">
          Stok, fiyat ve XML’deki yeni ürünler saatte bir otomatik güncellenir. Acil güncelleme için
          linki yükleyebilirsiniz.
        </p>
      </div>

      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 font-semibold">
          <Link2 className="h-5 w-5 text-[#ff6a00]" />
          XML linkleri
        </div>
        <textarea
          value={xmlUrl}
          onChange={(e) => setXmlUrl(e.target.value)}
          placeholder={"https://ornek.com/urunler.xml"}
          disabled={busy}
          rows={4}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6a00] font-mono"
        />

        <div className="space-y-3 rounded-lg border bg-gray-50 p-4">
          <div>
            <p className="text-sm font-medium mb-2">KDV eklensin mi?</p>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="add-kdv"
                  checked={addKdv}
                  onChange={() => setAddKdv(true)}
                  disabled={busy}
                />
                Evet, KDV ekle
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="add-kdv"
                  checked={!addKdv}
                  onChange={() => setAddKdv(false)}
                  disabled={busy}
                />
                Hayır
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Evet seçilirse XML’deki KDV oranı kullanılır; yoksa %20 eklenir.
            </p>
          </div>

          <label className="block text-sm">
            <span className="font-medium">Kar oranı (%)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={profitPercent}
              onChange={(e) => setProfitPercent(e.target.value)}
              disabled={busy}
              className="mt-1 w-full border rounded-md px-3 py-2 bg-white"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">Kargo fiyatı (₺)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cargoPrice}
              onChange={(e) => setCargoPrice(e.target.value)}
              disabled={busy}
              className="mt-1 w-full border rounded-md px-3 py-2 bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Satış fiyatı {FREE_SHIPPING_LIMIT} ₺ ve üzerine kargo eklenmez. {FREE_SHIPPING_LIMIT} ₺
              altındaki ürünlere bu tutar eklenir.
            </p>
          </label>

          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
              disabled={busy}
            />
            Aynı SKU varsa güncelle
          </label>

          <p className="text-xs text-gray-600 bg-white border rounded-md px-3 py-2">
            Örnek 100 ₺ alış
            {addKdv ? ` → KDV sonrası ${example.afterKdv.toFixed(2)} ₺` : ""}
            {` → kâr sonrası ${example.afterProfit.toFixed(2)} ₺`}
            {cargoDisabledForHighPrice
              ? example.afterProfit < FREE_SHIPPING_LIMIT
                ? ` → kargo +${parseNumber(cargoPrice, 0).toFixed(2)} ₺ → ${example.finalPrice.toFixed(2)} ₺`
                : ` → ${FREE_SHIPPING_LIMIT} ₺ üstü, kargo eklenmez → ${example.finalPrice.toFixed(2)} ₺`
              : ` → ${example.finalPrice.toFixed(2)} ₺`}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleLoad}
            disabled={busy || !xmlUrl.trim()}
            className="inline-flex items-center justify-center gap-2 w-full bg-[#ff6a00] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#e05e00] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? progress || "Yükleniyor..." : "XML linkinden ürünleri yükle"}
          </button>
          <button
            type="button"
            onClick={handleAssignCategories}
            disabled={busy || !xmlUrl.trim()}
            className="inline-flex items-center justify-center gap-2 w-full border border-[#ff6a00] text-[#ff6a00] bg-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-50 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {busy ? progress || "Bağlanıyor..." : "Sadece kategorileri bağla"}
          </button>
        </div>
        <button
          type="button"
          onClick={handleDedupe}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 w-full border px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? progress || "Temizleniyor..." : "Tekrarlanan XML kopyalarını sil"}
        </button>
        <p className="text-xs text-gray-500">
          Otomatik senkron GitHub Actions ile saatte bir çalışır. Kapatılmış ürünler
          yeniden açılmaz; stok ve fiyatları yine güncellenir. Tekrarlayan kopyalar için “Tekrarlanan XML
          kopyalarını sil” kullanın.
        </p>
      </section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm whitespace-pre-line">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">
          {success}
        </div>
      )}
      {result && (
        <p className="text-sm text-gray-600">
          Yeni: {result.success} · Güncellenen: {result.updated} · Atlanan: {result.skipped} · Hatalı: {result.failed}
        </p>
      )}
    </main>
  );
}

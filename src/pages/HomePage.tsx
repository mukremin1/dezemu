import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, ProductCardSkeleton, type ShopProduct } from "@/components/ProductCard";
import { useShopCategories } from "@/hooks/useShopCategories";
import { applyVisibleProducts } from "@/lib/shopVisibility";

const PAGE_SIZE = 24;

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const categorySlug = searchParams.get("kategori") || "";
  const sort = searchParams.get("sira") || "yeni";
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const categories = useShopCategories();
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let countQuery = applyVisibleProducts(
        supabase.from("products").select("id", { count: "exact", head: true }).gt("price", 0)
      );

      let query = applyVisibleProducts(
        supabase
          .from("products")
          .select("id, name, slug, price, compare_price, short_description, product_images(image_url, position)")
          .gt("price", 0)
      );

      if (categorySlug) {
        const { data: category } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", categorySlug)
          .maybeSingle();
        if (cancelled) return;
        if (category?.id) {
          query = query.eq("category_id", category.id);
          countQuery = countQuery.eq("category_id", category.id);
        }
      }

      if (sort === "ucuz") query = query.order("price", { ascending: true });
      else if (sort === "pahali") query = query.order("price", { ascending: false });
      else query = query.order("created_at", { ascending: false });

      const [{ data, error: queryError }, { count, error: countError }] = await Promise.all([
        query.range(from, to),
        countQuery,
      ]);

      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        setProducts([]);
        setTotal(0);
      } else {
        const rows = (data as ShopProduct[]) ?? [];
        setProducts(rows);
        if (countError) {
          setTotal(rows.length === PAGE_SIZE ? from + rows.length + 1 : from + rows.length);
        } else {
          setTotal(count ?? 0);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [page, categorySlug, sort]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <section className="rounded-2xl bg-gradient-to-r from-[#fff4eb] to-white border px-5 py-6 md:px-8 md:py-8 mb-6">
        <p className="text-sm text-[#ff6a00] font-medium mb-1">Dezemu mağazası</p>
        <h1 className="text-2xl md:text-4xl font-bold">Alışverişe başlayın</h1>
        <p className="text-gray-600 mt-2 max-w-2xl">
          {loading
            ? "Ürünler yükleniyor..."
            : `${total.toLocaleString("tr-TR")} ürün listeleniyor. 300 ₺ ve üzeri siparişlerde kargo ücreti satış fiyatına eklenmez.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/search" className="inline-flex items-center gap-2 border rounded-md px-4 py-2 text-sm bg-white">
            <Search className="h-4 w-4" />
            Ürün ara
          </Link>
          <a
            href="https://wa.me/905395263293?text=Merhaba%20Dezemu"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md px-4 py-2 text-sm text-white bg-[#25D366]"
          >
            WhatsApp destek
          </a>
        </div>
      </section>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          <button
            type="button"
            onClick={() => updateParams({ kategori: null, page: null })}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${!categorySlug ? "bg-[#ff6a00] text-white border-[#ff6a00]" : "bg-white"}`}
          >
            Tümü
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => updateParams({ kategori: category.slug, page: null })}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${categorySlug === category.slug ? "bg-[#ff6a00] text-white border-[#ff6a00]" : "bg-white"}`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <p className="text-sm text-gray-600">{loading ? "Yükleniyor..." : `${total.toLocaleString("tr-TR")} ürün`}</p>
        <label className="text-sm flex items-center gap-2">
          Sırala
          <select
            value={sort}
            onChange={(e) => updateParams({ sira: e.target.value === "yeni" ? null : e.target.value, page: null })}
            className="border rounded-md px-2 py-1.5 bg-white"
          >
            <option value="yeni">En yeni</option>
            <option value="ucuz">Fiyat: düşükten yükseğe</option>
            <option value="pahali">Fiyat: yüksekten düşüğe</option>
          </select>
        </label>
      </div>

      {error && <p className="text-red-600 mb-4">Ürünler alınamadı: {error}</p>}

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <p className="text-gray-600">Bu filtre için ürün bulunamadı.</p>
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            onClick={() => updateParams({ page: page <= 2 ? null : String(page - 1) })}
            disabled={page <= 1}
            className="px-3 py-2 border rounded-md bg-white disabled:opacity-40"
          >
            Önceki
          </button>
          <span className="text-sm text-gray-600">
            {page} / {pageCount.toLocaleString("tr-TR")}
          </span>
          <button
            type="button"
            onClick={() => updateParams({ page: String(page + 1) })}
            disabled={page >= pageCount}
            className="px-3 py-2 border rounded-md bg-white disabled:opacity-40"
          >
            Sonraki
          </button>
        </div>
      )}
    </main>
  );
}

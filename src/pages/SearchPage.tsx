import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, AlertCircle, Package } from "lucide-react";
import { ProductCard, ProductCardSkeleton, type ShopProduct } from "@/components/ProductCard";
import { applyVisibleProducts } from "@/lib/shopVisibility";

function sanitizeSearch(value: string) {
  return value.replace(/[%_,]/g, " ").trim();
}

export const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(!!searchParams.get("q"));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      const safe = sanitizeSearch(query);
      setError(null);
      if (!safe) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error: queryError } = await applyVisibleProducts(
          supabase
            .from("products")
            .select("id, name, slug, short_description, price, compare_price, product_images(image_url, position)")
            .gt("price", 0)
            .ilike("name", `%${safe}%`)
            .order("name", { ascending: true })
            .limit(48)
        );

        if (queryError) throw queryError;
        setResults((data as ShopProduct[]) ?? []);
      } catch (err: any) {
        setError(err.message || "Arama sırasında hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <Search className="text-[#ff6a00]" size={28} />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {query ? (
              <>
                Arama: <span className="text-[#ff6a00]">"{query}"</span>
              </>
            ) : (
              "Ürün ara"
            )}
          </h1>
          <p className="text-sm text-gray-600">
            {!query
              ? "Aramak için üstteki kutuyu kullanın."
              : loading
                ? "Yükleniyor..."
                : `${results.length} ürün bulundu`}
          </p>
        </div>
      </div>

      {!query && (
        <p className="text-gray-600">
          Üst menüdeki arama kutusuna ürün adı yazın.{" "}
          <Link to="/" className="text-[#ff6a00] hover:underline">
            Tüm ürünlere dön
          </Link>
        </p>
      )}

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="border rounded-lg p-8 text-center bg-white">
          <AlertCircle className="mx-auto text-red-600 mb-4" size={56} />
          <p className="text-red-600 font-medium text-lg">{error}</p>
          <Link to="/" className="text-[#ff6a00] hover:underline text-sm mt-3 inline-block">
            Ana sayfaya dön
          </Link>
        </div>
      )}

      {!loading && !error && query && results.length === 0 && (
        <div className="text-center py-20">
          <Package className="mx-auto text-gray-400 mb-6" size={80} />
          <p className="text-xl text-gray-600 mb-2">Sonuç bulunamadı.</p>
          <p className="text-sm text-gray-500">"{query}" için ürün bulunamadı.</p>
          <Link to="/" className="text-[#ff6a00] hover:underline text-sm mt-4 inline-block">
            Ana sayfaya dön
          </Link>
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      )}
    </div>
  );
};

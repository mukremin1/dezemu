import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const SearchPage = () => {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get("q") || "";
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      setError(null);
      setResults([]);
      if (!query) return;

      setLoading(true);
      try {
        // Eğer supabase-js sürümünüz .or destekliyorsa şu şekilde isim ve açıklamada arama yapabilirsiniz:
        // const { data, error } = await supabase
        //   .from("products")
        //   .select("*")
        //   .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

        // Basit tek alan arama (mevcut)
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .ilike("name", `%${query}%`);

        if (error) {
          console.error(error);
          setError(error.message || "Arama sırasında bir hata oluştu.");
        } else {
          setResults(data ?? []);
        }
      } catch (err: any) {
        console.error("Search fetch error:", err);
        setError(err?.message || "Bilinmeyen bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="container mx-auto mt-8">
      <h1 className="text-xl font-bold mb-4">Arama sonuçları: "{query}"</h1>

      {loading && <p>Yükleniyor...</p>}

      {!loading && error && (
        <div className="text-red-600">Hata: {error}</div>
      )}

      {!loading && !error && !query && (
        <p>Aramak için üstteki kutuya bir terim girin.</p>
      )}

      {!loading && !error && query && results.length === 0 && (
        <p>Sonuç bulunamadı.</p>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((r) => (
            <div key={r.id} className="border rounded p-4">
              <h2 className="font-semibold">{r.name}</h2>
              {r.price != null && <p>Fiyat: ₺{r.price}</p>}
              {r.short_description && <p className="text-sm">{r.short_description}</p>}
              {/* İhtiyaca göre link, resim vb. ekleyin */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

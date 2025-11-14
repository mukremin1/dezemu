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
        // Eğer supabase-js sürümünüz .or destekliyorsa iki alanda arama yapmak için:
        // const { data, error } = await supabase
        //   .from("products")
        //   .select("*")
        //   .or(`name.ilike.%${query}%,short_description.ilike.%${query}%`);

        // Basit tek alan arama:
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .ilike("name", `%${query}%`);

        if (error) {
          console.error("Supabase search error:", error);
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

      {!loading && error && <div className="text-red-600">Hata: {error}</div>}

      {!loading && !error && !query && <p>Aramak için bir terim girin.</p>}

      {!loading && !error && query && results.length === 0 && <p>Sonuç bulunamadı.</p>}

      {!loading && !error && results.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {results.map((item) => (
            <li key={item.id} className="border p-4 rounded">
              <h2 className="font-semibold">{item.name}</h2>
              {item.short_description && <p className="text-sm">{item.short_description}</p>}
              {item.price != null && <p className="font-bold mt-2">₺{item.price}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

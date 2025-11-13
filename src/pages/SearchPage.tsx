import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function SearchPage() {
  const { search } = useLocation();
  const query = new URLSearchParams(search).get("q") || "";

  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      const { data } = await supabase
        .from("products") // tablonun adı
        .select("*")
        .ilike("title", `%${query}%`); // title kolonunu değiştirilebilir

      setResults(data || []);
    };

    fetchResults();
  }, [query]);

  return (
    <div className="container py-6">
      <h2 className="text-2xl font-semibold mb-4">
        Arama sonuçları: "{query}"
      </h2>

      {results.length === 0 ? (
        <p>Ürün bulunamadı.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {results.map((p: any) => (
            <div key={p.id} className="p-4 border rounded-lg">
              <img
                src={p.image}
                alt={p.title}
                className="h-40 w-full object-cover rounded"
              />
              <h3 className="font-semibold mt-2">{p.title}</h3>
              <p className="text-primary font-bold">{p.price} ₺</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

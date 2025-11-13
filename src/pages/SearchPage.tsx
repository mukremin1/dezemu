import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const SearchPage = () => {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get("q") || "";
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) return;

      const { data, error } = await supabase
        .from("products") // Tablo adını kendi veritabanına göre değiştir
        .select("*")
        .ilike("name", `%${query}%`);

      if (error) console.error(error);
      else setResults(data);
    };

    fetchResults();
  }, [query]);

  return (
    <div className="container mx-auto mt-8">
      <h1 className="text-xl font-bold mb-4">Arama sonuçları: "{query}"</h1>
      {results.length === 0 ? (
        <p>Sonuç bulunamadı.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {results.map((item) => (
            <li key={item.id} className="border p-4 rounded">
              <h2 className="font-semibold">{item.name}</h2>
              <p>{item.description}</p>
              <p className="font-bold">{item.price} ₺</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

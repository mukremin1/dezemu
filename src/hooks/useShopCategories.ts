import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ShopCategory = { id: string; name: string; slug: string; count: number };

export function useShopCategories() {
  const [categories, setCategories] = useState<ShopCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, products(count)")
        .order("name")
        .limit(40);
      if (cancelled) return;
      const rows = ((data as any[]) ?? [])
        .map((row) => ({
          id: row.id as string,
          name: row.name as string,
          slug: row.slug as string,
          count: Number(row.products?.[0]?.count ?? 0),
        }))
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count);
      setCategories(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}

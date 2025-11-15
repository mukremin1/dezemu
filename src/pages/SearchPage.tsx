// src/pages/SearchPage.tsx
import { useEffect, useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Search, AlertCircle } from "lucide-react"

interface Product {
  id: string
  name: string
  short_description?: string
  price?: number
  image_url?: string
}

export const SearchPage = () => {
  const [searchParams] = useSearchParams()
  const query = searchParams.get("q") || ""
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResults = async () => {
      setError(null)
      setResults([])
      if (!query.trim()) return

      setLoading(true)
      try {
        // Hem name hem short_description'da arama
        const { data, error } = await supabase
          .from("products")
          .select("id, name, short_description, price, image_url")
          .or(`name.ilike.%${query}%,short_description.ilike.%${query}%`)
          .order("name")

        if (error) throw error
        setResults(data ?? [])
      } catch (err: any) {
        console.error("Supabase arama hatası:", err)
        setError(err.message || "Arama sırasında bir hata oluştu.")
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query])

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Başlık */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Search size={28} className="text-primary" />
          Arama sonuçları: <span className="text-primary">"{query}"</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? "Aranıyor..." : `${results.length} ürün bulundu`}
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border animate-pulse">
              <div className="bg-muted rounded-t-lg h-48" />
              <div className="p-4 space-y-2">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-6 bg-muted rounded w-1/3 mt-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hata */}
      {!loading && error && (
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto text-destructive mb-3" size={48} />
          <p className="text-destructive font-medium">{error}</p>
          <Link to="/" className="text-primary hover:underline text-sm mt-2 inline-block">
            Ana sayfaya dön
          </Link>
        </div>
      )}

      {/* Boş Sonuç */}
      {!loading && !error && query && results.length === 0 && (
        <div className="text-center py-16">
          <div className="bg-muted/50 border-2 border-dashed rounded-xl w-32 h-32 mx-auto mb-6" />
          <p className="text-lg text-muted-foreground mb-2">Sonuç bulunamadı.</p>
          <p className="text-sm text-muted-foreground">
            "{query}" için eşleşen ürün yok.
          </p>
          <Link to="/" className="text-primary hover:underline text-sm mt-4 inline-block">
            Ana sayfaya dön
          </Link>
        </div>
      )}

      {/* Sonuçlar */}
      {!loading && !error && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {results.map((item) => (
            <Link
              key={item.id}
              to={`/product/${item.id}`}
              className="group block bg-card rounded-lg border hover:border-primary/50 transition-all hover:shadow-md overflow-hidden"
            >
              <div className="aspect-square relative overflow-hidden bg-muted">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="bg-muted-foreground/10 border-2 border-dashed rounded-xl w-20 h-20" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition line-clamp-2">
                  {item.name}
                </h3>
                {item.short_description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {item.short_description}
                  </p>
                )}
                {item.price != null && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      ₺{item.price.toFixed(2)}
                    </span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Detay
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

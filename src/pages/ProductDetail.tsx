import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/hooks/useCart";

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart((state) => state.addItem);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_images(image_url, alt_text, position),
          categories(name)
        `)
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Ürün bulunamadı</h1>
            <Button onClick={() => navigate("/")}>Ana Sayfaya Dön</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri Dön
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="aspect-square relative overflow-hidden rounded-lg border">
              <img
                src={product.product_images?.[0]?.image_url || "/placeholder.svg"}
                alt={product.name}
                className="object-cover w-full h-full"
              />
              {discount > 0 && (
                <Badge className="absolute top-4 right-4 bg-destructive text-destructive-foreground text-lg px-3 py-1">
                  -{discount}%
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              {product.categories && (
                <p className="text-muted-foreground">
                  Kategori: {product.categories.name}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-4xl font-bold text-primary">
                ₺{Number(product.price).toFixed(2)}
              </span>
              {product.compare_price && (
                <span className="text-2xl text-muted-foreground line-through">
                  ₺{Number(product.compare_price).toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {product.is_digital && (
                <Badge variant="secondary">Dijital Ürün</Badge>
              )}
              {product.stock_quantity > 0 ? (
                <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                  Stokta Var
                </Badge>
              ) : (
                <Badge variant="destructive">Stokta Yok</Badge>
              )}
            </div>

            {product.short_description && (
              <p className="text-lg text-muted-foreground">
                {product.short_description}
              </p>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <span className="px-4 py-2 min-w-12 text-center">{quantity}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={quantity >= product.stock_quantity}
                >
                  +
                </Button>
              </div>
              <Button
                className="flex-1"
                size="lg"
                disabled={product.stock_quantity === 0}
                onClick={() => {
                  addItem({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.product_images?.[0]?.image_url,
                    stock: product.stock_quantity,
                    slug: product.slug,
                    quantity,
                  });
                }}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Sepete Ekle
              </Button>
            </div>

            {product.description && (
              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold mb-4">Ürün Açıklaması</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {product.description}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;

import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useShopCart } from "@/hooks/useShopCart";

export type ShopProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price?: number | null;
  short_description?: string | null;
  product_images?: { image_url: string; position?: number }[] | null;
};

export function firstProductImage(product: ShopProduct) {
  const images = [...(product.product_images ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );
  return images[0]?.image_url || "/placeholder.svg";
}

export function ProductCard({ product }: { product: ShopProduct }) {
  const { addItem } = useShopCart();
  const [added, setAdded] = useState(false);
  const image = firstProductImage(product);

  const addToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      imageUrl: image,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className="group border rounded-xl bg-white overflow-hidden hover:shadow-md transition flex flex-col">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="aspect-square bg-gray-100 overflow-hidden">
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
        <div className="p-3 space-y-1">
          <h2 className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{product.name}</h2>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-[#ff6a00]">{formatPrice(product.price)}</span>
            {product.compare_price && product.compare_price > product.price && (
              <span className="text-xs text-gray-400 line-through">{formatPrice(product.compare_price)}</span>
            )}
          </div>
        </div>
      </Link>
      <div className="px-3 pb-3 mt-auto">
        <button
          type="button"
          onClick={addToCart}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-[#ff6a00] text-white text-sm py-2 hover:bg-[#e85f00]"
        >
          <ShoppingBag className="h-4 w-4" />
          {added ? "Sepete eklendi" : "Sepete ekle"}
        </button>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="border rounded-xl bg-white overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-8 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

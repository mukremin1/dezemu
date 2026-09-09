import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { firstProductImage } from "@/components/ProductCard";
import { useShopCart } from "@/hooks/useShopCart";
import { useAdmin } from "@/hooks/useAdmin";
import { deleteAdminProduct, setProductActive } from "@/lib/adminCatalog";
import { applyVisibleProducts, productIsClosed, withClosedTag } from "@/lib/shopVisibility";

type ProductDetailRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  description: string | null;
  short_description: string | null;
  stock_quantity: number;
  is_active: boolean;
  tags: string[] | null;
  product_images: { image_url: string; position: number }[] | null;
  categories: { name: string; slug: string } | null;
};

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useShopCart();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [product, setProduct] = useState<ProductDetailRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    if (adminLoading) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let query = supabase
        .from("products")
        .select(
          "id, name, slug, price, compare_price, description, short_description, stock_quantity, is_active, tags, product_images(image_url, position), categories(name, slug)"
        )
        .eq("slug", slug);
      if (!isAdmin) query = applyVisibleProducts(query);
      const { data } = await query.maybeSingle();
      if (!cancelled) {
        setProduct((data as ProductDetailRow) ?? null);
        setActiveImage(0);
        setQuantity(1);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, isAdmin, adminLoading]);

  if (loading || adminLoading) return <main className="max-w-5xl mx-auto p-6 text-gray-500">Ürün yükleniyor...</main>;
  if (!product) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-3">Ürün bulunamadı</h1>
        <Link to="/" className="text-[#ff6a00] hover:underline">
          Anasayfaya dön
        </Link>
      </main>
    );
  }

  const images = [...(product.product_images ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const image = images[activeImage]?.image_url || images[0]?.image_url || "/placeholder.svg";
  const waText = encodeURIComponent(
    `Merhaba, ${product.name} ürününden ${quantity} adet sipariş vermek istiyorum. Fiyat: ${formatPrice(product.price)}`
  );
  const inStock = product.stock_quantity > 0;
  const closed = productIsClosed(product);

  const addToCart = () => {
    addItem(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        imageUrl: firstProductImage(product),
      },
      quantity
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/" className="text-sm text-gray-500 hover:underline">
        ← Tüm ürünler
      </Link>

      <div className="grid md:grid-cols-2 gap-8 mt-4">
        <div>
          <div className="aspect-square border rounded-xl overflow-hidden bg-gray-50">
            <img src={image} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {images.map((item, index) => (
                <button
                  key={`${item.image_url}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`h-16 w-16 rounded border overflow-hidden ${index === activeImage ? "ring-2 ring-[#ff6a00]" : ""}`}
                >
                  <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {product.categories?.name && (
            <Link to={`/?kategori=${product.categories.slug}`} className="text-sm text-gray-500 hover:text-[#ff6a00]">
              {product.categories.name}
            </Link>
          )}
          <h1 className="text-2xl md:text-3xl font-bold">{product.name}</h1>
          {isAdmin && (
            <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
              <p className="text-sm font-medium">
                Admin · {closed ? "Kapalı, mağazada görünmez" : "Vitrinde açık"}
              </p>
              <div className="flex flex-wrap gap-2">
                {closed ? (
                  <button
                    type="button"
                    disabled={adminBusy}
                    onClick={async () => {
                      setAdminBusy(true);
                      setAdminError(null);
                      try {
                        await setProductActive(product.id, true);
                        setProduct({ ...product, tags: withClosedTag(product.tags, false) });
                        setAdminMessage("Ürün vitrine açıldı.");
                      } catch (err: any) {
                        setAdminError(err?.message || "Açılamadı.");
                      } finally {
                        setAdminBusy(false);
                      }
                    }}
                    className="border bg-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
                  >
                    Ürünü aç
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={adminBusy}
                    onClick={async () => {
                      setAdminBusy(true);
                      setAdminError(null);
                      try {
                        await setProductActive(product.id, false);
                        setProduct({ ...product, tags: withClosedTag(product.tags, true) });
                        setAdminMessage("Ürün kapatıldı.");
                      } catch (err: any) {
                        setAdminError(err?.message || "Kapatılamadı.");
                      } finally {
                        setAdminBusy(false);
                      }
                    }}
                    className="border bg-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
                  >
                    Ürünü kapat
                  </button>
                )}
                <button
                  type="button"
                  disabled={adminBusy}
                  onClick={async () => {
                    if (!window.confirm(`“${product.name}” silinsin mi? Bu işlem geri alınamaz.`)) return;
                    setAdminBusy(true);
                    setAdminError(null);
                    try {
                      const result = await deleteAdminProduct(product.id);
                      if (result === "closed") {
                        setProduct({ ...product, tags: withClosedTag(product.tags, true) });
                        setAdminMessage("Siparişte kullanıldığı için silinemedi. Ürün kapatıldı.");
                      } else {
                        navigate("/admin/products");
                      }
                    } catch (err: any) {
                      setAdminError(err?.message || "Silinemedi.");
                    } finally {
                      setAdminBusy(false);
                    }
                  }}
                  className="border border-red-200 text-red-700 bg-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
                >
                  Ürünü sil
                </button>
                <Link to="/admin/products" className="inline-flex items-center text-sm text-[#ff6a00] hover:underline">
                  Ürün yönetimine git
                </Link>
              </div>
              {adminMessage && <p className="text-sm text-green-700">{adminMessage}</p>}
              {adminError && <p className="text-sm text-red-700">{adminError}</p>}
            </div>
          )}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-[#ff6a00]">{formatPrice(product.price)}</span>
            {product.compare_price && product.compare_price > product.price && (
              <span className="text-lg text-gray-400 line-through">{formatPrice(product.compare_price)}</span>
            )}
          </div>
          <p className="text-sm text-gray-600">{inStock ? `Stokta var (${product.stock_quantity})` : "Stokta yok"}</p>
          {product.short_description && <p className="text-gray-700">{product.short_description}</p>}

          {!closed && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-md">
                  <button type="button" className="p-2" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Azalt">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center">{quantity}</span>
                  <button
                    type="button"
                    className="p-2"
                    onClick={() => setQuantity((q) => q + 1)}
                    aria-label="Artır"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={!inStock}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#ff6a00] text-white px-5 py-3 rounded-md font-medium disabled:opacity-50"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {added ? "Sepete eklendi" : "Sepete ekle"}
                </button>
              </div>

              <a
                href={`https://wa.me/905395263293?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full bg-[#25D366] text-white px-5 py-3 rounded-md font-medium"
              >
                WhatsApp ile sipariş
              </a>
              <p className="text-xs text-gray-500">300 ₺ altı ürünlerde kargo satış fiyatına dahildir.</p>
            </>
          )}
        </div>
      </div>

      {product.description && (
        <section className="mt-10 border-t pt-6">
          <h2 className="text-xl font-semibold mb-3">Ürün açıklaması</h2>
          <div
            className="prose max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </section>
      )}
    </main>
  );
}

import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useShopCart } from "@/hooks/useShopCart";
import { formatPrice } from "@/lib/format";

export default function Cart() {
  const { items, removeItem, setQuantity, totalPrice, clear } = useShopCart();
  const waText = encodeURIComponent(
    [
      "Merhaba Dezemu, sipariş vermek istiyorum:",
      ...items.map((item) => `- ${item.name} x${item.quantity} = ${formatPrice(item.price * item.quantity)}`),
      `Toplam: ${formatPrice(totalPrice)}`,
    ].join("\n")
  );

  if (items.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <h1 className="text-2xl font-bold mb-2">Sepetiniz boş</h1>
        <p className="text-gray-600 mb-6">Ürün ekleyerek alışverişe başlayın.</p>
        <Link to="/" className="inline-block bg-[#ff6a00] text-white px-5 py-3 rounded-md">
          Ürünleri gör
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Sepetim</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 border rounded-xl bg-white p-3">
              <Link to={`/product/${item.slug}`} className="h-24 w-24 shrink-0 rounded-md overflow-hidden bg-gray-100">
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/product/${item.slug}`} className="font-medium line-clamp-2 hover:text-[#ff6a00]">
                  {item.name}
                </Link>
                <p className="text-[#ff6a00] font-semibold mt-1">{formatPrice(item.price)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button type="button" className="border rounded p-1" onClick={() => setQuantity(item.id, item.quantity - 1)}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <button type="button" className="border rounded p-1" onClick={() => setQuantity(item.id, item.quantity + 1)}>
                    <Plus className="h-4 w-4" />
                  </button>
                  <button type="button" className="ml-auto text-red-600 p-1" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={clear} className="text-sm text-gray-500 hover:underline">
            Sepeti temizle
          </button>
        </div>

        <aside className="border rounded-xl bg-white p-5 h-fit space-y-3">
          <h2 className="font-semibold">Sipariş özeti</h2>
          <div className="flex justify-between text-sm">
            <span>Ara toplam</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
          <p className="text-xs text-gray-500">Kargo, 300 ₺ altı ürünlerde fiyata dahildir.</p>
          <div className="flex justify-between font-bold text-lg border-t pt-3">
            <span>Toplam</span>
            <span className="text-[#ff6a00]">{formatPrice(totalPrice)}</span>
          </div>
          <a
            href={`https://wa.me/905395263293?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-[#25D366] text-white py-3 rounded-md font-medium"
          >
            WhatsApp ile sipariş ver
          </a>
          <Link to="/" className="block text-center border py-3 rounded-md">
            Alışverişe devam et
          </Link>
        </aside>
      </div>
    </main>
  );
}

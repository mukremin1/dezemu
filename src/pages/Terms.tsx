import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Kullanım Şartları</h1>
      <p className="text-sm text-gray-500">Dezemu mağazası</p>
      <p>
        Bu site üzerinden verilen siparişler WhatsApp üzerinden teyit edilir. Fiyatlar ve stok bilgisi güncellenebilir.
        Siparişiniz onaylanmadan ödeme alınmaz.
      </p>
      <p>
        300 ₺ altı ürünlerde kargo tutarı satış fiyatına eklenmiş olabilir. Teslimat ve iade için destek ekibimizle
        iletişime geçin.
      </p>
      <p>
        Destek:{" "}
        <a className="text-[#ff6a00] hover:underline" href="mailto:destek@dezemu.com">
          destek@dezemu.com
        </a>
      </p>
      <Link to="/" className="inline-block text-[#ff6a00] hover:underline">
        Anasayfaya dön
      </Link>
    </main>
  );
}

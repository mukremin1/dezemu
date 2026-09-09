import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8 grid sm:grid-cols-3 gap-6 text-sm">
        <div>
          <p className="font-bold text-[#ff6a00] text-lg">Dezemu</p>
          <p className="text-gray-600 mt-2">WhatsApp üzerinden hızlı sipariş ve destek.</p>
        </div>
        <nav className="space-y-2">
          <Link to="/" className="block hover:text-[#ff6a00]">
            Ürünler
          </Link>
          <Link to="/cart" className="block hover:text-[#ff6a00]">
            Sepet
          </Link>
          <Link to="/search" className="block hover:text-[#ff6a00]">
            Arama
          </Link>
        </nav>
        <nav className="space-y-2">
          <Link to="/privacy-policy" className="block hover:text-[#ff6a00]">
            Gizlilik Politikası
          </Link>
          <Link to="/terms" className="block hover:text-[#ff6a00]">
            Kullanım Şartları
          </Link>
          <a href="mailto:destek@dezemu.com" className="block hover:text-[#ff6a00]">
            destek@dezemu.com
          </a>
          <a
            href="https://wa.me/905395263293"
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:text-[#ff6a00]"
          >
            WhatsApp
          </a>
        </nav>
      </div>
      <p className="text-center text-xs text-gray-500 pb-6">© {year} Dezemu. Tüm hakları saklıdır.</p>
    </footer>
  );
}

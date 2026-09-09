import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, Menu, MessageCircle, Search, ShoppingBag, X } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useAdmin } from "@/hooks/useAdmin";
import { useShopCart } from "@/hooks/useShopCart";
import { useShopCategories } from "@/hooks/useShopCategories";
import { supabase } from "@/integrations/supabase/client";

export default function Header() {
  const { user, loading } = useUser();
  const { isAdmin } = useAdmin();
  const { totalItems } = useShopCart();
  const categories = useShopCategories();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  const search = () => {
    const value = query.trim();
    if (!value) {
      navigate("/");
      return;
    }
    navigate(`/search?q=${encodeURIComponent(value)}`);
    setMenuOpen(false);
  };

  const navLinks = useMemo(
    () => [
      { to: "/", label: "Ürünler" },
      { to: "/cart", label: "Sepet" },
      ...(user ? [{ to: "/dashboard", label: "Hesabım" }] : []),
      ...(isAdmin
        ? [
            { to: "/admin/products", label: "Ürün yönetimi" },
            { to: "/admin/xml-import", label: "XML Yükle" },
          ]
        : []),
    ],
    [user, isAdmin]
  );

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link to="/" className="text-2xl font-bold shrink-0" style={{ color: "#ff6a00" }}>
          Dezemu
        </Link>

        <div className="hidden md:flex flex-1 max-w-xl mx-auto">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Ürün, kategori veya marka ara..."
            className="flex-1 border border-r-0 rounded-l-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6a00]"
          />
          <button
            type="button"
            onClick={search}
            className="bg-[#ff6a00] text-white px-4 rounded-r-md"
            aria-label="Ara"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <a
            href="https://wa.me/905395263293?text=Merhaba%20Dezemu"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex p-2 text-green-600"
            title="WhatsApp"
          >
            <MessageCircle className="h-5 w-5" />
          </a>
          <a href="mailto:destek@dezemu.com" className="hidden sm:flex p-2 text-gray-600" title="E-posta">
            <Mail className="h-5 w-5" />
          </a>
          <Link to="/cart" className="relative p-2" aria-label={totalItems ? `Sepet, ${totalItems} ürün` : "Sepet"}>
            <ShoppingBag className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-[#ff6a00] text-white text-xs flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>
          {loading ? null : user ? (
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/");
              }}
              className="hidden md:inline text-sm px-3 py-1 border rounded"
            >
              Çıkış
            </button>
          ) : (
            <Link to="/login" className="hidden md:inline text-sm px-3 py-1 border rounded">
              Giriş
            </Link>
          )}
          <button type="button" className="md:hidden p-2" onClick={() => setMenuOpen((v) => !v)} aria-label="Menü">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="md:hidden px-4 pb-3">
        <div className="flex">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Ürün ara..."
            className="flex-1 border border-r-0 rounded-l-md px-3 py-2 text-sm"
          />
          <button type="button" onClick={search} className="bg-[#ff6a00] text-white px-4 rounded-r-md">
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="hidden md:flex max-w-7xl mx-auto px-4 pb-3 gap-5 text-sm">
        {navLinks.map((link) => (
          <Link key={link.to} to={link.to} className="hover:text-[#ff6a00]">
            {link.label}
          </Link>
        ))}
        {!user && (
          <Link to="/signup" className="hover:text-[#ff6a00]">
            Kayıt Ol
          </Link>
        )}
      </nav>

      {categories.length > 0 && (
        <div className="hidden md:flex max-w-7xl mx-auto px-4 pb-3 gap-2 overflow-x-auto">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/?kategori=${category.slug}`}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs hover:border-[#ff6a00] hover:text-[#ff6a00] ${
                location.search.includes(`kategori=${category.slug}`) ? "bg-[#ff6a00] text-white border-[#ff6a00]" : "bg-white"
              }`}
            >
              {category.name}
            </Link>
          ))}
        </div>
      )}

      {menuOpen && (
        <div className="md:hidden border-t px-4 py-3 space-y-2 bg-white">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="block py-2" onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/?kategori=${category.slug}`}
              className="block py-2 text-sm text-gray-700"
              onClick={() => setMenuOpen(false)}
            >
              {category.name}
            </Link>
          ))}
          {user ? (
            <button
              type="button"
              className="block py-2"
              onClick={async () => {
                await supabase.auth.signOut();
                setMenuOpen(false);
                navigate("/");
              }}
            >
              Çıkış
            </button>
          ) : (
            <>
              <Link to="/login" className="block py-2" onClick={() => setMenuOpen(false)}>
                Giriş Yap
              </Link>
              <Link to="/signup" className="block py-2" onClick={() => setMenuOpen(false)}>
                Kayıt Ol
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export { Header };

import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Header() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");


  return (
    <header className="fixed top-0 left-0 w-full bg-white shadow-sm z-50">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">

        {/* LOGO */}
        <Link to="/" className="text-xl font-bold">
          MyStore
        </Link>

        {/* DESKTOP SEARCH BAR */}
        <div className="hidden md:flex items-center relative w-1/2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
              placeholder="Ürün ara..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
              if (e.key === "Enter") {
              navigate(`/search?q=${searchQuery}`);
            
          />
        </div>

        {/* RIGHT SIDE ICONS */}
        <div className="flex items-center gap-3">

          {/* Mobil Arama (Sadece md altında görünür) */}
          <div className="flex md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/search")}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>

          {/* Sepet */}
          <Button variant="ghost" size="icon" onClick={() => navigate("/cart")}>
            <ShoppingCart className="h-5 w-5" />
          </Button>

          {/* Mobil Menü */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

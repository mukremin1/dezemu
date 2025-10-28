import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="border-t bg-muted/50 mt-auto">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">DEZEMU</h3>
            <p className="text-sm text-muted-foreground">
              Güvenilir e-ticaret deneyimi için doğru adres.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Kurumsal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/about" className="hover:text-foreground">
                  Hakkımızda
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Yardım</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/faq" className="hover:text-foreground">
                  SSS
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="hover:text-foreground">
                  Kargo & İade
                </Link>
              </li>
              <li className="hover:text-foreground cursor-pointer">Ödeme Yöntemleri</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Yasal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-foreground cursor-pointer">Gizlilik Politikası</li>
              <li className="hover:text-foreground cursor-pointer">Kullanım Koşulları</li>
              <li className="hover:text-foreground cursor-pointer">KVKK</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; 2025 DEZEMU. Tüm hakları saklıdır.</p>
            <div className="flex gap-4">
              <a href="mailto:destek@dezemu.com" className="hover:text-foreground">
                destek@dezemu.com
              </a>
              <a href="tel:+905395263293" className="hover:text-foreground">
                +90 539 526 32 93
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

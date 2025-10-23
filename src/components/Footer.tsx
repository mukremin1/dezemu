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
              <li className="hover:text-foreground cursor-pointer">Hakkımızda</li>
              <li className="hover:text-foreground cursor-pointer">İletişim</li>
              <li className="hover:text-foreground cursor-pointer">Kariyer</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Yardım</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-foreground cursor-pointer">SSS</li>
              <li className="hover:text-foreground cursor-pointer">Kargo & İade</li>
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
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; 2025 DEZEMU. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
};

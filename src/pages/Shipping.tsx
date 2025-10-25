import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Shipping() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Kargo & İade</h1>
            <p className="text-lg text-muted-foreground">
              Kargo ve iade süreçlerimiz hakkında bilgiler
            </p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Kargo Bilgileri</CardTitle>
                <CardDescription>Teslimat süreçleri ve kargo ücretleri</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Teslimat Süresi</h3>
                  <p className="text-muted-foreground">
                    Siparişiniz onaylandıktan sonra 1-2 iş günü içerisinde kargoya verilir. 
                    Kargo teslimat süresi bölgeye göre 1-3 iş günü arasında değişmektedir.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Kargo Ücreti</h3>
                  <p className="text-muted-foreground mb-2">
                    Kargo ücreti sepet tutarınıza göre değişmektedir:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>300 TL ve üzeri alışverişlerde kargo ücretsizdir</li>
                    <li>300 TL altı alışverişlerde kargo ücreti 49,90 TL'dir</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Kargo Firması</h3>
                  <p className="text-muted-foreground">
                    Siparişleriniz Sürat Kargo ve diğer anlaşmalı kargo firmalarımız aracılığıyla 
                    gönderilmektedir. Kargo takip numaranız e-posta adresinize gönderilecektir.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Teslimat Adresi</h3>
                  <p className="text-muted-foreground">
                    Sipariş verirken belirttiğiniz adrese teslimat yapılacaktır. Adres bilgilerinizin 
                    eksiksiz ve doğru olduğundan emin olunuz.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>İade Koşulları</CardTitle>
                <CardDescription>İade ve değişim süreçleri</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">İade Süresi</h3>
                  <p className="text-muted-foreground">
                    Ürünü teslim aldığınız tarihten itibaren 14 gün içerisinde cayma hakkınızı 
                    kullanarak ürünü iade edebilirsiniz.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">İade Koşulları</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Ürün kullanılmamış ve hasarsız olmalıdır</li>
                    <li>Orijinal ambalajında olmalıdır</li>
                    <li>Ürünle birlikte gelen tüm aksesuarlar eksiksiz olmalıdır</li>
                    <li>Fatura veya irsaliye iade paketi içinde bulunmalıdır</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">İade İşlemi Nasıl Yapılır?</h3>
                  <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                    <li>Müşteri hizmetlerimiz ile iletişime geçin</li>
                    <li>İade talebinizi bildirin ve iade kodunu alın</li>
                    <li>Ürünü orijinal ambalajında hazırlayın</li>
                    <li>Kargo ile tarafımıza gönderin (iade kargo ücreti tarafınızdan karşılanır)</li>
                    <li>Ürün tarafımıza ulaştıktan sonra kontrol edilir</li>
                    <li>Onaylandıktan sonra 3-5 iş günü içinde ödemeniz iade edilir</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Değişim</h3>
                  <p className="text-muted-foreground">
                    Ürün değişimi yapmak istiyorsanız, önce ürünü iade edip sonra yeni sipariş 
                    vermenizi öneririz. Bu şekilde daha hızlı işlem yapabilirsiniz.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">İade Edilemeyen Ürünler</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Hijyen kuralları gereği açılmış kozmetik ürünleri</li>
                    <li>Tek kullanımlık ürünler</li>
                    <li>Kopyalanabilir yazılım ve programlar</li>
                    <li>Özel olarak hazırlanmış veya kişiselleştirilmiş ürünler</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hasarlı veya Hatalı Ürün</CardTitle>
                <CardDescription>Hasarlı ürün teslimatı durumunda yapılacaklar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Eğer size ulaşan üründe herhangi bir hasar veya hata varsa, ürünü teslim almadan 
                  önce kargo görevlisi önünde tutanak tutturarak teslim almayınız. 
                </p>
                <p className="text-muted-foreground">
                  Hasarlı veya hatalı ürün teslim aldıysanız, 2 gün içerisinde fotoğrafları ile 
                  birlikte müşteri hizmetlerimize bildiriniz. Hasarlı veya hatalı ürünler için 
                  kargo ücreti tarafımızdan karşılanır.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useSearchParams } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";

const Index = () => {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  
  console.log('Admin status:', { isAdmin, adminLoading });
  
  const [productName, setProductName] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productComparePrice, setProductComparePrice] = useState("");
  const [productStock, setProductStock] = useState("100");
  const [productCategory, setProductCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ["products", categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          *,
          product_images(image_url, alt_text),
          categories(slug)
        `)
        .eq("is_active", true);

      // Kategori filtresi varsa uygula
      if (categoryFilter) {
        const { data: category } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", categoryFilter)
          .maybeSingle();

        if (category) {
          query = query.eq("category_id", category.id);
        }
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !productPrice || !productImageUrl) {
      toast({
        title: "Hata",
        description: "Ürün adı, resim URL ve fiyat zorunludur.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const slug = productName
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Ürün ekle
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name: productName,
          slug,
          price: parseFloat(productPrice),
          compare_price: productComparePrice ? parseFloat(productComparePrice) : null,
          category_id: productCategory || null,
          stock_quantity: parseInt(productStock),
          is_active: isActive,
        })
        .select()
        .single();

      if (productError) throw productError;

      // Resim ekle
      const { error: imageError } = await supabase
        .from('product_images')
        .insert({
          product_id: product.id,
          image_url: productImageUrl,
          position: 0,
        });

      if (imageError) throw imageError;

      toast({
        title: "Başarılı",
        description: "Ürün başarıyla eklendi.",
      });

      // Formu temizle
      setProductName("");
      setProductImageUrl("");
      setProductPrice("");
      setProductComparePrice("");
      setProductStock("100");
      setProductCategory("");
      setIsActive(true);
      
      // Ürünleri yenile
      refetch();
    } catch (error) {
      console.error('Quick add error:', error);
      toast({
        title: "Hata",
        description: "Ürün eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingExcel(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let successCount = 0;
      let errorCount = 0;

      for (const row of jsonData as any[]) {
        try {
          let categoryId = null;
          const categoryName = row['Kategori'] || row['category'] || row['Category'];
          
          if (categoryName) {
            const categorySlug = categoryName
              .toLowerCase()
              .replace(/ğ/g, 'g')
              .replace(/ü/g, 'u')
              .replace(/ş/g, 's')
              .replace(/ı/g, 'i')
              .replace(/ö/g, 'o')
              .replace(/ç/g, 'c')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '');

            const { data: existingCategory } = await supabase
              .from('categories')
              .select('id')
              .eq('slug', categorySlug)
              .maybeSingle();

            if (existingCategory) {
              categoryId = existingCategory.id;
            } else {
              const { data: newCategory, error: categoryError } = await supabase
                .from('categories')
                .insert({
                  name: categoryName,
                  slug: categorySlug,
                })
                .select('id')
                .single();

              if (!categoryError && newCategory) {
                categoryId = newCategory.id;
              }
            }
          }

          const productName = row['Ürün Adı'] || row['name'] || row['Name'] || '';
          const slug = productName
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

          const productData = {
            name: productName,
            slug,
            price: parseFloat(row['Fiyat'] || row['price'] || row['Price'] || '0'),
            compare_price: row['Eski Fiyat'] || row['compare_price'] ? parseFloat(row['Eski Fiyat'] || row['compare_price'] || '0') : null,
            description: row['Açıklama'] || row['description'] || row['Description'] || '',
            short_description: row['Kısa Açıklama'] || row['short_description'] || '',
            stock_quantity: parseInt(row['Stok'] || row['stock_quantity'] || row['Stock'] || '0'),
            sku: row['SKU'] || row['sku'] || '',
            barcode: row['Barkod'] || row['barcode'] || '',
            is_active: row['Aktif'] !== false && row['is_active'] !== false,
            is_featured: row['Öne Çıkan'] === true || row['is_featured'] === true,
            is_digital: row['Dijital'] === true || row['is_digital'] === true,
            category_id: categoryId,
          };

          const { data: product, error: productError } = await supabase
            .from('products')
            .insert(productData)
            .select()
            .single();

          if (productError) {
            console.error('Product insert error:', productError);
            errorCount++;
            continue;
          }

          // Resim varsa ekle
          const imageUrl = row['Resim URL'] || row['image_url'] || row['Image URL'];
          if (imageUrl && product) {
            await supabase
              .from('product_images')
              .insert({
                product_id: product.id,
                image_url: imageUrl,
                position: 0,
              });
          }

          successCount++;
        } catch (err) {
          console.error('Row processing error:', err);
          errorCount++;
        }
      }

      toast({
        title: "Toplu Yükleme Tamamlandı",
        description: `${successCount} ürün başarıyla yüklendi. ${errorCount > 0 ? `${errorCount} ürün yüklenemedi.` : ''}`,
      });

      refetch();
    } catch (error) {
      console.error('Excel processing error:', error);
      toast({
        title: "Hata",
        description: "Excel dosyası işlenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingExcel(false);
      e.target.value = '';
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full">
          <Header />
          <main className="flex-1">
            {/* Hero Section */}
            <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-background py-20">
              <div className="container">
                <div className="flex items-center gap-4 mb-8">
                  <SidebarTrigger />
                  <h1 className="text-4xl md:text-6xl font-bold">
                    En İyi Ürünler,
                    <br />
                    <span className="text-primary">En İyi Fiyatlar</span>
                  </h1>
                </div>
                <p className="text-xl text-muted-foreground max-w-3xl">
                  Fiziksel ve dijital ürünleriniz için güvenilir alışveriş platformu
                </p>
              </div>
            </section>

            {/* Quick Add Product (Admin Only) */}
            {!adminLoading && isAdmin && (
              <section className="py-8 bg-muted/30">
                <div className="container">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Hızlı Ürün Ekle
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Excel Toplu Yükleme */}
                      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                        <Input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleExcelUpload}
                          disabled={isUploadingExcel}
                          id="excel-upload"
                          className="hidden"
                        />
                        <label htmlFor="excel-upload">
                          <Button type="button" variant="outline" disabled={isUploadingExcel} asChild>
                            <span>
                              <Upload className="mr-2 h-4 w-4" />
                              {isUploadingExcel ? "Yükleniyor..." : "Excel İle Toplu Yükle"}
                            </span>
                          </Button>
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Excel sütunları: Ürün Adı, Fiyat, Eski Fiyat, Kategori, Stok, Resim URL, Açıklama, Kısa Açıklama, SKU, Barkod, Öne Çıkan, Dijital
                        </p>
                        <a 
                          href="/products-template.xlsx" 
                          download 
                          className="text-sm text-primary hover:underline"
                        >
                          Örnek Excel Şablonu İndir
                        </a>
                      </div>

                      {/* Tek Ürün Ekleme */}
                      <form onSubmit={handleQuickAdd} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="quick-name">Ürün Adı *</Label>
                              <Input
                                id="quick-name"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="Ürün adı"
                                required
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="quick-image">Resim URL *</Label>
                              <Input
                                id="quick-image"
                                value={productImageUrl}
                                onChange={(e) => setProductImageUrl(e.target.value)}
                                placeholder="https://..."
                                required
                              />
                              {productImageUrl && (
                                <div className="mt-2 border rounded-lg p-2 bg-background">
                                  <img 
                                    src={productImageUrl} 
                                    alt="Önizleme" 
                                    className="w-full h-32 object-contain rounded"
                                    onError={(e) => {
                                      e.currentTarget.src = '/placeholder.svg';
                                      e.currentTarget.alt = 'Resim yüklenemedi';
                                    }}
                                  />
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="quick-price">Fiyat *</Label>
                              <Input
                                id="quick-price"
                                type="number"
                                step="0.01"
                                value={productPrice}
                                onChange={(e) => setProductPrice(e.target.value)}
                                placeholder="0.00"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="quick-compare-price">Eski Fiyat (Kampanya)</Label>
                              <Input
                                id="quick-compare-price"
                                type="number"
                                step="0.01"
                                value={productComparePrice}
                                onChange={(e) => setProductComparePrice(e.target.value)}
                                placeholder="0.00"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="quick-stock">Stok Miktarı *</Label>
                              <Input
                                id="quick-stock"
                                type="number"
                                value={productStock}
                                onChange={(e) => setProductStock(e.target.value)}
                                placeholder="100"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="quick-category">Kategori</Label>
                              <Select value={productCategory} onValueChange={setProductCategory}>
                                <SelectTrigger id="quick-category">
                                  <SelectValue placeholder="Seçiniz" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                          <div className="space-y-1">
                            <Label htmlFor="is-active">Ürün Aktif</Label>
                            <p className="text-sm text-muted-foreground">Ürünü hemen yayınla</p>
                          </div>
                          <Switch
                            id="is-active"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                          />
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
                          <Plus className="mr-2 h-4 w-4" />
                          {isSubmitting ? "Ekleniyor..." : "Ürün Ekle"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </section>
            )}

            {/* Featured Products */}
        <section className="py-16">
          <div className="container">
            <h2 className="text-3xl font-bold mb-8">
              {categoryFilter ? `Kategori: ${categoryFilter}` : "Öne Çıkan Ürünler"}
            </h2>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="aspect-square rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={Number(product.price)}
                    comparePrice={product.compare_price ? Number(product.compare_price) : undefined}
                    imageUrl={product.product_images?.[0]?.image_url}
                    slug={product.slug}
                    isDigital={product.is_digital}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  Henüz ürün bulunmamaktadır.
                </p>
              </div>
            )}
          </div>
          </section>
          </main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;

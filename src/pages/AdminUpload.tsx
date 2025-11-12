import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Upload, Download, Plus, Link } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const productFormSchema = z.object({
  name: z.string().min(1, "Ürün adı zorunludur"),
  category_id: z.string().optional(),
  price: z.string().min(1, "Fiyat zorunludur"),
  compare_price: z.string().optional(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  stock_quantity: z.string().min(1, "Stok miktarı zorunludur"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
});

const AdminUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [xmlUrl, setXmlUrl] = useState("");
  const [showXmlConfirm, setShowXmlConfirm] = useState(false);
  const { toast } = useToast();

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

  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      category_id: "",
      price: "",
      compare_price: "",
      description: "",
      short_description: "",
      stock_quantity: "0",
      sku: "",
      barcode: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof productFormSchema>) => {
    setIsUploading(true);
    try {
      const slug = values.name
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
        name: values.name,
        slug,
        price: parseFloat(values.price),
        compare_price: values.compare_price ? parseFloat(values.compare_price) : null,
        description: values.description || null,
        short_description: values.short_description || null,
        stock_quantity: parseInt(values.stock_quantity),
        sku: values.sku || null,
        barcode: values.barcode || null,
        category_id: values.category_id || null,
        is_active: true,
        is_featured: false,
        is_digital: false,
      };

      const { error } = await supabase
        .from('products')
        .insert(productData);

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: "Ürün başarıyla eklendi.",
      });

      form.reset();
    } catch (error) {
      console.error('Product insert error:', error);
      toast({
        title: "Hata",
        description: "Ürün eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log("Excel data:", jsonData);

      // 50.000 ürün limiti kontrolü
      if (jsonData.length > 50000) {
        toast({
          title: "Limit Aşıldı",
          description: "Maksimum 50.000 ürün yükleyebilirsiniz. Lütfen daha küçük bir dosya kullanın.",
          variant: "destructive",
        });
        setIsUploading(false);
        e.target.value = '';
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const row of jsonData as any[]) {
        try {
          // Kategori işleme - otomatik kategori oluşturma
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

            // Kategori var mı kontrol et
            const { data: existingCategory } = await supabase
              .from('categories')
              .select('id')
              .eq('slug', categorySlug)
              .maybeSingle();

            if (existingCategory) {
              categoryId = existingCategory.id;
            } else {
              // Yeni kategori oluştur
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

          // Excel sütun isimleri ile veritabanı eşleştirmesi
          const productData = {
            name: row['Ürün Adı'] || row['name'] || row['Name'] || '',
            slug: (row['Ürün Adı'] || row['name'] || row['Name'] || '')
              .toLowerCase()
              .replace(/ğ/g, 'g')
              .replace(/ü/g, 'u')
              .replace(/ş/g, 's')
              .replace(/ı/g, 'i')
              .replace(/ö/g, 'o')
              .replace(/ç/g, 'c')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, ''),
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
            weight: row['Ağırlık'] || row['weight'] ? parseFloat(row['Ağırlık'] || row['weight']) : null,
            dimensions: row['Boyutlar'] || row['dimensions'] || null,
            tags: row['Etiketler'] || row['tags'] ? String(row['Etiketler'] || row['tags']).split(',').map((t: string) => t.trim()) : null,
            category_id: categoryId,
          };

          const { error } = await supabase
            .from('products')
            .insert(productData);

          if (error) {
            console.error('Product insert error:', error, productData);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error('Row processing error:', err, row);
          errorCount++;
        }
      }

      toast({
        title: "Ürün Yükleme Tamamlandı",
        description: `${successCount} ürün başarıyla yüklendi. ${errorCount > 0 ? `${errorCount} ürün yüklenemedi.` : ''}`,
      });
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Hata",
        description: "Dosya işlenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const downloadTemplate = () => {
    window.open('/products-template.xlsx', '_blank');
  };

  const handleAutoUpload = async () => {
    setIsUploading(true);
    try {
      const response = await fetch('/products-data.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log("Excel data:", jsonData);

      // 50.000 ürün limiti kontrolü
      if (jsonData.length > 50000) {
        toast({
          title: "Limit Aşıldı",
          description: "Maksimum 50.000 ürün yükleyebilirsiniz. Lütfen daha küçük bir dosya kullanın.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const row of jsonData as any[]) {
        try {
          // Kategori işleme - otomatik kategori oluşturma
          let categoryId = null;
          const categoryName = row['Kategori'];
          
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

            // Kategori var mı kontrol et
            const { data: existingCategory } = await supabase
              .from('categories')
              .select('id')
              .eq('slug', categorySlug)
              .maybeSingle();

            if (existingCategory) {
              categoryId = existingCategory.id;
            } else {
              // Yeni kategori oluştur
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

          const productData = {
            name: row['Ürün Adı'] || '',
            slug: (row['Ürün Adı'] || '')
              .toLowerCase()
              .replace(/ğ/g, 'g')
              .replace(/ü/g, 'u')
              .replace(/ş/g, 's')
              .replace(/ı/g, 'i')
              .replace(/ö/g, 'o')
              .replace(/ç/g, 'c')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, ''),
            price: parseFloat(row["Trendyol'da Satılacak Fiyat (KDV Dahil)"] || '0'),
            compare_price: row['Piyasa Satış Fiyatı (KDV Dahil)'] ? parseFloat(row['Piyasa Satış Fiyatı (KDV Dahil)'] || '0') : null,
            description: row['Ürün Açıklaması'] || '',
            stock_quantity: parseInt(row['Ürün Stok Adedi'] || '0'),
            sku: row['Model Kodu'] || row['Tedarikçi Stok Kodu'] || '',
            barcode: row['Barkod'] || '',
            is_active: true,
            is_featured: false,
            is_digital: false,
            category_id: categoryId,
          };

          const { error } = await supabase
            .from('products')
            .insert(productData);

          if (error) {
            console.error('Product insert error:', error, productData);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error('Row processing error:', err, row);
          errorCount++;
        }
      }

      toast({
        title: "Ürün Yükleme Tamamlandı",
        description: `${successCount} ürün başarıyla yüklendi. ${errorCount > 0 ? `${errorCount} ürün yüklenemedi.` : ''}`,
      });
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Hata",
        description: "Dosya işlenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleXmlConfirmOpen = () => {
    if (!xmlUrl.trim()) {
      toast({
        title: "Hata",
        description: "Lütfen geçerli bir XML URL'i girin.",
        variant: "destructive",
      });
      return;
    }

    // Security: Validate URL format and require HTTPS
    const urlPattern = /^https:\/\/[a-zA-Z0-9-.]+(\.[\w]{2,})+/;
    if (!urlPattern.test(xmlUrl)) {
      toast({
        title: "Güvenlik Hatası",
        description: "Sadece HTTPS protokolü ile başlayan URL'ler kabul edilir.",
        variant: "destructive",
      });
      return;
    }

    setShowXmlConfirm(true);
  };

  const handleXmlImport = async () => {
    setShowXmlConfirm(false);
    setIsUploading(true);
    try {
      // Security: Add timeout (10 seconds) and abort controller
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(xmlUrl, { 
        signal: controller.signal,
        headers: { 'User-Agent': 'AdminPanel/1.0' }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      // Security: Check for XML parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Geçersiz XML formatı');
      }

      const products = xmlDoc.getElementsByTagName("urun");
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        
        try {
          const name = product.getElementsByTagName("isim")[0]?.textContent || "";
          const categoryName = product.getElementsByTagName("kategori")[0]?.textContent || "";
          const price = parseFloat(product.getElementsByTagName("fiyat")[0]?.textContent || "0");
          const comparePrice = parseFloat(product.getElementsByTagName("eskiFiyat")[0]?.textContent || "0");
          const description = product.getElementsByTagName("aciklama")[0]?.textContent || "";
          const stock = parseInt(product.getElementsByTagName("stok")[0]?.textContent || "0");
          const sku = product.getElementsByTagName("sku")[0]?.textContent || "";
          const imageUrl = product.getElementsByTagName("resim")[0]?.textContent || null;

          // Kategori işleme
          let categoryId = null;
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

          // Slug oluştur
          const slug = name
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

          // Ürünü ekle
          const { data: insertedProduct, error: productError } = await supabase
            .from('products')
            .insert({
              name,
              slug,
              price: price * 1.20 + 109, // %20 kar + 109 TL
              compare_price: null,
              description,
              stock_quantity: stock,
              sku,
              category_id: categoryId,
              is_active: true,
              is_featured: false,
              is_digital: false,
            })
            .select('id')
            .single();

          if (productError) {
            console.error('Product insert error:', productError);
            errorCount++;
          } else if (insertedProduct && imageUrl) {
            // Resim varsa ekle
            const { error: imageError } = await supabase
              .from('product_images')
              .insert({
                product_id: insertedProduct.id,
                image_url: imageUrl,
                position: 0,
              });

            if (imageError) {
              console.error('Image insert error:', imageError);
            }
            
            successCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error('Product processing error:', err);
          errorCount++;
        }
      }

      toast({
        title: "XML İçe Aktarma Tamamlandı",
        description: `${successCount} ürün başarıyla eklendi. ${errorCount > 0 ? `${errorCount} ürün eklenemedi.` : ''}`,
      });
      
      setXmlUrl("");
    } catch (error) {
      console.error('XML processing error:', error);
      toast({
        title: "Hata",
        description: "XML dosyası işlenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Excel Yükleme */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Toplu Ürün Yükleme</CardTitle>
          <CardDescription>
            Excel dosyanızı yükleyerek toplu ürün ekleyebilirsiniz (maksimum 50.000 ürün)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button
              variant="default"
              onClick={handleAutoUpload}
              disabled={isUploading}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? "Yükleniyor..." : "Tüm Ürünleri Otomatik Yükle"}
            </Button>
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Örnek Excel Dosyasını İndir
            </Button>
            <p className="text-sm text-muted-foreground">
              Excel dosyanızda şu sütunlar olmalı: Ürün Adı, Kategori, Fiyat, Eski Fiyat, Açıklama, Stok, SKU
            </p>
          </div>

          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {isUploading ? "Yükleniyor..." : "Excel dosyası seçin"}
                </p>
                <p className="text-xs text-muted-foreground">
                  .xlsx veya .xls formatında
                </p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* XML İçe Aktarma */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            XML Link ile Ürün İçe Aktar
          </CardTitle>
          <CardDescription>
            XML formatındaki ürün feedini linkten içe aktarın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="url"
              placeholder="https://example.com/products.xml"
              value={xmlUrl}
              onChange={(e) => setXmlUrl(e.target.value)}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              XML formatı: &lt;urun&gt;&lt;isim&gt;, &lt;kategori&gt;, &lt;fiyat&gt;, &lt;eskiFiyat&gt;, &lt;aciklama&gt;, &lt;stok&gt;, &lt;sku&gt;, &lt;resim&gt;
            </p>
          </div>
          <Button
            onClick={handleXmlConfirmOpen}
            disabled={isUploading || !xmlUrl.trim()}
            className="w-full"
          >
            <Link className="mr-2 h-4 w-4" />
            {isUploading ? "İçe Aktarılıyor..." : "XML'den İçe Aktar"}
          </Button>
        </CardContent>
      </Card>

      {/* Manuel Ürün Ekleme Formu */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Yeni Ürün Ekle
          </CardTitle>
          <CardDescription>
            Tek bir ürünü manuel olarak ekleyin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ürün Adı *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ürün adı" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Kategori seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fiyat *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="compare_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eski Fiyat</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="short_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kısa Açıklama</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Kısa açıklama" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detaylı Açıklama</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detaylı açıklama" rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="stock_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stok *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="SKU" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barkod</FormLabel>
                      <FormControl>
                        <Input placeholder="Barkod" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isUploading} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {isUploading ? "Ekleniyor..." : "Ürün Ekle"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* XML Onay Dialog */}
      <AlertDialog open={showXmlConfirm} onOpenChange={setShowXmlConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>XML İçe Aktarma Onayı</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Aşağıdaki URL'den ürünler içe aktarılacak:</p>
              <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                {xmlUrl}
              </p>
              <p className="text-destructive font-medium">
                Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleXmlImport}>
              Onayla ve İçe Aktar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUpload;

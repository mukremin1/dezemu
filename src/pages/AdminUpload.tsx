import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Upload, Download } from "lucide-react";

const AdminUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

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

      let successCount = 0;
      let errorCount = 0;

      for (const row of jsonData as any[]) {
        try {
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

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Ürün Yükleme Paneli</CardTitle>
          <CardDescription>
            Excel dosyanızı yükleyerek toplu ürün ekleyebilirsiniz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Örnek Excel Dosyasını İndir
            </Button>
            <p className="text-sm text-muted-foreground">
              Excel dosyanızda şu sütunlar olmalı: Ürün Adı, Fiyat, Eski Fiyat, Açıklama, Stok, SKU
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
    </div>
  );
};

export default AdminUpload;

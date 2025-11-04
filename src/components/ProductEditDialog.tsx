import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ProductEditDialogProps {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProductEditDialog = ({ productId, open, onOpenChange }: ProductEditDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [sku, setSku] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isDigital, setIsDigital] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      if (data) setCategories(data);
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (open && productId) {
      loadProduct();
    }
  }, [open, productId]);

  const loadProduct = async () => {
    const { data: product } = await supabase
      .from('products')
      .select(`*, product_images(image_url)`)
      .eq('id', productId)
      .single();

    if (product) {
      setName(product.name);
      setPrice(product.price?.toString() || "");
      setComparePrice(product.compare_price?.toString() || "");
      setStock(product.stock_quantity?.toString() || "0");
      setCategoryId(product.category_id || "");
      setImageUrl(product.product_images?.[0]?.image_url || "");
      setDescription(product.description || "");
      setShortDescription(product.short_description || "");
      setSku(product.sku || "");
      setIsActive(product.is_active);
      setIsFeatured(product.is_featured);
      setIsDigital(product.is_digital);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
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

      const { error: productError } = await supabase
        .from('products')
        .update({
          name,
          slug,
          price: parseFloat(price),
          compare_price: comparePrice ? parseFloat(comparePrice) : null,
          stock_quantity: parseInt(stock),
          category_id: categoryId || null,
          description,
          short_description: shortDescription,
          sku,
          is_active: isActive,
          is_featured: isFeatured,
          is_digital: isDigital,
        })
        .eq('id', productId);

      if (productError) throw productError;

      if (imageUrl) {
        const { data: existingImage } = await supabase
          .from('product_images')
          .select('id')
          .eq('product_id', productId)
          .eq('position', 0)
          .maybeSingle();

        if (existingImage) {
          await supabase
            .from('product_images')
            .update({ image_url: imageUrl })
            .eq('id', existingImage.id);
        } else {
          await supabase
            .from('product_images')
            .insert({ product_id: productId, image_url: imageUrl, position: 0 });
        }
      }

      toast({
        title: "Başarılı",
        description: "Ürün güncellendi.",
      });

      queryClient.invalidateQueries({ queryKey: ['products'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Hata",
        description: "Ürün güncellenirken hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ürün Düzenle</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Ürün Adı *</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU</Label>
              <Input id="edit-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-price">Fiyat *</Label>
              <Input id="edit-price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-compare-price">Eski Fiyat (Kampanya)</Label>
              <Input id="edit-compare-price" type="number" step="0.01" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-stock">Stok *</Label>
              <Input id="edit-stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-image">Resim URL</Label>
            <Input id="edit-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            {imageUrl && (
              <img src={imageUrl} alt="Önizleme" className="w-32 h-32 object-contain rounded border" />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-short-desc">Kısa Açıklama</Label>
            <Textarea id="edit-short-desc" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} rows={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-desc">Açıklama</Label>
            <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>

          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Switch id="edit-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="edit-active">Aktif</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="edit-featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
              <Label htmlFor="edit-featured">Öne Çıkan</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="edit-digital" checked={isDigital} onCheckedChange={setIsDigital} />
              <Label htmlFor="edit-digital">Dijital</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

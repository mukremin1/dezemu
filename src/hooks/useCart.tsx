import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from '@/hooks/use-toast';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  stock: number;
  slug: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        const items = get().items;
        const existingItem = items.find((i) => i.id === item.id);
        
        if (existingItem) {
          const newQuantity = existingItem.quantity + (item.quantity || 1);
          if (newQuantity > item.stock) {
            toast({
              title: "Stok Yetersiz",
              description: "Bu üründen daha fazla ekleyemezsiniz.",
              variant: "destructive",
            });
            return;
          }
          
          set({
            items: items.map((i) =>
              i.id === item.id ? { ...i, quantity: newQuantity } : i
            ),
          });
          
          toast({
            title: "Miktar Güncellendi",
            description: `${item.name} sepetinizde güncellendi.`,
          });
        } else {
          set({
            items: [...items, { ...item, quantity: item.quantity || 1 }],
          });
          
          toast({
            title: "Sepete Eklendi",
            description: `${item.name} sepetinize eklendi.`,
          });
        }
      },
      
      removeItem: (id) => {
        set({
          items: get().items.filter((item) => item.id !== id),
        });
        
        toast({
          title: "Ürün Kaldırıldı",
          description: "Ürün sepetinizden kaldırıldı.",
        });
      },
      
      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        
        const items = get().items;
        const item = items.find((i) => i.id === id);
        
        if (item && quantity > item.stock) {
          toast({
            title: "Stok Yetersiz",
            description: "Bu kadar stok bulunmuyor.",
            variant: "destructive",
          });
          return;
        }
        
        set({
          items: items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        });
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);

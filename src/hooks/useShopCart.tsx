import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  totalItems: number;
  totalPrice: number;
};

const STORAGE_KEY = "dezemu-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

function loadItems(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadItems);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const addItem: CartContextValue["addItem"] = (item, quantity = 1) => {
      setItems((current) => {
        const existing = current.find((row) => row.id === item.id);
        if (existing) {
          return current.map((row) =>
            row.id === item.id ? { ...row, quantity: row.quantity + quantity } : row
          );
        }
        return [...current, { ...item, quantity }];
      });
    };

    return {
      items,
      addItem,
      removeItem: (id) => setItems((current) => current.filter((row) => row.id !== id)),
      setQuantity: (id, quantity) => {
        if (quantity < 1) {
          setItems((current) => current.filter((row) => row.id !== id));
          return;
        }
        setItems((current) => current.map((row) => (row.id === id ? { ...row, quantity } : row)));
      },
      clear: () => setItems([]),
      totalItems: items.reduce((sum, row) => sum + row.quantity, 0),
      totalPrice: items.reduce((sum, row) => sum + row.price * row.quantity, 0),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useShopCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useShopCart must be used inside CartProvider");
  return ctx;
}

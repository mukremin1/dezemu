import React, { useEffect, useState } from "react";

type Order = {
  id: string;
  product: string;
  date: string;
  price: number;
};

const ORDERS_KEY = "dezemu_orders_v1";

const readOrders = (): Order[] => {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
};

const writeOrders = (orders: Order[]) => {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
};

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(readOrders());
  }, []);

  const removeOrder = (id: string) => {
    const next = orders.filter(o => o.id !== id);
    setOrders(next);
    writeOrders(next);
  };

  const clearAll = () => {
    setOrders([]);
    writeOrders([]);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Siparişlerim</h1>

      {orders.length === 0 ? (
        <p className="text-gray-600">Henüz siparişiniz yok.</p>
      ) : (
        <>
          <ul className="space-y-3 mb-4">
            {orders.map(o => (
              <li key={o.id} className="border rounded p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{o.product}</div>
                  <div className="text-sm text-gray-500">{o.date} — ₺{o.price.toFixed(2)}</div>
                </div>
                <div>
                  <button
                    onClick={() => removeOrder(o.id)}
                    className="text-red-600 hover:underline"
                  >
                    Sil
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div>
            <button onClick={clearAll} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              Tümünü Temizle
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default OrdersPage;

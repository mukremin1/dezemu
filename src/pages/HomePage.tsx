import React, { useState } from "react";

interface HomePageProps {
  searchQuery: string;
  onPlaceOrder: (product: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ searchQuery, onPlaceOrder }) => {
  const [note, setNote] = useState("");

  const handlePlace = () => {
    const product = searchQuery?.trim() || "Sample Product";
    onPlaceOrder(product);
    setNote(`${product} siparişi kaydedildi.`);
    setTimeout(() => setNote(""), 3000);
  };

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Anasayfa</h1>

      <div className="mb-4">
        <p>Arama: <strong>{searchQuery || "-"}</strong></p>
      </div>

      <div className="mb-6 flex gap-3">
        <button
          onClick={handlePlace}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Sipariş Ver
        </button>

        <button
          onClick={() => {
            // örnek: hızlı sipariş (rastgele ürün)
            const random = `Ürün ${Math.floor(Math.random() * 100) + 1}`;
            onPlaceOrder(random);
            setNote(`${random} siparişi kaydedildi.`);
            setTimeout(() => setNote(""), 3000);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Hızlı Sipariş (Örnek)
        </button>
      </div>

      {note && <div className="text-sm text-green-700 mb-4">{note}</div>}

      <section>
        <h2 className="text-xl font-semibold mb-2">Ürünler</h2>
        <p className="text-gray-600">(Buraya ürün listeniz gelecek — demo amaçlı boş bırakıldı.)</p>
      </section>
    </main>
  );
};

export default HomePage;

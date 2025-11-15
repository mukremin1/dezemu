import React, { useState } from "react";

export const HomePage: React.FC = () => {
  const [searchResult, setSearchResult] = useState<string>("");

  return (
    <main className="p-4">
      <section id="home">
        <h1 className="text-3xl font-bold mb-4">Hoş Geldiniz!</h1>
        {searchResult && <p>Arama sonucu: {searchResult}</p>}
      </section>

      <section id="orders" className="mt-8">
        <h2 className="text-2xl font-semibold mb-2">Siparişlerim</h2>
        <p>Henüz siparişiniz yok.</p>
      </section>
    </main>
  );
};

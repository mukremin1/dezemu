import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/format";
import {
  deleteAdminProduct,
  deleteAdminProducts,
  listAdminProducts,
  setProductActive,
  setProductsActive,
  type AdminProductRow,
} from "@/lib/adminCatalog";

const PAGE_SIZE = 20;

export default function AdminProducts() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [debounced, status]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await listAdminProducts(debounced, status, page, PAGE_SIZE);
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Ürünler yüklenemedi.");
        setItems([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, status, page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allOnPageSelected = items.length > 0 && items.every((item) => selected.includes(item.id));
  const selectedOnPage = useMemo(
    () => items.filter((item) => selected.includes(item.id)).map((item) => item.id),
    [items, selected]
  );

  const refresh = async () => {
    const result = await listAdminProducts(debounced, status, page, PAGE_SIZE);
    setItems(result.items);
    setTotal(result.total);
    setSelected((ids) => ids.filter((id) => result.items.some((item) => item.id === id)));
  };

  const run = async (task: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const text = await task();
      await refresh();
      setMessage(text);
    } catch (err: any) {
      setError(err?.message || "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  };

  const toggleOne = (id: string, isActive: boolean) =>
    run(async () => {
      await setProductActive(id, isActive);
      return isActive ? "Ürün vitrine açıldı." : "Ürün kapatıldı, mağazada görünmez.";
    });

  const removeOne = (product: AdminProductRow) => {
    if (!window.confirm(`“${product.name}” silinsin mi? Bu işlem geri alınamaz.`)) return;
    run(async () => {
      const result = await deleteAdminProduct(product.id);
      setSelected((ids) => ids.filter((id) => id !== product.id));
      if (result === "closed") {
        return "Siparişte kullanıldığı için silinemedi. Ürün kapatıldı.";
      }
      return "Ürün silindi.";
    });
  };

  const closeSelected = () => {
    if (selectedOnPage.length === 0) return;
    run(async () => {
      await setProductsActive(selectedOnPage, false);
      setSelected([]);
      return `${selectedOnPage.length} ürün kapatıldı.`;
    });
  };

  const openSelected = () => {
    if (selectedOnPage.length === 0) return;
    run(async () => {
      await setProductsActive(selectedOnPage, true);
      setSelected([]);
      return `${selectedOnPage.length} ürün açıldı.`;
    });
  };

  const deleteSelected = () => {
    if (selectedOnPage.length === 0) return;
    if (!window.confirm(`${selectedOnPage.length} ürün silinsin mi? Bu işlem geri alınamaz.`)) return;
    run(async () => {
      const result = await deleteAdminProducts(selectedOnPage);
      setSelected([]);
      if (result.closed) {
        return `${result.deleted} ürün silindi, ${result.closed} ürün siparişte olduğu için kapatıldı.`;
      }
      return `${result.deleted} ürün silindi.`;
    });
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <p className="text-sm text-gray-500 mb-1">
          <Link to="/dashboard" className="hover:underline">
            Dashboard
          </Link>{" "}
          / Ürün yönetimi
        </p>
        <h1 className="text-2xl font-bold">Ürün kapat / sil</h1>
        <p className="text-gray-600 mt-1">
          Kapatılan ürün mağazada görünmez. Silme kalıcıdır; siparişteki ürünler silinemez, kapatılır.
        </p>
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ürün adı veya SKU ara..."
              className="flex-1 border border-r-0 rounded-l-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6a00]"
            />
            <span className="inline-flex items-center bg-[#ff6a00] text-white px-3 rounded-r-md">
              <Search className="h-4 w-4" />
            </span>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="all">Tümü</option>
            <option value="active">Açık</option>
            <option value="closed">Kapalı</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={closeSelected}
            disabled={busy || selectedOnPage.length === 0}
            className="border px-3 py-2 rounded-md text-sm disabled:opacity-50"
          >
            Seçilenleri kapat
          </button>
          <button
            type="button"
            onClick={openSelected}
            disabled={busy || selectedOnPage.length === 0}
            className="border px-3 py-2 rounded-md text-sm disabled:opacity-50"
          >
            Seçilenleri aç
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={busy || selectedOnPage.length === 0}
            className="border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm disabled:opacity-50"
          >
            Seçilenleri sil
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}
      {message && (
        <div className="rounded-md border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">{message}</div>
      )}

      <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b text-sm text-gray-600">{total.toLocaleString("tr-TR")} ürün</div>
        {loading ? (
          <div className="p-8 flex items-center justify-center text-gray-500 gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Yükleniyor...
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-sm text-gray-500">Bu filtrede ürün yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected((ids) => [...new Set([...ids, ...items.map((item) => item.id)])]);
                        } else {
                          const pageIds = new Set(items.map((item) => item.id));
                          setSelected((ids) => ids.filter((id) => !pageIds.has(id)));
                        }
                      }}
                      aria-label="Sayfadaki ürünleri seç"
                    />
                  </th>
                  <th className="p-3">Ürün</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Fiyat</th>
                  <th className="p-3">Durum</th>
                  <th className="p-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => (
                  <tr key={product.id} className="border-t">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(product.id)}
                        onChange={(e) => {
                          setSelected((ids) =>
                            e.target.checked ? [...ids, product.id] : ids.filter((id) => id !== product.id)
                          );
                        }}
                        aria-label={product.name}
                      />
                    </td>
                    <td className="p-3">
                      <Link to={`/product/${product.slug}`} className="font-medium hover:text-[#ff6a00]">
                        {product.name}
                      </Link>
                    </td>
                    <td className="p-3 text-gray-500 font-mono text-xs">{product.sku || "-"}</td>
                    <td className="p-3 whitespace-nowrap">{formatPrice(product.price)}</td>
                    <td className="p-3">
                      {product.is_active ? (
                        <span className="text-green-700">Açık</span>
                      ) : (
                        <span className="text-gray-500">Kapalı</span>
                      )}
                    </td>
                    <td className="p-3 sticky right-0 bg-white">
                      <div className="flex justify-end gap-2">
                        {product.is_active ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => toggleOne(product.id, false)}
                            className="border px-3 py-1 rounded text-xs disabled:opacity-50"
                          >
                            Kapat
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => toggleOne(product.id, true)}
                            className="border px-3 py-1 rounded text-xs disabled:opacity-50"
                          >
                            Aç
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeOne(product)}
                          className="inline-flex items-center gap-1 border border-red-200 text-red-700 px-3 py-1 rounded text-xs disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border px-3 py-1 rounded disabled:opacity-50"
            >
              Önceki
            </button>
            <span>
              {page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount || loading}
              onClick={() => setPage((p) => p + 1)}
              className="border px-3 py-1 rounded disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

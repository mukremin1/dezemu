import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useAdmin } from "@/hooks/useAdmin";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user, loading } = useUser();
  const { isAdmin } = useAdmin();
  const [profile, setProfile] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [creatingVendor, setCreatingVendor] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    async function loadProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!mounted) return;
      if (error) {
        console.warn("profiles fetch error", error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    }

    async function loadOrders() {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (error) {
        console.warn("orders fetch error", error);
        setOrders([]);
      } else {
        setOrders(data ?? []);
      }
    }

    loadProfile();
    loadOrders();

    return () => {
      mounted = false;
    };
  }, [user]);

  async function handleCreateVendor() {
    if (!user) return;
    setCreatingVendor(true);
    setMessage(null);
    try {
      // Basit vendor oluşturma; gerekirse daha kapsamlı onboarding ekleyin.
      const payload = {
        owner_id: user.id,
        name: `${user.email?.split("@")[0]} mağazası`,
        slug: `${user.id?.slice(0, 8)}`,
        description: "Yeni satıcı",
      };
      const { data, error } = await supabase.from("vendors").insert([payload]).select().single();
      if (error) {
        setMessage("Satıcı oluşturulurken hata: " + error.message);
      } else {
        // profil'i güncelle (is_vendor)
        await supabase.from("profiles").upsert({ id: user.id, is_vendor: true });
        setProfile((p: any) => ({ ...(p ?? {}), is_vendor: true }));
        setMessage("Satıcı hesabı oluşturuldu.");
      }
    } catch (err: any) {
      setMessage(err.message || "Hata oluştu");
    } finally {
      setCreatingVendor(false);
    }
  }

  if (loading) return <div>Yükleniyor...</div>;
  if (!user) return <div>Giriş yapmalısınız. <Link to="/login">Giriş</Link></div>;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1>Dashboard</h1>

      <section style={{ marginBottom: 20 }}>
        <h2>Hesap Bilgileri</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Ad / Soyad:</strong> {profile?.full_name ?? "-"}</p>
        <p><strong>Kullanıcı adı:</strong> {profile?.username ?? "-"}</p>
        <p><strong>Satıcı misiniz?:</strong> {profile?.is_vendor ? "Evet" : "Hayır"}</p>
        {!profile?.is_vendor && (
          <div style={{ marginTop: 8 }}>
            <button onClick={handleCreateVendor} disabled={creatingVendor}>
              {creatingVendor ? "Oluşturuluyor..." : "Satıcı Hesabı Oluştur"}
            </button>
            <p style={{ fontSize: 13, color: "#666" }}>
              Satıcı hesabı oluşturduğunuzda ürün ekleyebilirsiniz.
            </p>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2>Siparişler</h2>
        {orders.length === 0 ? (
          <p>Henüz sipariş yok.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>ID</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Durum</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Tutar</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ padding: 8 }}>{o.id}</td>
                  <td style={{ padding: 8 }}>{o.status}</td>
                  <td style={{ padding: 8 }}>{o.total_amount ?? "-" } {o.currency}</td>
                  <td style={{ padding: 8 }}>{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Hızlı Bağlantılar</h2>
        <ul className="space-y-2">
          <li>
            <Link to="/" className="text-[#ff6a00] hover:underline">
              Mağazaya dön
            </Link>
          </li>
          <li>
            <Link to="/cart" className="text-[#ff6a00] hover:underline">
              Sepetim
            </Link>
          </li>
          {isAdmin && (
            <>
              <li>
                <Link to="/admin/products" className="text-[#ff6a00] hover:underline">
                  Ürün kapat / sil
                </Link>
              </li>
              <li>
                <Link to="/admin/xml-import" className="text-[#ff6a00] hover:underline">
                  XML ile ürün yükle
                </Link>
              </li>
            </>
          )}
        </ul>
      </section>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}

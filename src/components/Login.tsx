import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        navigate("/");
      }
    } catch (err: any) {
      setMessage(err.message || "Giriş sırasında hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white border rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-1">Giriş Yap</h1>
        <p className="text-sm text-gray-600 mb-4">Siparişlerinizi ve hesabınızı yönetmek için giriş yapın.</p>
        <form onSubmit={handleLogin} className="space-y-3">
          <label className="block text-sm">
            E-posta
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Şifre
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ff6a00] text-white py-2.5 rounded-md disabled:opacity-60"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
        <p className="mt-4 text-sm text-gray-600">
          Hesabınız yok mu?{" "}
          <Link to="/signup" className="text-[#ff6a00] hover:underline">
            Kayıt ol
          </Link>
        </p>
      </div>
    </main>
  );
}

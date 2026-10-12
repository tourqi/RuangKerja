"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email atau password salah. Coba lagi.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="RuangKerja" className="h-16 w-auto mx-auto mb-5" />
          <h1 className="text-xl font-semibold tracking-tight text-ink">Masuk ke RuangKerja</h1>
          <p className="text-sm text-muted mt-1">Masukkan email dan password Anda</p>
        </div>

        <div className="bg-white rounded-lg border border-line p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="page-email" className="block text-xs font-medium text-ink mb-1.5">
                Email
              </label>
              <input id="page-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                placeholder="nama@perusahaan.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="page-password" className="block text-xs font-medium text-ink mb-1.5">
                Password
              </label>
              <input id="page-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-xs text-danger bg-danger-soft border border-danger-line px-3 py-2 rounded-md">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white text-sm font-medium py-2.5 rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors mt-1"
            >
              {loading ? "Memproses…" : "Masuk"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-faint mt-6">
          Belum punya akun? Hubungi administrator.
        </p>
      </div>
    </div>
  );
}

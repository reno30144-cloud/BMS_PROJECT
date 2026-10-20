'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Loader2, Radio } from 'lucide-react';
import { supabase, setAuthCookie, isSupabaseConfigured } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Pastikan konfigurasi Supabase tersedia
    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        'Konfigurasi Supabase belum lengkap di file .env.local (NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY diperlukan).'
      );
      return;
    }

    setIsLoading(true);

    try {
      // Panggil fungsi signInWithPassword dari @supabase/supabase-js
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Terjemahkan pesan error umum ke Bahasa Indonesia
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('Email atau kata sandi salah. Silakan periksa kembali kredensial Anda.');
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMessage('Email belum dikonfirmasi. Silakan periksa kotak masuk email Anda.');
        } else {
          setErrorMessage(`Gagal masuk: ${error.message}`);
        }
        return;
      }

      // Jika berhasil dan sesi diperoleh, set cookie sesi untuk Next.js Middleware
      if (data.session) {
        setAuthCookie(
          data.session.access_token,
          data.session.expires_in ?? 60 * 60 * 24 * 7
        );
      }

      // Arahkan operator ke halaman utama (Dashboard)
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat proses otentikasi.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#040D0A] flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Radial Glows */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-police-700/15 rounded-full blur-3xl pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #10b981 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Main Card Container */}
        <div className="bg-[#071712]/90 backdrop-blur-xl border border-police-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/80">
          {/* Header Identitas BEMS & Polresta */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-police-700 to-police-950 flex items-center justify-center shadow-xl shadow-emerald-950/60 border border-emerald-400/30 mb-4 group transition-transform">
              <ShieldCheck className="w-9 h-9 text-white group-hover:scale-105 transition-transform" />
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                BEMS COMMAND CENTER
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-300 font-mono">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                SIAGA 24/7
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              POLRESTA BANDAR LAMPUNG
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Sistem Pemantauan Darurat Bank & Ruang Komando SPKT
            </p>
          </div>

          {/* Alert Box Error */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-950/50 border border-rose-600/50 text-rose-200 text-xs flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed font-medium">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Operator
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@polresta-balam.go.id"
                  className="w-full pl-10 pr-4 py-3 bg-[#0A2219]/80 border border-police-800 text-sm text-white placeholder-slate-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/80 focus:border-emerald-500 transition-all font-sans"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-[#0A2219]/80 border border-police-800 text-sm text-white placeholder-slate-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/80 focus:border-emerald-500 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-police-700 to-police-800 hover:from-emerald-500 hover:to-police-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/40 border border-emerald-400/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>Memverifikasi Akses...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Ruang Kendali</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Security Badges */}
          <div className="mt-8 pt-5 border-t border-police-900/90 text-center space-y-2">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Akses Terenkripsi TLS 256-bit • Otentikasi Supabase
            </p>
            <p className="text-[10px] text-slate-500">
              Khusus Anggota & Operator Terdaftar SPKT Polresta Bandar Lampung
            </p>
          </div>
        </div>

        {/* Brand Copyright */}
        <p className="text-center text-[11px] text-slate-600 mt-6 font-mono">
          © 2026 BEMS Polresta Bandar Lampung. All rights reserved.
        </p>
      </div>
    </div>
  );
}

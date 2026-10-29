'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Loader2, Radio, CheckCircle2, Shield, UserCheck } from 'lucide-react';
import { supabase, setAuthCookie, isSupabaseConfigured } from '@/lib/supabase';
import { resolveUserProfile, ALL_SEED_ACCOUNTS } from '@/lib/rbac';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Modern Authorization Transition State
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authProgress, setAuthProgress] = useState(0);
  const [isTransitioningOut, setIsTransitioningOut] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Pastikan konfigurasi Supabase tersedia
    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        'Konfigurasi Supabase belum lengkap di file .env.local (NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY diperlukan).'
      );
      triggerShake();
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
        triggerShake();
        setIsLoading(false);
        return;
      }

      // Jika berhasil dan sesi diperoleh, set cookie sesi untuk Next.js Middleware
      if (data.session) {
        setAuthCookie(
          data.session.access_token,
          data.session.expires_in ?? 60 * 60 * 24 * 7
        );
      }

      // Memulai Transisi Modern "Security Clearance Granted"
      setIsAuthorized(true);
      setIsLoading(false);

      // Simpan nama operator dan role RBAC di localStorage
      if (typeof window !== 'undefined') {
        const resolved = resolveUserProfile(data.user);
        localStorage.setItem('bems_operator_name', resolved.name);
        localStorage.setItem('bems_operator_role', resolved.role);
        if (resolved.polsekId) {
          localStorage.setItem('bems_operator_polsek_id', resolved.polsekId);
        }
      }

      // Jalankan animasi pengisian otorisasi (900ms)
      const startTime = Date.now();
      const authDuration = 850;

      const progressTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const currentProgress = Math.min(100, Math.round((elapsed / authDuration) * 100));
        setAuthProgress(currentProgress);

        if (currentProgress >= 100) {
          clearInterval(progressTimer);

          // Transisi zoom & blur fade out sebelum beralih ke dashboard
          setTimeout(() => {
            setIsTransitioningOut(true);
            setTimeout(() => {
              router.push('/');
              router.refresh();
            }, 350);
          }, 150);
        }
      }, 25);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat proses otentikasi.';
      setErrorMessage(msg);
      triggerShake();
      setIsLoading(false);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <div
      className={`min-h-screen w-full bg-[#0B1F33] flex items-center justify-center p-4 relative overflow-hidden font-sans select-none transition-all duration-700 ease-out ${
        isTransitioningOut ? 'opacity-0 scale-105 blur-md' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Decorative Radial Glows with Breathing Animation */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #f59e0b 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Main Card Container */}
      <div
        className={`w-full max-w-md relative z-10 transition-all duration-500 animate-card-entrance ${
          isShaking ? 'animate-shake-soft' : ''
        }`}
      >
        <div
          className={`bg-[#102A43]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/80 transition-all duration-500 ${
            isAuthorized ? 'border-emerald-500/40 shadow-emerald-950/40' : ''
          }`}
        >
          {isAuthorized ? (
            /* =========================================================
               MODERN TRANSITION: OTORISASI KOMANDO DITERIMA (CLEARANCE)
               ========================================================= */
            <div className="flex flex-col items-center text-center py-4 animate-clearance-pop">
              {/* Animated Holographic Security Shield */}
              <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-ping-slow" />
                <div className="absolute -inset-4 rounded-full bg-emerald-500/15 blur-2xl animate-pulse" />
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-900/40 border border-emerald-400/60 flex items-center justify-center shadow-xl shadow-emerald-500/25">
                  <ShieldCheck className="w-10 h-10 text-emerald-400" />
                </div>
              </div>

              {/* Clearance Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-mono font-bold tracking-wider uppercase mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>AKSES DITERIMA • LEVEL 1 SPKT</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">
                OTORISASI KOMANDO
              </h2>
              <p className="text-xs text-blue-200/80 mb-6 font-mono truncate max-w-xs">
                {email.trim() || 'Operator SPKT Polresta'}
              </p>

              {/* Progress Bar & Holographic Status */}
              <div className="w-full bg-[#0B1F33]/90 rounded-2xl p-4 border border-white/10 shadow-inner">
                <div className="flex justify-between items-center text-xs font-mono mb-2.5">
                  <span className="text-emerald-400 flex items-center gap-2 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Membuka Ruang Komando BEMS...</span>
                  </span>
                  <span className="font-bold text-white">{authProgress}%</span>
                </div>

                {/* Progress Track */}
                <div className="w-full bg-slate-900/90 rounded-full h-2.5 p-0.5 border border-white/10 overflow-hidden relative">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-75 ease-out relative"
                    style={{ width: `${authProgress}%` }}
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_8px_#ffffff]" />
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 mt-3 font-mono text-center">
                  Protokol Keamanan Aktif • Terenkripsi TLS 256-Bit
                </p>
              </div>
            </div>
          ) : (
            /* =========================================================
               FORM LOGIN OPERATOR
               ========================================================= */
            <>
              {/* Header Identitas BEMS & Polresta */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-32 h-20 mb-3 flex items-center justify-center group transition-transform relative">
                  <Image
                    src="/logo.png"
                    alt="Logo Siger Polresta Bandar Lampung"
                    width={128}
                    height={80}
                    priority
                    className="w-full h-full object-contain filter drop-shadow-[0_8px_20px_rgba(251,191,36,0.35)] group-hover:scale-105 transition-transform"
                  />
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30 font-mono">
                    BEMS COMMAND CENTER
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-amber-300 font-mono">
                    <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                    SIAGA 24/7
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  POLRESTA BANDAR LAMPUNG
                </h1>
                <p className="text-xs text-blue-200/80 mt-1 font-medium">
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
                      className="w-full pl-10 pr-4 py-3 bg-[#0B1F33]/80 border border-white/15 text-sm text-white placeholder-slate-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all font-sans"
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
                      className="w-full pl-10 pr-11 py-3 bg-[#0B1F33]/80 border border-white/15 text-sm text-white placeholder-slate-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Pilihan Cepat Akun Seeding Database (RBAC: Admin vs Polsek) */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      Pilih Akun Cepat (Uji Coba RBAC):
                    </span>
                    <span className="text-[10px] text-amber-300 font-mono">Default: Polresta123!</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SEED_ACCOUNTS.map((acc) => {
                      const isSelected = email.toLowerCase() === acc.email.toLowerCase();
                      const isAdmin = acc.role === 'admin';
                      return (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => {
                            setEmail(acc.email);
                            setPassword('Polresta123!');
                          }}
                          className={`text-[10px] font-medium px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-bold border-amber-300 shadow-xs scale-105'
                              : isAdmin
                              ? 'bg-amber-500/15 text-amber-300 border-amber-400/30 hover:bg-amber-500/25'
                              : 'bg-white/10 text-blue-200 border-white/10 hover:bg-white/15'
                          }`}
                          title={`Login sebagai ${acc.fullName} (${acc.role.toUpperCase()})`}
                        >
                          {isAdmin ? '⭐ Admin SPKT' : acc.name.replace('Piket ', '')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 border border-amber-300 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Memverifikasi Akses...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Ruang Kendali</span>
                      <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Footer Security Badges */}
              <div className="mt-8 pt-5 border-t border-white/10 text-center space-y-2">
                <p className="text-[11px] text-blue-200/80 flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Akses Terenkripsi TLS 256-bit • Otentikasi Supabase
                </p>
                <p className="text-[10px] text-slate-500">
                  Khusus Anggota & Operator Terdaftar SPKT Polresta Bandar Lampung
                </p>
              </div>
            </>
          )}
        </div>

        {/* Brand Copyright */}
        <p className="text-center text-[11px] text-slate-600 mt-6 font-mono">
          © 2026 BEMS Polresta Bandar Lampung. All rights reserved.
        </p>
      </div>
    </div>
  );
}

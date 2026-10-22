'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2, Lock, ShieldAlert } from 'lucide-react';
import { supabase, clearAuthCookie } from '@/lib/supabase';

interface LogoutButtonProps {
  /**
   * Tampilan tombol:
   * - 'sidebar': Desain lebar penuh untuk menu navigasi atau profil sidebar
   * - 'header': Desain ikon ringkas untuk top navigation bar
   * - 'default': Tombol standar fleksibel
   */
  variant?: 'sidebar' | 'header' | 'default';
  className?: string;
  showText?: boolean;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  variant = 'default',
  className = '',
  showText = true,
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showExitOverlay, setShowExitOverlay] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    setShowExitOverlay(true);

    try {
      // 1. Panggil fungsi signOut dari Supabase jika client aktif
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // 2. Bersihkan cookie sesi lokal secara eksplisit
      clearAuthCookie();

      // Hapus status boot agar sesi berikutnya tetap fresh
      try {
        sessionStorage.removeItem('bems_boot_shown');
      } catch {}

      // Berikan jeda transisi halus 600ms sebelum beralih ke login
      setTimeout(() => {
        router.push('/login');
        router.refresh();
        setIsLoading(false);
      }, 600);
    }
  };

  return (
    <>
      {/* Modern Logout Exit Overlay */}
      {showExitOverlay && (
        <div className="fixed inset-0 z-[99999] bg-[#071320]/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-300 select-none">
          <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-ping-slow" />
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-center shadow-lg shadow-amber-500/15">
              <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-[11px] font-mono uppercase tracking-wider mb-2 border border-white/10">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>MENGAKHIRI SESI KOMANDO</span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight mb-1">
            Mengunci Akses BEMS Polresta
          </h3>
          <p className="text-xs text-blue-200/70 font-mono flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Menghapus sesi & mengalihkan ke halaman login...</span>
          </p>
        </div>
      )}

      {/* Gaya varian Header */}
      {variant === 'header' && (
        <button
          onClick={handleLogout}
          disabled={isLoading}
          title="Keluar dari Sistem (Logout)"
          className={`p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all flex items-center gap-2 cursor-pointer ${className}`}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-red-500" />
          ) : (
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-red-500" />
          )}
          {showText && <span className="text-xs font-semibold">Keluar</span>}
        </button>
      )}

      {/* Gaya varian Sidebar */}
      {variant === 'sidebar' && (
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 hover:border-rose-600/60 transition-all duration-200 cursor-pointer active:scale-98 ${className}`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
          ) : (
            <LogOut className="w-4 h-4 text-rose-400" />
          )}
          <span>{isLoading ? 'Mengakhiri Sesi...' : 'Keluar (Logout)'}</span>
        </button>
      )}

      {/* Gaya Default */}
      {variant === 'default' && (
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer ${className}`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
          ) : (
            <LogOut className="w-4 h-4 text-rose-600" />
          )}
          {showText && <span>{isLoading ? 'Keluar...' : 'Logout'}</span>}
        </button>
      )}
    </>
  );
};

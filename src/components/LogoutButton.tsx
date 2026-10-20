'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
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

  const handleLogout = async () => {
    setIsLoading(true);
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

      // 3. Arahkan pengguna kembali ke halaman /login
      router.push('/login');
      router.refresh();
      setIsLoading(false);
    }
  };

  // Gaya varian Header
  if (variant === 'header') {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        title="Keluar dari Sistem (Logout)"
        className={`p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all flex items-center gap-2 ${className}`}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-red-500" />
        ) : (
          <LogOut className="w-5 h-5 text-slate-500 group-hover:text-red-500" />
        )}
        {showText && <span className="text-xs font-semibold">Keluar</span>}
      </button>
    );
  }

  // Gaya varian Sidebar
  if (variant === 'sidebar') {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 hover:border-rose-600/60 transition-all duration-200 ${className}`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
        ) : (
          <LogOut className="w-4 h-4 text-rose-400" />
        )}
        <span>{isLoading ? 'Mengakhiri Sesi...' : 'Keluar (Logout)'}</span>
      </button>
    );
  }

  // Gaya Default
  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
      ) : (
        <LogOut className="w-4 h-4 text-rose-600" />
      )}
      {showText && <span>{isLoading ? 'Keluar...' : 'Logout'}</span>}
    </button>
  );
};

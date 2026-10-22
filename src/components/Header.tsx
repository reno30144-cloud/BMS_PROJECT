'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2, Cpu, BellRing, Clock, Menu } from 'lucide-react';
import { alarmAudio } from '@/lib/audio-alert';

interface HeaderProps {
  onOpenSimulator: () => void;
  hasActiveAlarm: boolean;
  isUsbConnected?: boolean;
  onConnectUsb?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenSimulator, 
  hasActiveAlarm,
  isUsbConnected = false,
  onConnectUsb,
  onToggleMobileMenu,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
      setDateStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    alarmAudio.setMuted(nextState);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <header className="h-16 sm:h-20 bg-white border-b border-slate-200 px-3 sm:px-8 flex items-center justify-between shadow-xs sticky top-0 z-30">
      {/* Title & Subtitle + Hamburger Menu */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        {/* Tombol Hamburger Drawer (Mobile Only) */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shrink-0 flex items-center justify-center min-w-[40px] min-h-[40px] cursor-pointer"
          title="Buka Menu Navigasi"
        >
          <Menu className="w-5 h-5 text-police-950" />
        </button>

        <img
          src="/logo.png"
          alt="Logo Siger Polresta Bandar Lampung"
          className="lg:hidden h-10 sm:h-13 w-auto max-w-[44px] sm:max-w-[64px] object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)] shrink-0 transition-transform duration-200"
        />
        <div className="min-w-0" title="BEMS: Bank Emergency Monitoring System - Polresta Bandar Lampung">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h2 className="text-sm sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">
              BEMS Polresta
            </h2>
            <span className="hidden sm:inline-block bg-amber-50 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-300 shadow-xs">
              Live Feed
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate flex items-center gap-1.5">
            <span className="font-bold text-[#102A43]">Bank Emergency Monitoring System</span>
            <span className="hidden md:inline text-slate-300">•</span>
            <span className="hidden md:inline text-slate-500">Pusat Pengawasan SPKT</span>
          </p>
        </div>
      </div>

      {/* Action and Clock Controls */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Active Emergency Banner if Triggered */}
        {hasActiveAlarm && (
          <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold shadow-lg shadow-red-600/40 border border-red-400/50 animate-bounce">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span className="tracking-wide hidden sm:inline">ALARM DARURAT</span>
            <span className="tracking-wide sm:hidden">BAHAYA</span>
          </div>
        )}

        {/* Real-time Clock (Desktop/Tablet) */}
        <div className="hidden md:flex bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-1.5 items-center gap-2.5">
          <Clock className="w-4 h-4 text-[#102A43]" />
          <div className="text-right">
            <div className="text-xs sm:text-sm font-bold text-slate-800 font-mono tracking-tight leading-none">
              {timeStr || '--:--:-- WIB'}
            </div>
            <div className="text-[9px] text-slate-400 font-medium mt-0.5">
              {dateStr || '...'}
            </div>
          </div>
        </div>

        {/* Audio Mute Control (Besar & Mudah Ditekan di Layar HP) */}
        <button
          onClick={handleToggleMute}
          title={isMuted ? 'Suara Sirine Dinonaktifkan (Klik untuk bunyikan)' : 'Suara Sirine Aktif (Klik untuk bisukan)'}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center min-w-[42px] min-h-[42px] active:scale-95 ${
            isMuted
              ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
              : hasActiveAlarm
              ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100 animate-pulse'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-amber-600" /> : <Volume2 className="w-5 h-5 text-emerald-600" />}
        </button>

        {/* USB Hardware Serial Status Button (Desktop/Tablet) */}
        <button
          onClick={onConnectUsb || onOpenSimulator}
          className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border shadow-xs active:scale-95 cursor-pointer ${
            isUsbConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
          }`}
          title={isUsbConnected ? 'Kabel USB ESP32 Terhubung & Siaga' : 'Klik untuk menyambungkan kabel USB ESP32'}
        >
          <span className={`w-2 h-2 rounded-full ${isUsbConnected ? 'bg-emerald-500 animate-ping-slow' : 'bg-slate-400'}`}></span>
          <span>{isUsbConnected ? '🟢 USB Siaga' : '🔌 USB'}</span>
        </button>

        {/* Fullscreen Toggle (Desktop Only) */}
        <button
          onClick={handleToggleFullscreen}
          title="Mode Layar Penuh"
          className="hidden md:flex p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2, Cpu, BellRing, Clock } from 'lucide-react';
import { alarmAudio } from '@/lib/audio-alert';
import { LogoutButton } from '@/components/LogoutButton';

interface HeaderProps {
  onOpenSimulator: () => void;
  hasActiveAlarm: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSimulator, hasActiveAlarm }) => {
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
    <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-xs sticky top-0 z-10">
      {/* Title & Subtitle */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Pusat Kendali Pengawasan Perbankan
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-300/60">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Ruang Komando SPKT • Polres Kota Bandar Lampung
          </p>
        </div>
      </div>

      {/* Action and Clock Controls */}
      <div className="flex items-center gap-4">
        {/* Active Emergency Banner if Triggered */}
        {hasActiveAlarm && (
          <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold animate-pulse shadow-md shadow-red-600/30">
            <BellRing className="w-4 h-4" />
            <span>ALARM DARURAT AKTIF</span>
          </div>
        )}

        {/* Real-time Clock */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 flex items-center gap-3">
          <Clock className="w-4 h-4 text-police-700" />
          <div className="text-right">
            <div className="text-sm font-bold text-slate-800 font-mono tracking-tight leading-none">
              {timeStr || '--:--:-- WIB'}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              {dateStr || '...'}
            </div>
          </div>
        </div>

        {/* Audio Mute Button */}
        <button
          onClick={handleToggleMute}
          title={isMuted ? 'Suara Sirine Dinonaktifkan (Klik untuk bunyikan)' : 'Suara Sirine Aktif (Klik untuk bisukan)'}
          className={`p-2.5 rounded-xl border transition-all ${
            isMuted
              ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-amber-600" /> : <Volume2 className="w-5 h-5 text-emerald-600" />}
        </button>

        {/* Simulation Shortcut Button */}
        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-2 bg-gradient-to-r from-police-800 to-police-900 hover:from-police-900 hover:to-police-950 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all border border-police-700 hover:shadow"
        >
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>Uji Coba ESP32</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={handleToggleFullscreen}
          title="Mode Layar Penuh (Video Wall)"
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

        {/* Tombol Logout Cepat di Header */}
        <LogoutButton variant="header" showText={false} />
      </div>
    </header>
  );
};

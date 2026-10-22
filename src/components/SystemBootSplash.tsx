'use client';

import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { Radio, CheckCircle2, Cpu } from 'lucide-react';

interface BootStep {
  title: string;
  detail: string;
}

const BOOT_STEPS: BootStep[] = [
  {
    title: 'Inisialisasi Kernel BEMS v2.4',
    detail: 'Memuat modul arsitektur & telemetri command center',
  },
  {
    title: 'Enkripsi & Saluran TLS 256-Bit',
    detail: 'Mengamankan komunikasi database & Web Socket',
  },
  {
    title: 'Sinkronisasi Sensor IoT ESP32-C3',
    detail: 'Verifikasi status panic button bank mitra aktif',
  },
  {
    title: 'Pusat Komando SPKT Siaga',
    detail: 'Sistem siap beroperasi 24/7',
  },
];

// Helper aman untuk deteksi client-side tanpa cascading render
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export const SystemBootSplash: React.FC = () => {
  const isClient = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [shouldShow, setShouldShow] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Fungsi keluar cepat didefinisikan terlebih dahulu
  const finishFast = useCallback(() => {
    setProgress(100);
    setCurrentStep(3);
    setIsExiting(true);
    setTimeout(() => {
      setIsComplete(true);
    }, 300);
  }, []);

  // Cek sessionStorage satu kali saat client ter-mount
  useEffect(() => {
    if (!isClient) return;

    try {
      const hasBooted = sessionStorage.getItem('bems_boot_shown');
      if (!hasBooted) {
        setShouldShow(true);
        sessionStorage.setItem('bems_boot_shown', 'true');
      } else {
        setIsComplete(true);
      }
    } catch {
      setShouldShow(true);
    }
  }, [isClient]);

  // Efek progress bar dan timer transisi
  useEffect(() => {
    if (!shouldShow || isComplete) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        finishFast();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const startTime = Date.now();
    const duration = 1350; // ms

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(100, Math.round((elapsed / duration) * 100));

      setProgress(rawProgress);

      if (rawProgress < 30) {
        setCurrentStep(0);
      } else if (rawProgress < 65) {
        setCurrentStep(1);
      } else if (rawProgress < 90) {
        setCurrentStep(2);
      } else {
        setCurrentStep(3);
      }

      if (rawProgress >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          setIsExiting(true);
          setTimeout(() => {
            setIsComplete(true);
          }, 600);
        }, 180);
      }
    }, 25);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shouldShow, isComplete, finishFast]);

  // Jangan render apa pun jika sudah selesai atau tidak perlu ditampilkan
  if (!isClient || !shouldShow || isComplete) {
    return null;
  }

  return (
    <div
      onClick={finishFast}
      className={`fixed inset-0 z-[99999] bg-[#071320] flex flex-col items-center justify-center p-4 select-none cursor-pointer overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExiting
          ? 'opacity-0 scale-105 pointer-events-none blur-sm'
          : 'opacity-100 scale-100'
      }`}
      title="Klik atau tekan [Esc] untuk langsung masuk"
    >
      {/* Background Cyber Grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #f59e0b 1.5px, transparent 0)`,
          backgroundSize: '28px 28px',
        }}
      />

      {/* Ambient Lighting Spheres */}
      <div className="absolute top-1/3 left-1/4 -translate-x-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-[100px] pointer-events-none animate-glow-pulse" />
      <div className="absolute bottom-1/3 right-1/4 translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-[100px] pointer-events-none animate-glow-pulse" />

      {/* Concentric Radar Rings & Scanner Sweep */}
      <div className="absolute w-[460px] h-[460px] rounded-full border border-white/5 pointer-events-none flex items-center justify-center">
        <div className="w-[340px] h-[340px] rounded-full border border-amber-400/10 flex items-center justify-center">
          <div className="w-[220px] h-[220px] rounded-full border border-blue-400/15 relative">
            {/* Radar scanner needle */}
            <div className="absolute inset-0 rounded-full animate-radar-spin bg-gradient-to-tr from-transparent via-amber-400/10 to-transparent" />
          </div>
        </div>
      </div>

      {/* Main Center Console */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full px-4 animate-card-entrance">
        {/* Holographic Logo Emblem */}
        <div className="relative w-36 h-28 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-amber-400/10 rounded-full blur-xl animate-pulse" />
          <Image
            src="/logo.png"
            alt="Logo Siger Polresta Bandar Lampung"
            width={144}
            height={112}
            priority
            className="w-full h-full object-contain filter drop-shadow-[0_0_24px_rgba(251,191,36,0.4)] relative z-10"
          />
          {/* Scanline overlay across logo */}
          <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent animate-scanline pointer-events-none z-20" />
        </div>

        {/* System Title Badges */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] font-mono font-bold tracking-wider uppercase mb-2 shadow-xs">
          <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>BEMS COMMAND CENTER</span>
          <span className="w-1 h-1 rounded-full bg-amber-400" />
          <span>POLRESTA BANDAR LAMPUNG</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">
          BANK EMERGENCY MONITORING SYSTEM
        </h1>
        <p className="text-xs text-blue-200/80 mb-6 font-medium">
          Sistem Pengamanan Terpadu & Kendali Cepat SPKT
        </p>

        {/* Progress Display Card */}
        <div className="w-full bg-[#102A43]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl shadow-black/40 mb-3">
          {/* Progress Bar & Percentage */}
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-amber-400 font-semibold flex items-center gap-1.5 truncate">
              {progress === 100 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300">SISTEM SIAGA PENUH</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                  <span>{BOOT_STEPS[currentStep]?.title || 'Memuat...'}</span>
                </>
              )}
            </span>
            <span className="text-white font-bold ml-2 shrink-0">{progress}%</span>
          </div>

          {/* Glowing Track */}
          <div className="w-full bg-slate-900/90 rounded-full h-2.5 p-0.5 border border-white/10 overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-75 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {/* Glowing Tip */}
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_8px_#ffffff]" />
            </div>
          </div>

          {/* Sub detail message */}
          <p className="text-[11px] text-slate-400 mt-2.5 font-mono text-left truncate">
            &gt; {BOOT_STEPS[currentStep]?.detail || 'Inisialisasi telemetri...'}
          </p>
        </div>

        {/* Skip Hint */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono">
          <span>Klik di mana saja atau tekan</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-400 border border-white/15 text-[9px]">
            ESC
          </kbd>
          <span>untuk langsung masuk</span>
        </div>
      </div>
    </div>
  );
};

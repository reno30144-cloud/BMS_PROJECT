'use client';

import React, { useState } from 'react';
import { Radio, Building2, History, Cpu, ShieldCheck, ChevronRight, Map, X } from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';
import { ProfileModal } from '@/components/ProfileModal';

interface SidebarProps {
  activeTab: 'monitoring' | 'map' | 'banks' | 'history' | 'simulator';
  setActiveTab: (tab: 'monitoring' | 'map' | 'banks' | 'history' | 'simulator') => void;
  triggeredCount: number;
  operatorName?: string;
  operatorRole?: string;
  operatorEmail?: string;
  onUpdateName?: (newName: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  triggeredCount,
  operatorName = 'Admin',
  operatorRole = 'Piket SPKT • admin@polresta.id',
  operatorEmail = 'admin@polresta.id',
  onUpdateName,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Ambil inisial nama operator (contoh: "Dimas Pratama" -> "DP")
  const initials = operatorName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'OP';

  const navItems = [
    {
      id: 'monitoring' as const,
      label: 'Ruang Pantau',
      icon: Radio,
      badge: triggeredCount > 0 ? `${triggeredCount} BAHAYA` : null,
      isEmergency: triggeredCount > 0,
    },
    {
      id: 'map' as const,
      label: 'Peta GIS Radar',
      icon: Map,
      badge: null,
      isEmergency: false,
    },
    {
      id: 'banks' as const,
      label: 'Direktori Bank Mitra',
      icon: Building2,
      badge: null,
      isEmergency: false,
    },
    {
      id: 'history' as const,
      label: 'Log Insiden & Audit',
      icon: History,
      badge: null,
      isEmergency: false,
    },
    {
      id: 'simulator' as const,
      label: 'Simulasi IoT (ESP32)',
      icon: Cpu,
      badge: 'TEST',
      isEmergency: false,
    },
  ];

  const renderContent = (isMobileView: boolean) => (
    <div className="flex flex-col h-full justify-between bg-[#102A43] text-white select-none">
      {/* Bagian Atas: Header Brand & Navigasi (Bisa scroll jika layar pendek) */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Header Identitas Institusi Polresta (Desain Bersih, Tajam & Modern Tanpa Efek Cahaya Bulat) */}
        <div className="p-5 border-b border-white/10 bg-[#102A43]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Logo Siger Polresta (Bersih & Tajam) */}
              <img
                src="/logo.png"
                alt="Logo Siger Polresta Bandar Lampung"
                className="h-14 w-auto max-w-[62px] object-contain shrink-0 transition-transform duration-200 hover:scale-105 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] cursor-pointer"
              />

              <div className="min-w-0">
                {/* Badge BEMS */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-black tracking-widest uppercase bg-amber-500 text-white px-2.5 py-0.5 rounded-md font-mono shadow-xs">
                    BEMS
                  </span>
                </div>

                <h1 className="text-lg font-black text-white tracking-wider leading-none truncate">
                  POLRESTA
                </h1>
                <p className="text-xs font-semibold text-amber-300 tracking-wide truncate mt-1">
                  Bandar Lampung
                </p>
              </div>
            </div>

            {/* Tombol Tutup Khusus Mobile Drawer */}
            {isMobileView && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-2 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Tutup Menu Navigasi"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Status Kesiagaan 24/7 */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-2 text-blue-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="font-semibold text-blue-100/90 tracking-wide">Command Center SPKT</span>
            </span>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono tracking-wider shadow-xs">
              24/7 SIAGA
            </span>
          </div>
        </div>

        {/* Menu Navigasi Utama (Gaya Navy & Warm Amber Executive) */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  if (isMobileView) onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer group active:scale-[0.98] ${
                  isActive
                    ? 'bg-white/15 text-white font-bold border border-white/25 shadow-sm backdrop-blur-xs'
                    : 'text-blue-100/75 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-amber-400 stroke-[2.4]' : 'text-blue-200/80 group-hover:text-white stroke-[2]'
                    }`}
                  />
                  <span className={`truncate ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </div>

                {/* Badge atau Indikator */}
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {item.badge && item.isEmergency && (
                    <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse shadow-md shadow-red-600/50 flex items-center gap-1 border border-red-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                      {item.badge}
                    </span>
                  )}
                  {item.badge && !item.isEmergency && (
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
                          : 'bg-white/10 text-blue-200 border border-white/10'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && !item.badge && (
                    <ChevronRight className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bagian Bawah: Profil Operator & Status Konektivitas (Gaya Card Executive Mockup) */}
      <div className="shrink-0 p-4 border-t border-white/10 bg-[#102A43]/95 backdrop-blur-xs">
        {/* Tombol Profil Operator */}
        <button
          onClick={() => setIsProfileOpen(true)}
          type="button"
          className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-amber-400/40 mb-3 transition-all duration-200 cursor-pointer group flex items-center justify-between shadow-xs hover:shadow-md active:scale-[0.98]"
          title="Klik untuk melihat Profil & Tentang Sistem"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar Lingkaran Putih (mirip John Don pada mockup) */}
            <div className="w-10 h-10 rounded-full bg-white text-[#102A43] flex items-center justify-center font-extrabold text-xs shrink-0 shadow-md border-2 border-amber-400/80 group-hover:scale-105 transition-transform">
              {initials}
            </div>
            <div className="overflow-hidden min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors" title={operatorName}>
                  {operatorName}
                </p>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-400/30 px-1.5 py-0.2 rounded-md">
                  PIKET
                </span>
                <p className="text-[10px] text-blue-200/80 truncate">{operatorRole.replace('Piket SPKT • ', '')}</p>
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-300 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
        </button>

        {/* Tombol Logout */}
        <LogoutButton variant="sidebar" className="mb-3 rounded-xl" />

        {/* Telemetry Status Bar */}
        <div className="flex items-center justify-between text-[11px] text-blue-200/80 px-1 pt-0.5">
          <span className="flex items-center gap-1.5 text-blue-200/90 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Server Realtime</span>
          </span>
          <span className="text-amber-300 font-mono text-[10px] font-bold flex items-center gap-1.5 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-400/30 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            TERKONEKSI
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent di Layar Lebar: h-full, w-72, solid background & no collapse) */}
      <aside className="hidden lg:flex w-72 h-full bg-[#102A43] text-white flex-col border-r border-[#0D2338] shrink-0 select-none shadow-2xl z-30 relative overflow-hidden">
        {renderContent(false)}
      </aside>

      {/* Mobile Sidebar Drawer Overlay (Di Layar HP / Tablet) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-[100] flex lg:hidden">
          {/* Backdrop Blur Gelap */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
            aria-label="Tutup menu"
          />

          {/* Drawer Panel */}
          <div className="relative w-80 max-w-[85vw] bg-[#102A43] text-white flex flex-col h-full shadow-2xl overflow-hidden z-10 animate-in slide-in-from-left duration-200 border-r border-[#0D2338]">
            {renderContent(true)}
          </div>
        </div>
      )}

      {/* Modal Profil & Tentang Saya */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        operatorName={operatorName}
        operatorRole={operatorRole}
        operatorEmail={operatorEmail}
        onUpdateName={onUpdateName}
      />
    </>
  );
};

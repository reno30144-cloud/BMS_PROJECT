'use client';

import React from 'react';
import { ShieldAlert, Radio, Building2, History, Settings, Cpu, ShieldCheck } from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';

interface SidebarProps {
  activeTab: 'monitoring' | 'banks' | 'history' | 'simulator';
  setActiveTab: (tab: 'monitoring' | 'banks' | 'history' | 'simulator') => void;
  triggeredCount: number;
  operatorName?: string;
  operatorRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  triggeredCount,
  operatorName = 'Bripka Dimas Pratama',
  operatorRole = 'Operator Piket Regu A',
}) => {
  // Ambil inisial nama operator (contoh: "Dimas Pratama" -> "DP")
  const initials = operatorName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'OP';
  return (
    <aside className="w-72 bg-police-950 text-white flex flex-col justify-between border-r border-police-900 shrink-0 select-none shadow-2xl z-20">
      <div>
        {/* Header Identitas Institusi */}
        <div className="p-6 border-b border-police-900/80 bg-gradient-to-b from-police-900 to-police-950">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-police-700 flex items-center justify-center shadow-lg shadow-emerald-900/40 border border-emerald-400/30">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-widest uppercase text-emerald-400">BEMS</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-400/30 font-mono">v1.0-MVP</span>
              </div>
              <h1 className="text-base font-bold text-white tracking-tight leading-tight">POLRESTA</h1>
              <p className="text-xs text-slate-300 font-medium">Bandar Lampung</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-police-900/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Command Center SPKT
            </span>
            <span className="text-emerald-400/80 font-mono">24/7 SIAGA</span>
          </div>
        </div>

        {/* Menu Navigasi Utama */}
        <nav className="p-4 space-y-1.5">
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeTab === 'monitoring'
                ? 'bg-police-800 text-white shadow-md shadow-police-950 border border-emerald-500/30'
                : 'text-slate-300 hover:bg-police-900 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Radio className={`w-5 h-5 ${activeTab === 'monitoring' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>Ruang Pantau</span>
            </div>
            {triggeredCount > 0 && (
              <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse shadow-lg shadow-red-600/50">
                {triggeredCount} BAHAYA
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('banks')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeTab === 'banks'
                ? 'bg-police-800 text-white shadow-md shadow-police-950 border border-emerald-500/30'
                : 'text-slate-300 hover:bg-police-900 hover:text-white'
            }`}
          >
            <Building2 className={`w-5 h-5 ${activeTab === 'banks' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Direktori Bank Mitra</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-police-800 text-white shadow-md shadow-police-950 border border-emerald-500/30'
                : 'text-slate-300 hover:bg-police-900 hover:text-white'
            }`}
          >
            <History className={`w-5 h-5 ${activeTab === 'history' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Log Insiden & Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
              activeTab === 'simulator'
                ? 'bg-police-800 text-white shadow-md shadow-police-950 border border-emerald-500/30'
                : 'text-slate-300 hover:bg-police-900 hover:text-white'
            }`}
          >
            <Cpu className={`w-5 h-5 ${activeTab === 'simulator' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Simulasi IoT (ESP32-C3)</span>
          </button>
        </nav>
      </div>

      {/* Bagian Bawah / Info Shift Operator */}
      <div className="p-4 border-t border-police-900/80 bg-police-950">
        <div className="p-3 bg-police-900/60 rounded-xl border border-police-800/80 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-police-700 border border-emerald-500/40 flex items-center justify-center font-bold text-xs text-emerald-300 shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate" title={operatorName}>
                {operatorName}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{operatorRole}</p>
            </div>
          </div>
        </div>

        {/* Tombol Logout */}
        <LogoutButton variant="sidebar" className="mb-3" />

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>Server Realtime</span>
          <span className="text-emerald-400 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            TERKONEKSI
          </span>
        </div>
      </div>
    </aside>
  );
};

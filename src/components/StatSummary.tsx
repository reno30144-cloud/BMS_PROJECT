'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, WifiOff, Building2 } from 'lucide-react';
import { Device } from '@/types/bems';

interface StatSummaryProps {
  devices: Device[];
  selectedFilter: 'ALL' | 'STANDBY' | 'TRIGGERED' | 'OFFLINE';
  onSelectFilter: (filter: 'ALL' | 'STANDBY' | 'TRIGGERED' | 'OFFLINE') => void;
}

export const StatSummary: React.FC<StatSummaryProps> = ({
  devices,
  selectedFilter,
  onSelectFilter,
}) => {
  const total = devices.length;
  const standbyCount = devices.filter((d) => d.status === 'STANDBY').length;
  const triggeredCount = devices.filter((d) => d.status === 'TRIGGERED').length;
  const offlineCount = devices.filter((d) => d.status === 'OFFLINE').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Card */}
      <div
        onClick={() => onSelectFilter('ALL')}
        className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
          selectedFilter === 'ALL'
            ? 'ring-2 ring-police-700 border-police-700'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Bank Mitra
          </span>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 font-mono">{total}</span>
          <span className="text-xs text-slate-500 font-medium">Titik Terpasang</span>
        </div>
      </div>

      {/* Standby Card */}
      <div
        onClick={() => onSelectFilter('STANDBY')}
        className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
          selectedFilter === 'STANDBY'
            ? 'ring-2 ring-emerald-500 border-emerald-500'
            : 'border-slate-200 hover:border-emerald-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Kondisi Standby (Aman)
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-emerald-600 font-mono">{standbyCount}</span>
          <span className="text-xs text-emerald-600 font-medium">Alat Siaga</span>
        </div>
      </div>

      {/* Triggered Card */}
      <div
        onClick={() => onSelectFilter('TRIGGERED')}
        className={`p-5 rounded-2xl border transition-all cursor-pointer ${
          triggeredCount > 0
            ? 'bg-red-50 border-red-500 ring-2 ring-red-500 shadow-lg shadow-red-500/10 animate-pulse'
            : selectedFilter === 'TRIGGERED'
            ? 'bg-white ring-2 ring-red-500 border-red-500 shadow-xs'
            : 'bg-white border-slate-200 hover:border-red-200 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold uppercase tracking-wider ${triggeredCount > 0 ? 'text-red-700' : 'text-slate-500'}`}>
            Peringatan Bahaya
          </span>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${triggeredCount > 0 ? 'bg-red-600 text-white animate-bounce' : 'bg-red-50 text-red-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold font-mono ${triggeredCount > 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {triggeredCount}
          </span>
          <span className={`text-xs font-medium ${triggeredCount > 0 ? 'text-red-700 font-bold' : 'text-slate-500'}`}>
            {triggeredCount > 0 ? 'MEMBUTUHKAN TINDAKAN!' : 'Nihil Kejadian'}
          </span>
        </div>
      </div>

      {/* Offline Card */}
      <div
        onClick={() => onSelectFilter('OFFLINE')}
        className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
          selectedFilter === 'OFFLINE'
            ? 'ring-2 ring-slate-400 border-slate-400'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Terputus (Offline)
          </span>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
            <WifiOff className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-700 font-mono">{offlineCount}</span>
          <span className="text-xs text-slate-500 font-medium">&gt; 10 Mnt Tanpa Ping</span>
        </div>
      </div>
    </div>
  );
};

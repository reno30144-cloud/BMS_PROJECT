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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-3 sm:mb-6">
      {/* Total Card */}
      <div
        onClick={() => onSelectFilter('ALL')}
        className={`bg-white p-3 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md min-h-[88px] sm:min-h-[110px] flex flex-col justify-between active:scale-[0.98] ${
          selectedFilter === 'ALL'
            ? 'ring-2 ring-[#102A43] border-[#102A43]'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
            Total Bank
          </span>
          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-100 flex items-center justify-center text-[#102A43] shrink-0">
            <Building2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-3 flex items-baseline gap-1 sm:gap-2">
          <span className="text-xl sm:text-3xl font-extrabold text-[#102A43] font-mono leading-none">{total}</span>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">Titik Pasang</span>
        </div>
      </div>

      {/* Standby Card */}
      <div
        onClick={() => onSelectFilter('STANDBY')}
        className={`bg-white p-3 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md min-h-[88px] sm:min-h-[110px] flex flex-col justify-between active:scale-[0.98] ${
          selectedFilter === 'STANDBY'
            ? 'ring-2 ring-emerald-500 border-emerald-500'
            : 'border-slate-200 hover:border-emerald-200'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider truncate">
            Standby <span className="hidden xs:inline">(Aman)</span>
          </span>
          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-3 flex items-baseline gap-1 sm:gap-2">
          <span className="text-xl sm:text-3xl font-extrabold text-emerald-600 font-mono leading-none">{standbyCount}</span>
          <span className="text-[10px] sm:text-xs text-emerald-600/80 font-medium truncate">Alat Siaga</span>
        </div>
      </div>

      {/* Triggered Card */}
      <div
        onClick={() => onSelectFilter('TRIGGERED')}
        className={`p-3 sm:p-5 rounded-2xl border transition-all cursor-pointer min-h-[88px] sm:min-h-[110px] flex flex-col justify-between active:scale-[0.98] ${
          triggeredCount > 0
            ? 'bg-red-50 border-red-500 ring-2 ring-red-500 shadow-lg shadow-red-500/20 animate-pulse'
            : selectedFilter === 'TRIGGERED'
            ? 'bg-white ring-2 ring-red-500 border-red-500 shadow-xs'
            : 'bg-white border-slate-200 hover:border-red-200 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate ${triggeredCount > 0 ? 'text-red-700' : 'text-slate-500'}`}>
            Bahaya
          </span>
          <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${triggeredCount > 0 ? 'bg-red-600 text-white animate-bounce' : 'bg-red-50 text-red-600'}`}>
            <AlertTriangle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-3 flex items-baseline gap-1 sm:gap-2">
          <span className={`text-xl sm:text-3xl font-extrabold font-mono leading-none ${triggeredCount > 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {triggeredCount}
          </span>
          <span className={`text-[10px] sm:text-xs font-bold truncate ${triggeredCount > 0 ? 'text-red-700 font-extrabold' : 'text-slate-400'}`}>
            {triggeredCount > 0 ? 'DARURAT!' : 'Nihil'}
          </span>
        </div>
      </div>

      {/* Offline Card */}
      <div
        onClick={() => onSelectFilter('OFFLINE')}
        className={`bg-white p-3 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md min-h-[88px] sm:min-h-[110px] flex flex-col justify-between active:scale-[0.98] ${
          selectedFilter === 'OFFLINE'
            ? 'ring-2 ring-slate-400 border-slate-400'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
            Offline
          </span>
          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <WifiOff className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-3 flex items-baseline gap-1 sm:gap-2">
          <span className="text-xl sm:text-3xl font-extrabold text-slate-700 font-mono leading-none">{offlineCount}</span>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">&gt; 15s Ping</span>
        </div>
      </div>
    </div>
  );
};

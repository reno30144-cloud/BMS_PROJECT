'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Radio } from 'lucide-react';
import type { BankMarkerData } from './MapDashboard';
import { PoliceStation } from '@/types/bems';

interface MapWrapperProps {
  banks?: BankMarkerData[];
  policeStations?: PoliceStation[];
  height?: string;
  className?: string;
}

const DynamicMapDashboard = dynamic(
  () => import('./MapDashboard').then((mod) => mod.MapDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="relative w-full h-[560px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none shadow-2xl">
        <div className="relative flex items-center justify-center mb-5">
          <div className="w-16 h-16 rounded-full border border-emerald-500/30 animate-ping absolute" />
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center absolute">
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
        <h3 className="text-base font-semibold text-slate-100 tracking-wide">
          Memuat Peta Pemantauan BEMS...
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
          Menginisialisasi modul GIS, batas wilayah kecamatan Bandar Lampung, dan telemetri lokasi perbankan & polsek.
        </p>
        <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-emerald-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Menyiapkan Map Engine (Client-Side Only)
        </div>
      </div>
    ),
  }
);

export const MapWrapper: React.FC<MapWrapperProps> = ({
  banks,
  policeStations,
  height,
  className,
}) => {
  return (
    <DynamicMapDashboard
      banks={banks}
      policeStations={policeStations}
      height={height}
      className={className}
    />
  );
};

export default MapWrapper;

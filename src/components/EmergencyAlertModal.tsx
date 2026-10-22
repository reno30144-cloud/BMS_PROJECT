'use client';

import React, { useState, useEffect } from 'react';
import { Device } from '@/types/bems';
import {
  AlertTriangle,
  PhoneCall,
  MapPin,
  ShieldAlert,
  Radio,
  X,
  Clock,
  Building2,
  Navigation,
  ExternalLink,
  Volume2,
  VolumeX,
  Car,
  Compass,
  Flame,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { POLRESTA_HQ_POSITION, calculateDistanceKm } from '@/lib/geo-utils';
import { alarmAudio, SirenMode } from '@/lib/audio-alert';

interface EmergencyAlertModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReset: (device: Device) => void;
  onViewMap?: () => void;
}

export const EmergencyAlertModal: React.FC<EmergencyAlertModalProps> = ({
  device,
  isOpen,
  onClose,
  onOpenReset,
  onViewMap,
}) => {
  const [nowWib, setNowWib] = useState<string>('');
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [sirenMode, setSirenMode] = useState<SirenMode>('wail');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Subscribe to alarm audio state
  useEffect(() => {
    const unsubscribe = alarmAudio.subscribe((state) => {
      setSirenMode(state.mode);
      setIsMuted(state.isMuted);
    });
    return () => unsubscribe();
  }, []);

  // Update real-time clock & elapsed time
  useEffect(() => {
    const updateTime = () => {
      setNowWib(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );

      if (device?.lastTriggeredAt) {
        const diff = Math.max(0, Math.floor((Date.now() - new Date(device.lastTriggeredAt).getTime()) / 1000));
        setElapsedSec(diff);
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [device?.lastTriggeredAt]);

  if (!isOpen || !device) return null;

  // Koordinat bank & kalkulasi rute dari Mako Polresta
  const bankLat = device.bank?.latitude ?? -5.429;
  const bankLng = device.bank?.longitude ?? 105.261;
  const straightDist = calculateDistanceKm(POLRESTA_HQ_POSITION, [bankLat, bankLng]);
  const roadDistKm = Math.round(straightDist * 1.28 * 10) / 10;
  const etaMinutes = Math.max(2, Math.round((roadDistKm / 48) * 60));

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${POLRESTA_HQ_POSITION[0]},${POLRESTA_HQ_POSITION[1]}&destination=${bankLat},${bankLng}&travelmode=driving`;

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m > 0 ? `${m}m ` : ''}${s}s yang lalu`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Outer Tactical Alert Modal Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-2 border-red-500 overflow-hidden transform animate-in zoom-in-95 duration-200 text-slate-900 max-h-[94vh] flex flex-col">
        
        {/* Top Header: Solid Police Red Alert */}
        <div className="relative bg-red-600 text-white p-6 border-b border-red-700 overflow-hidden">
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {/* Radar Beacon Icon */}
              <div className="w-12 h-12 rounded-2xl bg-white text-red-600 flex items-center justify-center shadow-lg shadow-black/10 shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600 animate-bounce" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-800 text-white shadow-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    PERINGATAN DARURAT KRITIS
                  </span>
                  <span className="text-xs font-mono font-bold text-red-100 bg-red-700 px-2 py-0.5 rounded border border-red-500">
                    UID: {device.deviceUid}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white tracking-wide mt-1.5 flex items-center gap-2">
                  <span>SINYAL PANIC BUTTON TERVERIFIKASI</span>
                </h3>
                <p className="text-xs text-red-100 font-medium">
                  Pusat Komando SPKT • Polresta Bandar Lampung
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0 border border-white/20"
              title="Tutup Notifikasi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Siren Status & Audio Mode Controls */}
          <div className="relative z-10 mt-4 pt-3 border-t border-red-500/50 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            {/* Live Audio Visualizer */}
            <div className="flex items-center gap-2 text-white">
              <div className="flex items-end gap-1 h-3.5">
                <span className="w-1 bg-white rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-2.5" />
                <span className="w-1 bg-white rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3.5" />
                <span className="w-1 bg-white rounded-full animate-[pulse_0.3s_ease-in-out_infinite] h-2" />
                <span className="w-1 bg-white rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-3.5" />
              </div>
              <span className="font-semibold text-red-100 flex items-center gap-1.5 text-[11px]">
                <Volume2 className="w-3.5 h-3.5 text-white" />
                Sirene Polisi: <strong className="text-white uppercase font-mono">{sirenMode === 'wail' ? 'Wail (Panjang)' : 'Yelp (Cepat)'}</strong>
              </span>
            </div>

            {/* Siren Mode Switcher (Wail / Yelp) */}
            <div className="flex items-center gap-1.5 bg-red-700/80 p-1 rounded-xl border border-red-500/60">
              <button
                type="button"
                onClick={() => alarmAudio.setMode('wail')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  sirenMode === 'wail'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-red-100 hover:text-white'
                }`}
                title="Sirene Nada Panjang Patroli (Wail ~6.7s)"
              >
                🚓 Wail
              </button>
              <button
                type="button"
                onClick={() => alarmAudio.setMode('yelp')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  sirenMode === 'yelp'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-red-100 hover:text-white'
                }`}
                title="Sirene Cepat Respon Taktis (Yelp)"
              >
                🚨 Yelp
              </button>
              <button
                type="button"
                onClick={() => alarmAudio.setMuted(!isMuted)}
                className={`p-1 rounded-lg text-[10px] font-bold transition-all ${
                  isMuted ? 'bg-amber-400 text-slate-900' : 'text-red-100 hover:text-white'
                }`}
                title={isMuted ? 'Sirine Dibisukan' : 'Sirine Menyala'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: Clean Light Theme */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 bg-slate-50/60">
          
          {/* Main Bank Details Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                    {device.bank.code}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Terpicu: <strong className="text-red-600 font-mono">{formatElapsed(elapsedSec)}</strong>
                  </span>
                </div>
                <h4 className="text-xl font-black text-slate-900 mt-1.5 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-red-600 shrink-0" />
                  <span>{device.bank.name}</span>
                </h4>
                <p className="text-sm font-bold text-police-700 mt-0.5">
                  {device.bank.branchName}
                </p>
              </div>

              {/* Rute Navigasi Quick Badge */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-right shrink-0">
                <div className="flex items-center justify-end gap-1.5 text-red-700 text-xs font-bold font-mono">
                  <Car className="w-4 h-4 text-red-600" />
                  <span>{roadDistKm} KM dari Mako</span>
                </div>
                <div className="text-xs text-slate-700 font-semibold mt-1">
                  Estimasi Tiba: <strong className="text-slate-900">~{etaMinutes} Menit</strong>
                </div>
              </div>
            </div>

            {/* Grid Alamat & Telepon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3.5 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Lokasi Alamat Cabang:
                </span>
                <p className="text-slate-700 font-medium flex items-start gap-1.5 leading-relaxed">
                  <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{device.bank.address}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Hotline Darurat Teller / Cabang:
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${device.bank.emergencyContact.split('/')[0].trim()}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-sm font-bold font-mono transition-all hover:scale-[1.01] active:scale-95"
                    title="Klik untuk langsung memanggil nomor darurat"
                  >
                    <PhoneCall className="w-4 h-4 text-emerald-600" />
                    <span>{device.bank.emergencyContact}</span>
                  </a>
                </div>
                {device.bank.branchManager && (
                  <p className="text-[11px] text-slate-500">
                    Pimpinan Cabang: <span className="font-semibold text-slate-700">{device.bank.branchManager}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Sektor Wilayah */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-police-700" />
                Sektor Pengamanan: <strong className="text-slate-800">{device.bank.policeSector || 'Polresta Bandar Lampung'}</strong>
              </span>
              <span className="font-mono text-emerald-700 text-[11px] font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> SIAGA PENUH
              </span>
            </div>
          </div>

          {/* SOP Petugas SPKT */}
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1.5">
            <div className="font-bold flex items-center gap-2 text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Standar Operasional Prosedur (SOP) Operator SPKT:</span>
            </div>
            <ol className="list-decimal list-inside text-[11px] text-amber-900/90 space-y-1 pl-1 leading-relaxed">
              <li>Lakukan verifikasi instan dengan menekan tombol hotline darurat di atas.</li>
              <li>Kerahkan Unit Patroli Samapta / Sat Reskrim Polresta terdekat menuju titik koordinat.</li>
              <li>Buka rute GPS navigasi untuk memandu personel lapangan di jalan raya.</li>
              <li>Setelah situasi dipastikan aman terkendali, klik <strong>"Tangani & Reset Status"</strong> untuk menonaktifkan sirine.</li>
            </ol>
          </div>

          {/* Action Buttons Grid */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            {/* Tombol Utama: Tangani & Reset */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReset(device);
              }}
              className="w-full sm:flex-1 min-h-[46px] py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Tangani & Reset Status Insiden</span>
            </button>

            {/* Tombol Buka Rute Google Maps GPS */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto min-h-[46px] py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
              title="Buka rute Google Maps panduan turn-by-turn mengarah ke bank"
            >
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>Navigasi GPS ({roadDistKm} km)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>

            {/* Tombol Lihat Rute di Peta GIS */}
            {onViewMap && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewMap();
                }}
                className="w-full sm:w-auto min-h-[46px] py-3 px-3.5 rounded-xl bg-white hover:bg-slate-100 active:scale-95 text-slate-800 font-bold text-xs sm:text-sm border border-slate-300 flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-police-700" />
                <span>Peta Radar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-[46px] py-3 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm transition-colors shrink-0 cursor-pointer"
            >
              Tutup
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EmergencyAlertModal;


'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  WifiOff,
  Phone,
  MapPin,
  Clock,
  Wifi,
  BatteryCharging,
  RotateCcw,
  UserCheck,
  Trash2,
  Navigation,
  ExternalLink,
  Car,
  Flame,
  Edit3,
} from 'lucide-react';
import { Device } from '@/types/bems';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { EditBankModal } from '@/components/EditBankModal';
import { POLRESTA_HQ_POSITION, calculateDistanceKm } from '@/lib/geo-utils';

interface BankCardProps {
  device: Device;
  onReset: (device: Device) => void;
  onSimulateTrigger: (deviceUid: string) => void;
  onDelete?: (device: Device) => void;
  onRefresh?: () => void;
}

export const BankCard: React.FC<BankCardProps> = ({
  device,
  onReset,
  onSimulateTrigger,
  onDelete,
  onRefresh,
}) => {
  const { bank, status, lastHeartbeatAt, lastTriggeredAt, deviceUid, rssi, batteryLevel } = device;

  const [relativeTime, setRelativeTime] = useState<string>('Memeriksa...');
  const [exactTriggerTime, setExactTriggerTime] = useState<string>('-');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const updateRelative = () => {
      if (!lastHeartbeatAt) {
        setRelativeTime('-');
        return;
      }
      const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(lastHeartbeatAt).getTime()) / 1000));
      if (diffSeconds < 60) {
        setRelativeTime(`${diffSeconds} detik lalu`);
      } else {
        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) {
          setRelativeTime(`${diffMinutes} menit lalu`);
        } else {
          const diffHours = Math.floor(diffMinutes / 60);
          setRelativeTime(`${diffHours} jam lalu`);
        }
      }
    };

    updateRelative();
    const interval = setInterval(updateRelative, 5000);
    return () => clearInterval(interval);
  }, [lastHeartbeatAt]);

  useEffect(() => {
    if (!lastTriggeredAt) {
      setExactTriggerTime('-');
      return;
    }
    setExactTriggerTime(
      new Date(lastTriggeredAt).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB'
    );
  }, [lastTriggeredAt]);

  const isTriggered = status === 'TRIGGERED';
  const isOffline = status === 'OFFLINE';
  const isStandby = status === 'STANDBY';

  // Kalkulasi rute GPS dari Mako Polresta
  const bankLat = bank.latitude ?? -5.429;
  const bankLng = bank.longitude ?? 105.261;
  const straightDist = calculateDistanceKm(POLRESTA_HQ_POSITION, [bankLat, bankLng]);
  const roadDistKm = Math.round(straightDist * 1.28 * 10) / 10;
  const etaMinutes = Math.max(2, Math.round((roadDistKm / 48) * 60));
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${POLRESTA_HQ_POSITION[0]},${POLRESTA_HQ_POSITION[1]}&destination=${bankLat},${bankLng}&travelmode=driving`;

  return (
    <div
      className={`relative rounded-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden ${
        isTriggered
          ? 'bg-white border-2 border-red-500 shadow-xl shadow-red-500/20'
          : isOffline
          ? 'bg-slate-50 border border-slate-200/90 shadow-xs opacity-85 hover:opacity-100 hover:shadow-md'
          : 'bg-white border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-emerald-300'
      }`}
    >
      {/* Top Banner Ribbon for Triggered state */}
      {isTriggered && (
        <div className="bg-red-600 text-white text-xs font-black tracking-widest px-4 py-2 flex items-center justify-between uppercase border-b border-red-700 shadow-xs">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
            PERINGATAN BAHAYA TELLER AKTIF
          </span>
          <span className="font-mono text-red-100">{exactTriggerTime}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-5 sm:p-6">
        {/* Baris Meta Atas: UID & Status & Aksi */}
        <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-mono font-bold text-[#102A43] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 whitespace-nowrap">
              {deviceUid}
            </span>
            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
              • {bank.code}
            </span>
          </div>

          {/* Status Indicator Pill & Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isStandby && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300/80 shadow-xs whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping-slow"></span>
                STANDBY
              </span>
            )}
            {isTriggered && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-red-600 text-white shadow-md shadow-red-600/30 animate-bounce whitespace-nowrap">
                <AlertOctagon className="w-3.5 h-3.5" />
                BAHAYA
              </span>
            )}
            {isOffline && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                OFFLINE
              </span>
            )}

            <div className="flex items-center gap-1 pl-2 border-l border-slate-200 ml-1">
              {/* Tombol Edit Bank */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditModalOpen(true);
                }}
                className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-95"
                title={`Edit data ${bank.name} ${bank.branchName}`}
              >
                <Edit3 className="w-4 h-4" />
              </button>

              {/* Tombol Hapus (Trash2) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteModalOpen(true);
                  if (onDelete) onDelete(device);
                }}
                className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-95"
                title={`Hapus ${bank.name} ${bank.branchName}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Baris Identitas Bank: Logo & Nama Bank Bebas Terpotong */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center shrink-0 shadow-xs">
            <img
              src="/bank-marker.png"
              alt="Logo Bank"
              className={`w-full h-full object-contain filter transition-all ${
                isTriggered
                  ? 'hue-rotate(145deg) saturate(2) drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse'
                  : ''
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight" title={bank.name}>
              {bank.name}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-police-700 mt-0.5" title={bank.branchName}>
              {bank.branchName}
            </p>
          </div>
        </div>

        {/* Emergency Detail Banner if Triggered */}
        {isTriggered && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-4 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-red-900 font-bold uppercase tracking-wide">
                <Clock className="w-4 h-4 text-red-600 shrink-0" />
                <span>Terjadi: {exactTriggerTime}</span>
              </div>
              <div className="flex items-center gap-1 text-red-800 font-mono font-bold text-[11px]">
                <Car className="w-3.5 h-3.5 text-red-600" />
                <span>{roadDistKm} km (~{etaMinutes} min)</span>
              </div>
            </div>
            <p className="text-xs text-red-900/90 font-medium">
              Sinyal tombol darurat aktif di counter teller. Segera konfirmasi telepon cabang dan arahkan regu patroli.
            </p>
          </div>
        )}

        {/* Detail Alamat & Kontak */}
        <div className="space-y-2.5 text-xs text-slate-600 pt-1">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-relaxed">{bank.address}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
            <a
              href={`tel:${bank.emergencyContact.split('/')[0].trim()}`}
              className="font-mono font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              title="Klik untuk langsung memanggil kontak darurat"
            >
              {bank.emergencyContact}
            </a>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              Pimpinan: <strong className="text-slate-700">{bank.branchManager}</strong>
            </span>
            <span className="text-[#102A43] font-semibold">{bank.policeSector}</span>
          </div>
        </div>

        {/* Telemetry / Ping Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5" title="Detak jantung terakhir diterima server">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Ping: </span>
            <strong className={`${isOffline ? 'text-red-500 font-bold' : 'text-slate-700'}`}>
              {relativeTime}
            </strong>
          </div>

          <div className="flex items-center gap-3">
            {rssi && (
              <span className="flex items-center gap-1 text-slate-600 font-mono" title={`Kekuatan Sinyal Wi-Fi: ${rssi} dBm`}>
                <Wifi className="w-3.5 h-3.5 text-slate-400" />
                {rssi} dBm
              </span>
            )}
            {batteryLevel && (
              <span className="flex items-center gap-1 text-slate-600 font-mono" title={`Kapasitas Daya Alat: ${batteryLevel}%`}>
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
                {batteryLevel}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className={`p-3.5 sm:p-4 border-t flex items-center justify-between gap-2 ${
        isTriggered ? 'bg-red-100/70 border-red-200' : 'bg-slate-50/70 border-slate-100'
      }`}>
        {isTriggered ? (
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => onReset(device)}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] border border-red-400/40 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Tangani & Reset</span>
            </button>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold min-h-[44px] py-2.5 px-3.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all shrink-0 border border-slate-700 active:scale-95"
              title="Buka rute panduan navigasi Google Maps GPS"
            >
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>GPS</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        ) : (
          <>
            <button
              onClick={() => onSimulateTrigger(deviceUid)}
              title="Uji simulasi trigger bahaya"
              className="min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#102A43] bg-white hover:bg-slate-100 hover:text-slate-950 border border-slate-300 shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            >
              Tes Tombol
            </button>
            <span className="text-xs text-slate-500 font-semibold">
              {isStandby ? '✓ Monitoring Aktif' : '⚠️ Perlu Pengecekan'}
            </span>
          </>
        )}
      </div>

      {/* Modal Edit Data Bank */}
      <EditBankModal
        device={device}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* Modal Konfirmasi Hapus */}
      <DeleteConfirmModal
        device={device}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onRefresh={onRefresh}
        onSuccess={onRefresh}
      />
    </div>
  );
};

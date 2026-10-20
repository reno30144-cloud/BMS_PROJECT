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
} from 'lucide-react';
import { Device } from '@/types/bems';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';

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

  return (
    <div
      className={`relative rounded-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden ${
        isTriggered
          ? 'bg-red-50/90 border-2 border-red-500 shadow-2xl shadow-red-500/30 animate-emergency-pulse'
          : isOffline
          ? 'bg-slate-50 border border-slate-200/90 shadow-xs opacity-85 hover:opacity-100 hover:shadow-md'
          : 'bg-white border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-emerald-300'
      }`}
    >
      {/* Top Banner Ribbon for Triggered state */}
      {isTriggered && (
        <div className="bg-red-600 text-white text-xs font-black tracking-widest px-4 py-1.5 flex items-center justify-between uppercase">
          <span className="flex items-center gap-1.5 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
            PERINGATAN BAHAYA AKTIF
          </span>
          <span className="font-mono">{exactTriggerTime}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-6">
        {/* Header Kartu: Status Badge & Device UID */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {deviceUid}
              </span>
              <span className="text-xs font-semibold text-slate-400">• {bank.code}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
              {bank.name}
            </h3>
            <p className="text-sm font-semibold text-police-700">
              {bank.branchName}
            </p>
          </div>

          {/* Status Indicator Pill & Delete Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isStandby && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300/80 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping-slow"></span>
                STANDBY
              </span>
            )}
            {isTriggered && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-red-600 text-white shadow-lg shadow-red-600/40 animate-bounce">
                <AlertOctagon className="w-4 h-4" />
                TRIGGERED
              </span>
            )}
            {isOffline && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-600 border border-slate-300">
                <WifiOff className="w-3.5 h-3.5 text-slate-500" />
                OFFLINE
              </span>
            )}

            {/* Tombol Hapus (Trash2) di Sudut Kanan Atas */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleteModalOpen(true);
                if (onDelete) onDelete(device);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title={`Hapus ${bank.name} ${bank.branchName}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Emergency Detail Banner if Triggered */}
        {isTriggered && (
          <div className="bg-red-100/90 border border-red-300 rounded-xl p-3.5 mb-4">
            <div className="flex items-center gap-2 text-red-900 font-bold text-xs uppercase tracking-wide">
              <Clock className="w-4 h-4 text-red-600 shrink-0" />
              <span>Waktu Kejadian: {exactTriggerTime}</span>
            </div>
            <p className="text-xs text-red-800 mt-1">
              Tombol fisik panik ditekan di counter teller/keamanan. Segera lakukan verifikasi telepon dan koordinasikan unit patroli.
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
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-mono font-medium text-slate-700">{bank.emergencyContact}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              Pimpinan: <strong className="text-slate-700">{bank.branchManager}</strong>
            </span>
            <span className="text-police-700 font-medium">{bank.policeSector}</span>
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
      <div className={`p-4 border-t flex items-center justify-between gap-2 ${
        isTriggered ? 'bg-red-100/50 border-red-200' : 'bg-slate-50/70 border-slate-100'
      }`}>
        {isTriggered ? (
          <button
            onClick={() => onReset(device)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Tindak Lanjuti / Reset Status</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => onSimulateTrigger(deviceUid)}
              title="Uji simulasi trigger bahaya"
              className="text-[11px] font-semibold text-police-700 hover:text-police-900 hover:bg-white px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
            >
              Tes Tombol
            </button>
            <span className="text-[11px] text-slate-400 font-medium">
              {isStandby ? '✓ Monitoring Aktif' : '⚠️ Perlu Pengecekan'}
            </span>
          </>
        )}
      </div>

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

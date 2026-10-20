'use client';

import React from 'react';
import { Device } from '@/types/bems';
import { 
  AlertTriangle, 
  PhoneCall, 
  MapPin, 
  ShieldAlert, 
  Radio, 
  X, 
  CheckCircle2, 
  Clock, 
  Building2,
  Navigation,
  Volume2
} from 'lucide-react';

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
  if (!isOpen || !device) return null;

  const nowWib = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' WIB';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Outer Glow Wrapper */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl shadow-red-600/40 border-4 border-red-600 overflow-hidden transform animate-in zoom-in-95 duration-200">
        
        {/* Pulsing Top Alert Strip */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between border-b-2 border-red-500 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-red-600 flex items-center justify-center font-bold shadow-md">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                <h3 className="text-sm font-black uppercase tracking-wider">
                  🚨 PERINGATAN KRITIS: TOMBOL PANIK AKTIF!
                </h3>
              </div>
              <p className="text-xs text-red-100 font-medium mt-0.5">
                Sinyal fisik darurat diterima di Ruang Pantau SPKT Polresta
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-red-700/60 hover:bg-red-800 text-white flex items-center justify-center transition-colors"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 bg-gradient-to-b from-red-50/40 via-white to-slate-50">
          
          {/* Main Bank Emergency Card */}
          <div className="bg-white p-5 rounded-2xl border-2 border-red-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-red-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none"></div>

            <div className="flex items-start justify-between gap-4 pb-3 border-b border-red-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse">
                    🚨 BAHAYA AKTIF
                  </span>
                  <span className="text-xs font-mono font-bold text-red-600">
                    UID: {device.deviceUid}
                  </span>
                </div>
                <h4 className="text-xl font-black text-slate-900 mt-1.5 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-red-600 shrink-0" />
                  <span>{device.bank.name}</span>
                </h4>
                <p className="text-sm font-semibold text-slate-600">
                  {device.bank.branchName}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  WAKTU KEJADIAN
                </span>
                <span className="text-sm font-black font-mono text-red-600 flex items-center gap-1 justify-end mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  {nowWib}
                </span>
              </div>
            </div>

            {/* Emergency Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Alamat Cabang:
                </span>
                <p className="text-slate-700 font-medium flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span>{device.bank.address}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Kontak Darurat Cabang:
                </span>
                <p className="text-red-700 font-bold flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>{device.bank.emergencyContact}</span>
                </p>
                {device.bank.branchManager && (
                  <p className="text-[11px] text-slate-500 pl-5">
                    Pimpinan: <span className="font-semibold text-slate-700">{device.bank.branchManager}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Polsek Pembina Wilayah */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-police-700" />
                Sektor Pengamanan: <strong className="text-slate-800">{device.bank.policeSector || 'Polresta Bandar Lampung'}</strong>
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <Radio className="w-3 h-3 animate-ping" />
                Sirine Alarm Aktif
              </span>
            </div>
          </div>

          {/* SOP Respon Cepat */}
          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Instruksi SOP Operator SPKT / Piket Reskrim:</span>
            </div>
            <ol className="list-decimal list-inside text-[11px] text-amber-800 space-y-0.5 pl-1">
              <li>Hubungi nomor kontak darurat cabang bank di atas untuk verifikasi insiden.</li>
              <li>Instruksikan Regu Samapta / Sat Reskrim Polresta terdekat meluncur ke lokasi.</li>
              <li>Setelah situasi terkendali, klik <strong>Tindak Lanjut / Reset Status</strong> untuk mencatat audit insiden.</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReset(device);
              }}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Tindak Lanjut / Reset Status Insiden</span>
            </button>

            {onViewMap && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewMap();
                }}
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300 flex items-center justify-center gap-2 transition-all"
              >
                <Navigation className="w-4 h-4 text-police-700" />
                <span>Lihat di Peta</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors"
            >
              Tutup Popup
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EmergencyAlertModal;

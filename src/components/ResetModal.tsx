'use client';

import React, { useState } from 'react';
import { RotateCcw, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Device } from '@/types/bems';

interface ResetModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deviceUid: string, operatorName: string, notes: string) => Promise<void>;
  defaultOperatorName?: string;
}

export const ResetModal: React.FC<ResetModalProps> = ({
  device,
  isOpen,
  onClose,
  onConfirm,
  defaultOperatorName = 'Admin',
}) => {
  const [operatorName, setOperatorName] = useState(defaultOperatorName);
  const [notes, setNotes] = useState('Unit Patroli Samapta tiba di lokasi, situasi telah dipastikan aman terkendali.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (defaultOperatorName) {
      setOperatorName(defaultOperatorName);
    }
  }, [defaultOperatorName]);

  if (!isOpen || !device) return null;

  const quickTemplates = [
    'Unit Patroli Samapta tiba di lokasi, situasi telah dipastikan aman terkendali.',
    'Konfirmasi via telepon darurat: Tombol tersenggol tidak sengaja oleh teller.',
    'Uji coba simulasi kesiapsiagaan internal bank dan Polresta.',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm(device.deviceUid, operatorName, notes);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-police-950 text-white p-6 flex items-center justify-between border-b border-police-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Form Tindak Lanjut Insiden</h3>
              <p className="text-xs text-slate-300">Konfirmasi penyelesaian darurat perbankan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-police-900 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Bank Card Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Lokasi Bank:</span>
              <span className="font-mono font-bold text-police-700">{device.deviceUid}</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">{device.bank.name}</h4>
            <p className="text-xs text-slate-600">{device.bank.branchName}</p>
            <p className="text-[11px] text-slate-500 mt-1">{device.bank.address}</p>
          </div>

          {/* Form Operator Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Operator Penanggung Jawab
            </label>
            <input
              type="text"
              required
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-police-700 focus:border-police-700 bg-white"
              placeholder="Contoh: Admin SPKT"
            />
          </div>

          {/* Form Notes Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Catatan Disposisi & Penanganan Lapangan
            </label>
            <textarea
              required
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-police-700 focus:border-police-700 bg-white"
              placeholder="Jelaskan tindakan yang telah diambil petugas..."
            />
          </div>

          {/* Quick Notes Selector */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
              Pilihan Cepat Catatan:
            </span>
            <div className="space-y-1">
              {quickTemplates.map((template, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNotes(template)}
                  className="w-full text-left text-[11px] p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-amber-400 text-slate-700 hover:text-slate-900 transition-all truncate"
                >
                  • {template}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#102A43] hover:bg-[#163456] text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all border border-amber-400/30 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Selesaikan & Reset ke Standby</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

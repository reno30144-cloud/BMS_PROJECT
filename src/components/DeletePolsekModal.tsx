'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Server,
} from 'lucide-react';
import { PoliceStation } from '@/types/bems';

interface DeletePolsekModalProps {
  polsek: PoliceStation | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeletePolsekModal: React.FC<DeletePolsekModalProps> = ({
  polsek,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !polsek) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/v1/polsek?id=${encodeURIComponent(polsek.id)}`, {
        method: 'DELETE',
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal menghapus server polsek dari sistem.');
      }

      setSuccessMsg(`Kantor ${polsek.name} berhasil dihapus dari sistem.`);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccessMsg(null);
      }, 900);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error saat delete polsek:', error);
      setErrorMsg(error.message || 'Terjadi kesalahan sistem saat menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header Modal - Warning Red & Navy */}
        <div className="bg-[#102A43] text-white p-6 flex items-center justify-between border-b border-[#0D2338]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-500/15 flex items-center justify-center border border-red-500/30 text-red-400">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest uppercase text-red-400">
                  KONFIRMASI PENGHAPUSAN
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Hapus Simpul Server Polsek
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten & Peringatan */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Gagal Menghapus</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Berhasil Dihapus</p>
                <p className="mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Kartu Ringkasan Polsek yang Akan Dihapus */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                {polsek.code || 'POLSEK-NODE'}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <Server className="w-3 h-3 text-amber-600" />
                SIMPUL SERVER
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 leading-snug">
              {polsek.name}
            </h4>
            <div className="flex items-start gap-1.5 text-xs text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{polsek.address}</span>
            </div>
          </div>

          <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-3.5 text-xs text-red-900 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Tindakan ini akan <strong>menghapus simpul server</strong> dari sistem BEMS dan menghilangkan penanda radar lokasi Polsek pada peta GIS Polresta.
            </p>
          </div>

          {/* Tombol Aksi */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>Ya, Hapus Server Polsek</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeletePolsekModal;


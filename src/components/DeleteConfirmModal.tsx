'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  Loader2,
  Building2,
  Cpu,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Device } from '@/types/bems';

interface DeleteConfirmModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onRefresh?: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  device,
  isOpen,
  onClose,
  onSuccess,
  onRefresh,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !device) return null;

  const bankName = device.bank?.name || 'Bank Mitra';
  const branchName = device.bank?.branchName || 'Cabang';
  const bankId = device.bank?.id || device.bankId;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Operasi DELETE di Supabase
      // Bersihkan log terkait terlebih dahulu agar foreign key constraint tidak terkendala
      if (supabase && bankId) {
        try {
          const { data: devData } = await supabase
            .from('devices')
            .select('id')
            .eq('bank_id', bankId);
          if (devData && devData.length > 0) {
            const devIds = devData.map((d: any) => d.id);
            await supabase.from('emergency_logs').delete().in('device_id', devIds);
          }
        } catch (logErr) {
          console.warn('Catatan foreign key log Supabase:', logErr);
        }

        // Jalankan perintah delete di Supabase
        const { error } = await supabase
          .from('banks')
          .delete()
          .eq('id', bankId);

        if (error) {
          console.warn('Peringatan delete Supabase:', error.message);
        }
      }

      // 2. Sinkronisasi ke backend API route (menghapus di database server & in-memory store)
      try {
        await fetch(`/api/v1/devices?bankId=${encodeURIComponent(bankId)}`, {
          method: 'DELETE',
        });
      } catch (apiErr) {
        console.warn('Sync delete API route warning:', apiErr);
      }

      // 3. Panggil fungsi onRefresh / onSuccess seketika agar UI (Grid & Peta) langsung memuat ulang data terbaru
      if (onRefresh) {
        await onRefresh();
      }
      if (onSuccess) {
        await onSuccess();
      }

      // 4. Notifikasi Berhasil & Penutupan Modal
      setSuccessMsg(`Data ${bankName} (${branchName}) berhasil dihapus.`);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 400);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error handleDelete:', error);
      setErrorMsg(error.message || 'Terjadi kesalahan sistem saat menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-red-200/80 animate-in zoom-in-95 duration-200">
        {/* Header Peringatan Bahaya / Destructive Action */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-5 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 shadow-md">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-red-100">
                Tindakan Berisiko Tinggi
              </span>
              <h3 className="text-base font-bold text-white leading-tight">
                Hapus Bank Mitra & Perangkat
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-red-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Gagal Menghapus</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Penghapusan Berhasil</p>
                <p className="mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Warning Message Sesuai Persyaratan */}
          <div className="text-center pt-2 pb-1">
            <div className="w-14 h-14 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-3 text-red-600 shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-800 leading-relaxed">
              Apakah Anda yakin ingin menghapus data{' '}
              <span className="font-bold text-red-600">{bankName}</span> cabang{' '}
              <span className="font-bold text-red-600">{branchName}</span>?
            </p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Tindakan ini juga akan menghapus koneksi perangkat IoT secara permanen dari sistem BEMS Polresta Bandar Lampung.
            </p>
          </div>

          {/* Rincian Ringkas Data yang Akan Dihapus */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Kode Bank:
              </span>
              <span className="font-mono font-bold text-slate-800">{device.bank?.code}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 border-t border-slate-200/60 pt-1.5">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Cpu className="w-3.5 h-3.5 text-slate-400" />
                Device UID IoT:
              </span>
              <span className="font-mono font-bold text-slate-800">{device.deviceUid}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-semibold transition-all shadow-md hover:shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>Hapus Permanen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;

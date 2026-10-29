'use client';

import React, { useState } from 'react';
import { History, CheckCircle2, Clock, ShieldAlert, Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
import { EmergencyLog } from '@/types/bems';

interface IncidentHistoryViewProps {
  logs: EmergencyLog[];
  onClearLogs?: () => Promise<void> | void;
  canDelete?: boolean;
}

export const IncidentHistoryView: React.FC<IncidentHistoryViewProps> = ({
  logs,
  onClearLogs,
  canDelete = false,
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const formatTime = (iso?: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' WIB';
  };

  const handleConfirmClear = async () => {
    if (!onClearLogs || !canDelete) return;
    setIsClearing(true);
    try {
      await onClearLogs();
      setIsConfirmOpen(false);
    } catch (err) {
      console.error('Gagal membersihkan log:', err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Jejak Audit */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Jejak Audit & Log Insiden Darurat</h3>
          <p className="text-xs text-slate-500">
            Rekam jejak setiap sinyal panic button yang masuk dan disposisi penanganan oleh petugas SPKT Polresta
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono font-bold">
            {logs.length} Total Catatan
          </div>

          {/* Tombol Hapus Log: Hanya untuk Admin Command Center (Polsek Tidak Bisa Hapus Apapun) */}
          {logs.length > 0 && onClearLogs && canDelete && (
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isClearing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
              title="Bersihkan / Hapus semua riwayat catatan log insiden"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabel Riwayat Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Belum ada riwayat insiden darurat</p>
            <p className="text-xs text-slate-400 mt-1">
              Catatan log bersih. Setiap kali tombol bahaya ditekan, log insiden akan dicatat secara otomatis di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Status / Insiden</th>
                  <th className="py-3.5 px-4 sm:px-6">Objek Vital & Lokasi</th>
                  <th className="py-3.5 px-4 sm:px-6">Waktu Kejadian</th>
                  <th className="py-3.5 px-4 sm:px-6">Penyelesaian</th>
                  <th className="py-3.5 px-4 sm:px-6">Petugas Piket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isResolved = Boolean(log.resolvedAt);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 sm:px-6">
                        {isResolved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            SELESAI DITANGANI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 animate-pulse">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            SEDANG BERLANGSUNG
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-bold text-slate-900 text-sm">{log.bankName}</div>
                        <div className="text-police-700 font-medium">{log.branchName}</div>
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-slate-600 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatTime(log.triggeredAt)}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-slate-600">
                        {log.resolvedAt ? (
                          <div>
                            <div className="font-mono text-xs text-slate-800">
                              {formatTime(log.resolvedAt)}
                            </div>
                            {log.resolutionNotes && (
                              <div className="text-[11px] text-slate-500 italic mt-0.5">
                                "{log.resolutionNotes}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum direset</span>
                        )}
                      </td>

                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-semibold text-slate-800">
                          {log.operatorName || 'Petugas SPKT'}
                        </div>
                        <div className="text-[10px] text-slate-400">Command Center</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Bersihkan Semua Log */}
      {isConfirmOpen && canDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h4 className="text-base font-bold text-slate-900 mb-1">
              Bersihkan Seluruh Riwayat Log Insiden?
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Tindakan ini akan menghapus <strong>{logs.length} catatan log insiden</strong> secara permanen dari basis data sistem. Riwayat yang sudah dihapus tidak dapat dipulihkan kembali.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isClearing}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={isClearing}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 flex items-center gap-2 transition-all shadow-md shadow-red-600/30 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Ya, Bersihkan Log</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

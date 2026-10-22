'use client';

import React, { useState } from 'react';
import { History, CheckCircle2, Clock, ShieldAlert, Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
import { EmergencyLog } from '@/types/bems';

interface IncidentHistoryViewProps {
  logs: EmergencyLog[];
  onClearLogs?: () => Promise<void> | void;
}

export const IncidentHistoryView: React.FC<IncidentHistoryViewProps> = ({ logs, onClearLogs }) => {
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
    if (!onClearLogs) return;
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

          {logs.length > 0 && onClearLogs && (
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
          <>
            {/* Desktop Table View (Layar Komputer / Tablet Lebar) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Status & Bank</th>
                    <th className="px-6 py-4">Waktu Pemicu (Trigger)</th>
                    <th className="px-6 py-4">Waktu Penyelesaian</th>
                    <th className="px-6 py-4">Petugas SPKT</th>
                    <th className="px-6 py-4">Catatan Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {log.resolvedAt ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                          )}
                          <div>
                            <strong className="text-slate-900 block">{log.bankName}</strong>
                            <span className="text-[11px] text-slate-500">{log.branchName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-red-600">
                        {formatTime(log.triggeredAt)}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {log.resolvedAt ? (
                          <span className="text-emerald-700 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {formatTime(log.resolvedAt)}
                          </span>
                        ) : (
                          <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            PROSES
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {log.operatorName || '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={log.resolutionNotes || ''}>
                        {log.resolutionNotes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (Khusus Layar HP / Browser Ponsel) */}
            <div className="md:hidden divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          log.resolvedAt ? 'bg-emerald-500' : 'bg-red-600 animate-ping'
                        }`}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">{log.bankName}</h4>
                        <p className="text-xs text-slate-500 font-medium">{log.branchName}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        log.resolvedAt
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                      }`}
                    >
                      {log.resolvedAt ? 'SELESAI' : 'PROSES'}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Pemicu:</span>
                      <span className="font-mono font-bold text-red-600">{formatTime(log.triggeredAt)}</span>
                    </div>
                    {log.resolvedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Penyelesaian:</span>
                        <span className="font-mono font-semibold text-emerald-700">{formatTime(log.resolvedAt)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Petugas:</span>
                      <span className="font-semibold text-slate-800">{log.operatorName || '-'}</span>
                    </div>
                    {log.resolutionNotes && (
                      <div className="pt-1.5 border-t border-slate-200/60 text-slate-600">
                        <span className="font-semibold text-slate-500 block text-[11px]">Tindakan:</span>
                        <p className="mt-0.5 leading-relaxed">{log.resolutionNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Dialog Konfirmasi Pembersihan Log */}
      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isClearing && setIsConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Bersihkan Semua Log Insiden?
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan ini akan mengosongkan seluruh riwayat audit.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-5">
              Sebanyak <strong className="text-slate-900">{logs.length} catatan log insiden</strong> akan dihapus secara permanen dari basis data sistem BEMS Polresta. Data yang telah dihapus tidak dapat dipulihkan.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isClearing}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
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

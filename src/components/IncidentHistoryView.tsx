'use client';

import React from 'react';
import { History, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { EmergencyLog } from '@/types/bems';

interface IncidentHistoryViewProps {
  logs: EmergencyLog[];
}

export const IncidentHistoryView: React.FC<IncidentHistoryViewProps> = ({ logs }) => {
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Jejak Audit & Log Insiden Darurat</h3>
          <p className="text-xs text-slate-500">
            Rekam jejak setiap sinyal panic button yang masuk dan disposisi penanganan oleh petugas SPKT Polresta
          </p>
        </div>
        <div className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono font-bold">
          {logs.length} Total Catatan
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Belum ada riwayat insiden darurat</p>
            <p className="text-xs text-slate-400 mt-1">
              Setiap kali tombol bahaya ditekan, log insiden akan dicatat secara otomatis di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                      {log.resolutionNotes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

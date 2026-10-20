'use client';

import React, { useState } from 'react';
import { Search, Building2, MapPin, Phone, UserCheck, Shield } from 'lucide-react';
import { Device } from '@/types/bems';

interface DirectoryViewProps {
  devices: Device[];
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({ devices }) => {
  const [search, setSearch] = useState('');

  const filtered = devices.filter(
    (d) =>
      d.bank.name.toLowerCase().includes(search.toLowerCase()) ||
      d.bank.branchName.toLowerCase().includes(search.toLowerCase()) ||
      d.bank.address.toLowerCase().includes(search.toLowerCase()) ||
      d.deviceUid.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Direktori Bank Mitra Polresta</h3>
          <p className="text-xs text-slate-500">
            Daftar perbankan yang telah terpasang sistem panic button BEMS di wilayah Bandar Lampung
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama bank, cabang, atau UID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((d) => (
          <div
            key={d.id}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-police-700 bg-police-50 px-2.5 py-1 rounded-md border border-police-100">
                  {d.deviceUid}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    d.status === 'STANDBY'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : d.status === 'TRIGGERED'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {d.status}
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900">{d.bank.name}</h4>
              <p className="text-xs font-semibold text-police-700 mb-3">{d.bank.branchName}</p>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{d.bank.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono">{d.bank.emergencyContact}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Pimpinan: {d.bank.branchManager}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-police-700 font-medium">
                <Shield className="w-3.5 h-3.5" />
                {d.bank.policeSector}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

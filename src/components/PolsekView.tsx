'use client';

import React, { useState } from 'react';
import {
  Search,
  ShieldCheck,
  Server,
  MapPin,
  Compass,
  ExternalLink,
  Edit3,
  Trash2,
  PlusCircle,
} from 'lucide-react';
import { PoliceStation } from '@/types/bems';
import { EditPolsekModal } from '@/components/EditPolsekModal';
import { DeletePolsekModal } from '@/components/DeletePolsekModal';

interface PolsekViewProps {
  policeStations: PoliceStation[];
  onRefresh: () => void;
  onOpenAddPolsek: () => void;
}

export const PolsekView: React.FC<PolsekViewProps> = ({
  policeStations,
  onRefresh,
  onOpenAddPolsek,
}) => {
  const [search, setSearch] = useState('');
  const [editingPolsek, setEditingPolsek] = useState<PoliceStation | null>(null);
  const [deletingPolsek, setDeletingPolsek] = useState<PoliceStation | null>(null);

  const filtered = policeStations.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Aksi Cepat */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[#102A43] text-amber-400 flex items-center justify-center shadow-xs border border-amber-400/30">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Server Polsek Wilayah Hukum Polresta
            </h3>
            <span className="text-[10px] font-bold bg-amber-500/15 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300 font-mono">
              {policeStations.length} NODE
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Daftar simpul server kendali kepolisian sektor penanggung jawab pengawasan perbankan di Kota Bandar Lampung
          </p>
        </div>

        {/* Tombol Tambah & Kolom Pencarian */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={onOpenAddPolsek}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-police-900 hover:bg-police-850 text-white text-xs font-semibold transition-all shadow-xs hover:shadow-md active:scale-95 whitespace-nowrap border border-amber-400/30 cursor-pointer"
            title="Tambah Kantor Polsek Baru (Server Wilayah)"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>Tambah Server Polsek</span>
          </button>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama polsek, alamat..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Grid Kartu Kantor Polsek */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Tidak ada kantor polsek yang cocok</p>
          <p className="text-xs text-slate-400 mt-1">
            Coba gunakan kata kunci pencarian yang lain atau daftarkan kantor polsek baru.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((polsek) => (
            <div
              key={polsek.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header Kartu: Status & Badges */}
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <Server className="w-3 h-3 text-amber-600" />
                    SIMPUL SERVER
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      ONLINE
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {polsek.code || 'NODE'}
                    </span>
                  </div>
                </div>

                {/* Nama & Identitas */}
                <h4 className="text-base font-bold text-slate-900 leading-snug">
                  {polsek.name}
                </h4>
                <p className="text-xs font-semibold text-police-700 mb-3.5">
                  Kepolisian Sektor Wilayah Bandar Lampung
                </p>

                {/* Detail Lokasi & Geospasial */}
                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{polsek.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                    <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {polsek.latitude.toFixed(6)}, {polsek.longitude.toFixed(6)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Baris Tombol Aksi Lengkap: Maps, Edit, Hapus */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(
                    `${polsek.name} ${polsek.address}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-police-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                  title="Lihat titik lokasi di Google Maps"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Maps</span>
                </a>

                <div className="flex items-center gap-1.5">
                  {/* Tombol Edit */}
                  <button
                    type="button"
                    onClick={() => setEditingPolsek(polsek)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
                    title={`Edit data ${polsek.name}`}
                  >
                    <Edit3 className="w-3 h-3 text-blue-600" />
                    <span>Edit</span>
                  </button>

                  {/* Tombol Hapus */}
                  <button
                    type="button"
                    onClick={() => setDeletingPolsek(polsek)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                    title={`Hapus server ${polsek.name}`}
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Edit Polsek */}
      <EditPolsekModal
        polsek={editingPolsek}
        isOpen={Boolean(editingPolsek)}
        onClose={() => setEditingPolsek(null)}
        onSuccess={onRefresh}
      />

      {/* Modal Hapus Polsek */}
      <DeletePolsekModal
        polsek={deletingPolsek}
        isOpen={Boolean(deletingPolsek)}
        onClose={() => setDeletingPolsek(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
};

export default PolsekView;


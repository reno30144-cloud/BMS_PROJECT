'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Compass,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Edit3,
  ExternalLink,
  ShieldCheck,
  Server,
} from 'lucide-react';
import { PoliceStation } from '@/types/bems';

interface EditPolsekModalProps {
  polsek: PoliceStation | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
}

export const EditPolsekModal: React.FC<EditPolsekModalProps> = ({
  polsek,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState<FormState>({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sinkronkan form saat data polsek berganti
  useEffect(() => {
    if (polsek) {
      setForm({
        name: polsek.name || '',
        address: polsek.address || '',
        latitude: polsek.latitude !== undefined ? polsek.latitude.toString() : '-5.401200',
        longitude: polsek.longitude !== undefined ? polsek.longitude.toString() : '105.242500',
      });
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [polsek]);

  if (!isOpen || !polsek) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Penanganan input & paste cerdas koordinat (otomatis memecah "lat, lng" dari Google Maps)
  const handleCoordinateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value.includes(',') || value.includes(' ')) {
      const parts = value.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setForm((prev) => ({
            ...prev,
            latitude: parts[0],
            longitude: parts[1],
          }));
          return;
        }
      }
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Preset koordinat populer Polsek di Bandar Lampung
  const handleApplyPreset = (lat: string, lng: string) => {
    setForm((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!form.name.trim()) {
        throw new Error('Nama Polsek tidak boleh kosong.');
      }
      if (!form.address.trim()) {
        throw new Error('Alamat Polsek tidak boleh kosong.');
      }

      const lat = parseFloat(form.latitude);
      const lng = parseFloat(form.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Koordinat Latitude dan Longitude harus berupa angka desimal valid.');
      }

      const res = await fetch('/api/v1/polsek', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: polsek.id,
          name: form.name.trim(),
          address: form.address.trim(),
          latitude: lat,
          longitude: lng,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal memperbarui data polsek.');
      }

      setSuccessMsg(`Data ${form.name.trim()} berhasil diperbarui!`);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccessMsg(null);
      }, 900);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error saat update polsek:', error);
      setErrorMsg(error.message || 'Terjadi kesalahan sistem saat memperbarui data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 my-8">
        {/* Header Modal - Navy & Gold */}
        <div className="bg-[#102A43] text-white p-6 flex items-center justify-between border-b border-[#0D2338]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg border border-amber-400/40 text-amber-400">
              <Edit3 className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest uppercase text-amber-400">
                  EDIT SIMPUL SERVER
                </span>
                <span className="text-[10px] bg-white/10 text-slate-200 px-1.5 py-0.2 rounded border border-white/20 font-mono font-bold">
                  BEMS
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Edit Data {polsek.name}
              </h3>
              <p className="text-xs text-blue-200/80">
                Perbarui identitas dan titik koordinat server pengendali wilayah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifikasi Status Feedback */}
        {errorMsg && (
          <div className="mx-6 mt-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Gagal Memperbarui Data</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-800 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Pembaruan Berhasil</p>
              <p className="mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Form Edit Polsek */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section 1: Identitas Polsek */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Data Profil Kantor Polsek
              </h4>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Polsek <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Contoh: Polsek Tanjung Karang Barat"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Lengkap Kantor Polsek <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={2}
                placeholder="Contoh: Jl. Imam Bonjol No. 12, Kel. Gedong Air, Kota Bandar Lampung"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
                required
              />
            </div>
          </div>

          {/* Section 2: Koordinat Geografis */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. Koordinat Geografis (Peta GIS Radar)
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Pusat: Bandar Lampung
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Latitude (Lintang) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="latitude"
                    value={form.latitude}
                    onChange={handleCoordinateChange}
                    placeholder="-5.401200"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Longitude (Bujur) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="longitude"
                    value={form.longitude}
                    onChange={handleCoordinateChange}
                    placeholder="105.242500"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Panduan Akurasi Google Maps */}
            <div className="bg-sky-50 border border-sky-200/80 rounded-2xl p-3 text-xs text-sky-950 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-police-800 text-[11px]">
                  <span>🎯</span> Salin Koordinat dari Google Maps:
                </span>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(
                    form.name || 'Polsek Kota Bandar Lampung'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-police-700 hover:text-police-900 font-bold text-[10px] bg-white px-2 py-0.5 rounded-lg border border-sky-200 hover:border-police-400 transition-colors shadow-2xs"
                >
                  <ExternalLink className="w-3 h-3" />
                  Buka Google Maps
                </a>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Di Google Maps, <strong>klik kanan</strong> pada gedung kantor &gt; klik angka koordinat paling atas untuk meng-copy (contoh: <code className="bg-white text-police-700 px-1 py-0.5 rounded border border-sky-200 font-mono font-bold">-5.4012, 105.2425</code>), lalu <strong>paste langsung</strong> ke kolom Latitude di atas.
              </p>
            </div>

            {/* Quick Coordinate Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
              <span className="font-medium">Preset cepat:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('-5.401200', '105.242500')}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                Tj. Karang Barat
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('-5.378900', '105.263500')}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                Kedaton
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('-5.448000', '105.268000')}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                Teluk Betung
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('-5.385000', '105.302000')}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                Sukarame
              </button>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#102A43] hover:bg-[#163456] text-white text-xs font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 active:scale-95 border border-amber-400/30 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Menyimpan Perubahan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Simpan Perubahan Polsek</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPolsekModal;


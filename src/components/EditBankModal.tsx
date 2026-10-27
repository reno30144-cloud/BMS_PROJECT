'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  MapPin,
  Cpu,
  Phone,
  Compass,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Edit3,
  UserCheck,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { Device } from '@/types/bems';

interface EditBankModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  name: string;
  branch: string;
  code: string;
  address: string;
  phone: string;
  branchManager: string;
  policeSector: string;
  latitude: string;
  longitude: string;
  deviceUid: string;
}

export const EditBankModal: React.FC<EditBankModalProps> = ({
  device,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState<FormState>({
    name: '',
    branch: '',
    code: '',
    address: '',
    phone: '',
    branchManager: 'Pimpinan Cabang',
    policeSector: 'Polresta Bandar Lampung',
    latitude: '',
    longitude: '',
    deviceUid: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Isi data form saat modal dibuka dengan data perangkat yang dipilih
  useEffect(() => {
    if (device && isOpen) {
      setForm({
        name: device.bank.name || '',
        branch: device.bank.branchName || '',
        code: device.bank.code || '',
        address: device.bank.address || '',
        phone: device.bank.emergencyContact || '',
        branchManager: device.bank.branchManager || 'Pimpinan Cabang',
        policeSector: device.bank.policeSector || 'Polresta Bandar Lampung',
        latitude: device.bank.latitude !== undefined && device.bank.latitude !== null ? String(device.bank.latitude) : '',
        longitude: device.bank.longitude !== undefined && device.bank.longitude !== null ? String(device.bank.longitude) : '',
        deviceUid: device.deviceUid || '',
      });
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [device, isOpen]);

  if (!isOpen || !device) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

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
      if (
        !form.name.trim() ||
        !form.branch.trim() ||
        !form.address.trim() ||
        !form.phone.trim() ||
        !form.deviceUid.trim()
      ) {
        throw new Error('Harap lengkapi semua kolom wajib bertanda bintang (*).');
      }

      const lat = form.latitude ? parseFloat(form.latitude) : undefined;
      const lng = form.longitude ? parseFloat(form.longitude) : undefined;

      if (lat !== undefined && isNaN(lat)) {
        throw new Error('Koordinat Latitude harus berupa angka desimal valid.');
      }
      if (lng !== undefined && isNaN(lng)) {
        throw new Error('Koordinat Longitude harus berupa angka desimal valid.');
      }

      const res = await fetch('/api/v1/devices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankId: device.bank.id || device.bankId,
          ...form,
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Gagal memperbarui data bank mitra.');
      }

      setSuccessMsg('Data bank dan perangkat IoT berhasil diperbarui!');
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccessMsg(null);
      }, 800);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error update bank:', error);
      setErrorMsg(error.message || 'Terjadi kesalahan sistem saat memperbarui data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-6 border-b border-[#0D2338] flex items-center justify-between bg-[#102A43] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-md">
              <Edit3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Edit Data Bank Mitra</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-mono font-bold">
                  {device.deviceUid}
                </span>
              </h3>
              <p className="text-xs text-blue-200/80">
                Ubah informasi bank, kontak darurat teller, alamat, dan koordinat GPS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-police-800/60 hover:bg-police-800 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Tutup (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Banner Error / Sukses */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section: Identitas Bank */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Bank <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Contoh: BANK MANDIRI"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Kantor Cabang <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="branch"
                required
                value={form.branch}
                onChange={handleChange}
                placeholder="Contoh: KCP Tanjungkarang Kartini"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              UID Hardware Panic Button <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Cpu className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="deviceUid"
                required
                value={form.deviceUid}
                onChange={handleChange}
                placeholder="Contoh: ESPC32-B"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 font-mono uppercase font-bold text-police-700"
              />
            </div>
          </div>

          {/* Section: Kontak & Wilayah */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor Telepon Darurat <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="phone"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="0857xxxxxxxx / 0721-xxxx"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pimpinan Cabang
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="branchManager"
                  value={form.branchManager}
                  onChange={handleChange}
                  placeholder="Nama Pimpinan"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Wilayah Polsek
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="policeSector"
                  value={form.policeSector}
                  onChange={handleChange}
                  placeholder="Polsek Wilayah"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700"
                />
              </div>
            </div>
          </div>

          {/* Section: Alamat Lengkap */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alamat Lengkap Kantor Bank <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                name="address"
                required
                rows={2}
                value={form.address}
                onChange={handleChange}
                placeholder="Jl. Kartini No. 79, Tanjung Karang, Bandar Lampung..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 leading-relaxed"
              />
            </div>
          </div>

          {/* Section: Titik Koordinat GPS */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-600" />
                <span>Titik Koordinat GPS (Latitude & Longitude)</span>
              </span>
              <span className="text-[10px] text-slate-400">Peta & Navigasi Polisi</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Latitude</label>
                <input
                  type="text"
                  name="latitude"
                  value={form.latitude}
                  onChange={handleCoordinateChange}
                  placeholder="-5.421690"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white focus:ring-1 focus:ring-police-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Longitude</label>
                <input
                  type="text"
                  name="longitude"
                  value={form.longitude}
                  onChange={handleCoordinateChange}
                  placeholder="105.253298"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white focus:ring-1 focus:ring-police-700"
                />
              </div>
            </div>

            {/* Panduan Akurasi Presisi */}
            <div className="bg-sky-50 border border-sky-200/80 rounded-xl p-2.5 text-xs text-sky-950 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-police-800 text-[10px] flex items-center gap-1">
                  <span>🎯</span> Cara Pin 100% Presisi di Google Maps:
                </span>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(
                    form.name ? `${form.name} ${form.branch}` : 'Bandar Lampung'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-police-700 hover:text-police-900 font-bold text-[10px] bg-white px-2 py-0.5 rounded border border-sky-200 hover:border-police-400 transition-colors shadow-2xs"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  Buka Maps
                </a>
              </div>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                <strong>Klik kanan</strong> tepat di atap gedung bank &gt; klik angka koordinat untuk copy (contoh: <code className="bg-white text-police-700 px-1 py-0.2 rounded font-mono font-bold">-5.42169, 105.25330</code>), lalu <strong>paste langsung</strong> ke kolom Latitude di atas.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="text-slate-400 font-semibold mr-1">Preset Cepat:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('-5.414800', '105.254800')}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 cursor-pointer"
              >
                Tj. Karang Kartini
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('-5.419800', '105.258500')}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 cursor-pointer"
              >
                Raden Intan
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('-5.448500', '105.266200')}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 cursor-pointer"
              >
                Teluk Betung
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('-5.385200', '105.260500')}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 cursor-pointer"
              >
                Kedaton
              </button>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#102A43] hover:bg-[#163456] border border-amber-400/30 flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Menyimpan Perubahan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

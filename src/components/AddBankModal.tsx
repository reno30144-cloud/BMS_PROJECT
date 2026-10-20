'use client';

import React, { useState } from 'react';
import {
  X,
  Building2,
  MapPin,
  Cpu,
  Phone,
  Hash,
  Compass,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Radio,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AddBankModalProps {
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
  latitude: string;
  longitude: string;
  deviceUid: string;
}

const initialForm: FormState = {
  name: '',
  branch: '',
  code: '',
  address: '',
  phone: '',
  latitude: '-5.429000',
  longitude: '105.261000',
  deviceUid: '',
};

export const AddBankModal: React.FC<AddBankModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Preset koordinat populer di Bandar Lampung
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
      // 1. Validasi Input Form
      if (
        !form.name.trim() ||
        !form.branch.trim() ||
        !form.code.trim() ||
        !form.address.trim() ||
        !form.phone.trim() ||
        !form.deviceUid.trim()
      ) {
        throw new Error('Harap lengkapi semua kolom wajib bertanda bintang (*).');
      }

      const lat = form.latitude ? parseFloat(form.latitude) : -5.429;
      const lng = form.longitude ? parseFloat(form.longitude) : 105.261;

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Koordinat Latitude dan Longitude harus berupa angka yang valid.');
      }

      let bankId: string | null = null;

      // 2. Operasi INSERT Berurutan ke Supabase
      if (supabase) {
        // Operasi 1: INSERT ke tabel `banks`
        const { data: bankData, error: bankError } = await supabase
          .from('banks')
          .insert({
            name: form.name.trim(),
            branch_name: form.branch.trim(),
            code: form.code.trim().toUpperCase(),
            address: form.address.trim(),
            emergency_contact: form.phone.trim(),
            latitude: lat,
            longitude: lng,
          })
          .select('id')
          .single();

        if (bankError) {
          throw new Error(`Gagal menyimpan data bank ke Supabase: ${bankError.message}`);
        }

        if (!bankData || !bankData.id) {
          throw new Error('Gagal mendapatkan UUID bank dari Supabase.');
        }

        bankId = bankData.id;

        // Operasi 2: INSERT ke tabel `devices` (terhubung via bank_id)
        const dummyAuthToken = `bems_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
        const { error: deviceError } = await supabase
          .from('devices')
          .insert({
            bank_id: bankId,
            device_uid: form.deviceUid.trim().toUpperCase(),
            auth_token: dummyAuthToken,
            status: 'OFFLINE',
          });

        if (deviceError) {
          throw new Error(`Gagal mendaftarkan perangkat IoT ke Supabase: ${deviceError.message}`);
        }
      }

      // Sinkronisasi pendukung ke API backend lokal
      try {
        await fetch('/api/v1/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } catch (syncErr) {
        console.warn('Sync API background warning:', syncErr);
      }

      // 3. Notifikasi Berhasil & Penutupan Otomatis
      setSuccessMsg('Bank Mitra dan Perangkat IoT berhasil ditambahkan ke BEMS!');
      setTimeout(() => {
        onSuccess();
        onClose();
        setForm(initialForm);
        setSuccessMsg(null);
      }, 1000);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error saat submit AddBankModal:', error);
      setErrorMsg(error.message || 'Terjadi kesalahan sistem saat menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 my-8">
        {/* Header Modal - Hijau Gelap Kepolisian */}
        <div className="bg-police-950 text-white p-6 flex items-center justify-between border-b border-police-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-police-700 flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-emerald-400/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest uppercase text-emerald-400">
                  REGISTRASI OBJEK VITAL
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-400/30 font-mono">
                  BEMS IOT
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Tambah Bank Mitra & Perangkat IoT
              </h3>
              <p className="text-xs text-slate-300">
                Hubungkan unit cabang perbankan dengan modul alarm ESP32-C3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifikasi Status Feedback */}
        {errorMsg && (
          <div className="mx-6 mt-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Gagal Mendaftarkan Data</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-800 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Registrasi Berhasil</p>
              <p className="mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Form Isi Data */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section 1: Data Bank */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Data Profil Bank Mitra
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Bank <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Contoh: Bank Mandiri / BRI / BCA"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kantor Cabang / Unit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="branch"
                  value={form.branch}
                  onChange={handleChange}
                  placeholder="Contoh: KC Kedaton / KCP Antasari"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kode Bank <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    placeholder="Contoh: B-004 / MANDIRI-KDT"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono uppercase text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kontak Darurat Cabang <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Contoh: 0721-701234 / 0812-7890-1234"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Lengkap Kantor <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={2}
                placeholder="Contoh: Jl. Teuku Umar No. 88, Kedaton, Kota Bandar Lampung"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
                required
              />
            </div>
          </div>

          {/* Section 2: Data Geografis (GIS) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-600" />
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
                    onChange={handleChange}
                    placeholder="-5.429000"
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
                    onChange={handleChange}
                    placeholder="105.261000"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Quick Coordinate Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 pt-1">
              <span className="font-medium">Preset cepat:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('-5.429000', '105.261000')}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              >
                Pusat BDL (-5.429, 105.261)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('-5.419800', '105.258500')}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              >
                Tj. Karang (-5.419, 105.258)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('-5.448500', '105.266200')}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              >
                Teluk Betung (-5.448, 105.266)
              </button>
            </div>
          </div>

          {/* Section 3: Data IoT ESP32-C3 */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Cpu className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Integrasi Perangkat IoT Panic Button
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Device UID (ID Alat / MAC) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Radio className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="deviceUid"
                    value={form.deviceUid}
                    onChange={handleChange}
                    placeholder="Contoh: ESP32C3-BDL-007"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono uppercase text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  ID unik yang ditanam pada firmware ESP32-C3 di meja teller.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Status Default Perangkat
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span className="font-semibold text-slate-700">OFFLINE</span>
                  <span className="text-[10px] text-slate-500 ml-auto">
                    Siap Menerima Ping
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Status otomatis berganti STANDBY saat menerima heartbeat pertama.
                </p>
              </div>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-police-900 hover:bg-police-800 text-white text-xs font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 active:scale-95 border border-emerald-500/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Menyimpan ke Supabase...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Daftarkan Bank & Perangkat</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBankModal;

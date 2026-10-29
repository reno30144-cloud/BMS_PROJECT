'use client';

import React, { useState } from 'react';
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
  Radio,
  ExternalLink,
  ShieldCheck,
  Server,
} from 'lucide-react';

interface AddBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BankFormState {
  name: string;
  branch: string;
  address: string;
  phone: string;
  latitude: string;
  longitude: string;
  deviceUid: string;
}

interface PolsekFormState {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
}

const initialBankForm: BankFormState = {
  name: '',
  branch: '',
  address: '',
  phone: '',
  latitude: '-5.429000',
  longitude: '105.261000',
  deviceUid: '',
};

const initialPolsekForm: PolsekFormState = {
  name: '',
  address: '',
  latitude: '-5.401200',
  longitude: '105.242500',
};

export const AddBankModal: React.FC<AddBankModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Pilihan tipe data yang ingin ditambahkan: Bank Mitra atau Kantor Polsek
  const [entityType, setEntityType] = useState<'BANK' | 'POLSEK'>('BANK');

  // Form State terpisah
  const [bankForm, setBankForm] = useState<BankFormState>(initialBankForm);
  const [polsekForm, setPolsekForm] = useState<PolsekFormState>(initialPolsekForm);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handler form bank
  const handleBankChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setBankForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handler form polsek
  const handlePolsekChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPolsekForm((prev) => ({ ...prev, [name]: value }));
  };

  // Penanganan input & paste cerdas koordinat Bank
  const handleBankCoordinateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value.includes(',') || value.includes(' ')) {
      const parts = value.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setBankForm((prev) => ({
            ...prev,
            latitude: parts[0],
            longitude: parts[1],
          }));
          return;
        }
      }
    }
    setBankForm((prev) => ({ ...prev, [name]: value }));
  };

  // Penanganan input & paste cerdas koordinat Polsek
  const handlePolsekCoordinateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value.includes(',') || value.includes(' ')) {
      const parts = value.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setPolsekForm((prev) => ({
            ...prev,
            latitude: parts[0],
            longitude: parts[1],
          }));
          return;
        }
      }
    }
    setPolsekForm((prev) => ({ ...prev, [name]: value }));
  };

  // Preset koordinat populer Bank di Bandar Lampung
  const handleApplyBankPreset = (lat: string, lng: string) => {
    setBankForm((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  // Preset koordinat Polsek di Bandar Lampung
  const handleApplyPolsekPreset = (name: string, lat: string, lng: string, address: string) => {
    setPolsekForm({
      name,
      address,
      latitude: lat,
      longitude: lng,
    });
  };

  // Submit Bank
  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (
        !bankForm.name.trim() ||
        !bankForm.branch.trim() ||
        !bankForm.address.trim() ||
        !bankForm.phone.trim() ||
        !bankForm.deviceUid.trim()
      ) {
        throw new Error('Harap lengkapi semua kolom wajib bertanda bintang (*).');
      }

      const lat = bankForm.latitude ? parseFloat(bankForm.latitude) : -5.429;
      const lng = bankForm.longitude ? parseFloat(bankForm.longitude) : 105.261;

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Koordinat Latitude dan Longitude harus berupa angka yang valid.');
      }

      const res = await fetch('/api/v1/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankForm),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Gagal mendaftarkan bank mitra ke server.');
      }

      setSuccessMsg('Bank Mitra dan Perangkat IoT berhasil ditambahkan ke BEMS!');
      setTimeout(() => {
        onSuccess();
        onClose();
        setBankForm(initialBankForm);
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

  // Submit Polsek (Hanya Nama, Alamat, dan Titik Koordinat karena Polsek memegang server)
  const handlePolsekSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!polsekForm.name.trim()) {
        throw new Error('Harap masukkan nama kantor polsek.');
      }
      if (!polsekForm.address.trim()) {
        throw new Error('Harap masukkan alamat lengkap kantor polsek.');
      }

      const lat = polsekForm.latitude ? parseFloat(polsekForm.latitude) : -5.4012;
      const lng = polsekForm.longitude ? parseFloat(polsekForm.longitude) : 105.2425;

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Koordinat Latitude dan Longitude harus berupa angka yang valid.');
      }

      const res = await fetch('/api/v1/polsek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: polsekForm.name.trim(),
          address: polsekForm.address.trim(),
          latitude: lat,
          longitude: lng,
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Gagal mendaftarkan kantor polsek ke server.');
      }

      setSuccessMsg(`Kantor ${polsekForm.name.trim()} berhasil didaftarkan sebagai Server Wilayah BEMS!`);
      setTimeout(() => {
        onSuccess();
        onClose();
        setPolsekForm(initialPolsekForm);
        setSuccessMsg(null);
      }, 1000);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error saat submit Polsek:', error);
      setErrorMsg(error.message || 'Terjadi kesalahan sistem saat menyimpan data Polsek.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 my-8">
        {/* Header Modal */}
        <div className="bg-[#102A43] text-white p-6 flex items-center justify-between border-b border-[#0D2338]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg border border-amber-400/40 text-amber-400 transition-all">
              {entityType === 'BANK' ? (
                <Building2 className="w-6 h-6 text-amber-400" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest uppercase text-amber-400">
                  {entityType === 'BANK' ? 'REGISTRASI OBJEK VITAL' : 'REGISTRASI SIMPUL SERVER'}
                </span>
                <span className="text-[10px] bg-white/10 text-slate-200 px-1.5 py-0.2 rounded border border-white/20 font-mono font-bold">
                  BEMS
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {entityType === 'BANK'
                  ? 'Tambah Bank Mitra & Perangkat IoT'
                  : 'Tambah Kantor Polsek (Server Wilayah)'}
              </h3>
              <p className="text-xs text-blue-200/80">
                {entityType === 'BANK'
                  ? 'Hubungkan unit cabang perbankan dengan modul alarm teller ESP32-C3'
                  : 'Daftarkan simpul server pengendali Polsek untuk pengawasan wilayah'}
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

        {/* Pemilih Kategori: Bank atau Polsek */}
        <div className="px-6 pt-5 pb-1 bg-slate-50/70 border-b border-slate-100">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Pilih Entitas yang Ingin Ditambahkan:
          </p>
          <div className="p-1 bg-slate-200/70 rounded-2xl flex gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setEntityType('BANK');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                entityType === 'BANK'
                  ? 'bg-[#102A43] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Building2 className={`w-4 h-4 ${entityType === 'BANK' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>1. Bank Mitra & IoT</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEntityType('POLSEK');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                entityType === 'POLSEK'
                  ? 'bg-[#102A43] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${entityType === 'POLSEK' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>2. Kantor Polsek (Server)</span>
            </button>
          </div>
        </div>

        {/* Notifikasi Status Feedback */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Gagal Mendaftarkan Data</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-800 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Registrasi Berhasil</p>
              <p className="mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {/* FORM 1: PENDAFTARAN BANK MITRA */}
        {entityType === 'BANK' ? (
          <form onSubmit={handleBankSubmit} className="p-6 space-y-6">
            {/* Section 1: Data Bank */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Building2 className="w-4 h-4 text-amber-600" />
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
                    value={bankForm.name}
                    onChange={handleBankChange}
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
                    value={bankForm.branch}
                    onChange={handleBankChange}
                    placeholder="Contoh: KC Kedaton / KCP Antasari"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
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
                    value={bankForm.phone}
                    onChange={handleBankChange}
                    placeholder="Contoh: 0721-701234 / 0812-7890-1234"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Alamat Lengkap Kantor <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  value={bankForm.address}
                  onChange={handleBankChange}
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
                      value={bankForm.latitude}
                      onChange={handleBankCoordinateChange}
                      placeholder="-5.421690"
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
                      value={bankForm.longitude}
                      onChange={handleBankCoordinateChange}
                      placeholder="105.253298"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Panduan Akurasi & Bantuan Google Maps */}
              <div className="bg-sky-50 border border-sky-200/80 rounded-2xl p-3 text-xs text-sky-950 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-police-800 text-[11px]">
                    <span>🎯</span> Cara Agar Pin 100% Tepat di Atas Gedung:
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(
                      bankForm.name ? `${bankForm.name} ${bankForm.branch}` : 'Bandar Lampung'
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
                  Di Google Maps, <strong>klik kanan</strong> tepat di gedung bank &gt; klik angka koordinat paling atas untuk meng-copy (contoh: <code className="bg-white text-police-700 px-1 py-0.5 rounded border border-sky-200 font-mono font-bold">-5.42169, 105.25330</code>), lalu <strong>paste langsung</strong> ke kolom Latitude di atas.
                </p>
              </div>

              {/* Quick Coordinate Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                <span className="font-medium">Preset cepat:</span>
                <button
                  type="button"
                  onClick={() => handleApplyBankPreset('-5.429000', '105.261000')}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  Pusat BDL (-5.429, 105.261)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyBankPreset('-5.419800', '105.258500')}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  Tj. Karang (-5.419, 105.258)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyBankPreset('-5.448500', '105.266200')}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  Teluk Betung (-5.448, 105.266)
                </button>
              </div>
            </div>

            {/* Section 3: Data IoT ESP32-C3 */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Cpu className="w-4 h-4 text-amber-600" />
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
                      value={bankForm.deviceUid}
                      onChange={handleBankChange}
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

            {/* Tombol Aksi Form Bank */}
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
                    <span>Menyimpan ke Server...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Daftarkan Bank & Perangkat</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* FORM 2: PENDAFTARAN KANTOR POLSEK (SERVER WILAYAH) */
          /* Sesuai spesifikasi: Hanya mengisi Nama Polsek, Alamat, dan Titik Koordinat karena Polsek memegang server */
          <form onSubmit={handlePolsekSubmit} className="p-6 space-y-6">
            {/* Banner Informasi Simpul Server Polsek dengan Aksen Gold BEMS */}
            <div className="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3.5 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-[#102A43] text-amber-400 flex items-center justify-center shrink-0 shadow-sm mt-0.5 border border-amber-400/40">
                <Server className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-xs text-slate-700 flex-1 leading-relaxed">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-900 text-[13px]">
                    Simpul Server Kepolisian Sektor (Polsek)
                  </span>
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                    SERVER
                  </span>
                </div>
                Kantor Polsek bertindak sebagai <strong className="text-slate-900 font-semibold">simpul server wilayah</strong> untuk menerima sinyal BEMS dari perbankan mitra di wilayah hukumnya. Kantor Polsek tidak memerlukan registrasi perangkat tombol darurat IoT.
              </div>
            </div>

            {/* 1. Nama & Alamat Polsek */}
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
                  value={polsekForm.name}
                  onChange={handlePolsekChange}
                  placeholder="Contoh: Polsek Tanjung Karang Barat"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Nama kesatuan kepolisian sektor di bawah yurisdiksi Polresta Bandar Lampung.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Alamat Lengkap Kantor Polsek <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  value={polsekForm.address}
                  onChange={handlePolsekChange}
                  rows={2}
                  placeholder="Contoh: Jl. Imam Bonjol No. 12, Kel. Gedong Air, Kec. Tanjung Karang Barat, Kota Bandar Lampung"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 transition-all shadow-xs"
                  required
                />
              </div>
            </div>

            {/* 2. Titik Koordinat Geografis */}
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
                      value={polsekForm.latitude}
                      onChange={handlePolsekCoordinateChange}
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
                      value={polsekForm.longitude}
                      onChange={handlePolsekCoordinateChange}
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
                    <span>🎯</span> Cara Agar Pin 100% Tepat di Atas Gedung:
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(
                      polsekForm.name || 'Polsek Kota Bandar Lampung'
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
                  Di Google Maps, <strong>klik kanan</strong> tepat di gedung kantor &gt; klik angka koordinat paling atas untuk meng-copy (contoh: <code className="bg-white text-police-700 px-1 py-0.5 rounded border border-sky-200 font-mono font-bold">-5.4012, 105.2425</code>), lalu <strong>paste langsung</strong> ke kolom Latitude di atas.
                </p>
              </div>

              {/* Preset cepat Polsek di Bandar Lampung */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Preset Cepat:
                </span>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPolsekPreset(
                        'Polsek Tanjung Karang Barat',
                        '-5.401200',
                        '105.242500',
                        'Jl. Imam Bonjol No. 12, Kel. Gedong Air, Kec. Tanjung Karang Barat, Kota Bandar Lampung'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Tj. Karang Barat
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPolsekPreset(
                        'Polsek Kedaton',
                        '-5.378900',
                        '105.263500',
                        'Jl. Teuku Umar No. 1, Kedaton, Kec. Kedaton, Kota Bandar Lampung'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Kedaton
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPolsekPreset(
                        'Polsek Teluk Betung Selatan',
                        '-5.448000',
                        '105.268000',
                        'Jl. Basuki Rahmat No. 1, Teluk Betung, Kota Bandar Lampung'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Teluk Betung Selatan
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPolsekPreset(
                        'Polsek Sukarame',
                        '-5.385000',
                        '105.302000',
                        'Jl. Ryacudu No. 8, Kec. Sukarame, Kota Bandar Lampung'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Sukarame
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPolsekPreset(
                        'Polsek Kemiling',
                        '-5.392000',
                        '105.221000',
                        'Jl. Pramuka No. 10, Kec. Kemiling, Kota Bandar Lampung'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Kemiling
                  </button>
                </div>
              </div>
            </div>

            {/* Tombol Aksi Form Polsek */}
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
                    <span>Menyimpan ke Server...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Daftarkan Kantor Polsek (Server)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddBankModal;

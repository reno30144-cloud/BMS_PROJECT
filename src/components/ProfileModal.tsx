'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  Mail,
  BadgeCheck,
  Building,
  Clock,
  Radio,
  Info,
  LogOut,
  Edit3,
  Check,
  Cpu,
  Wifi,
  Code2,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  Award,
} from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  operatorName: string;
  operatorRole?: string;
  operatorEmail?: string;
  onUpdateName?: (newName: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  operatorName,
  operatorRole = 'Operator Piket SPKT',
  operatorEmail = 'admin@polresta.id',
  onUpdateName,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'about'>('profile');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(operatorName);
  const [currentSessionTime, setCurrentSessionTime] = useState('');

  useEffect(() => {
    setNameInput(operatorName);
  }, [operatorName]);

  useEffect(() => {
    const now = new Date();
    setCurrentSessionTime(
      now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }) + ` • ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
    );
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const initials = operatorName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'OP';

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('bems_operator_name', trimmed);
      }
      if (onUpdateName) {
        onUpdateName(trimmed);
      }
      setIsEditingName(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0B1F33] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl shadow-black/90 overflow-hidden relative text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="relative px-6 pt-6 pb-4 border-b border-white/10 bg-[#102A43]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-md">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Profil & Tentang Sistem</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-mono font-bold">
                    SPKT SIAGA
                  </span>
                </h3>
                <p className="text-xs text-blue-200/80">
                  Bank Emergency Monitoring System • Polresta Bandar Lampung
                </p>
              </div>
            </div>

            {/* Tombol Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Tutup (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigasi */}
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold'
                  : 'bg-white/10 text-blue-200 hover:bg-white/15 hover:text-white border border-white/10'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profil Operator</span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'about'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold'
                  : 'bg-white/10 text-blue-200 hover:bg-white/15 hover:text-white border border-white/10'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Tentang Saya & Sistem</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-5">
          {activeTab === 'profile' ? (
            /* TAB 1: PROFIL OPERATOR */
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Kartu Profil Utama */}
              <div className="p-4 rounded-xl bg-[#102A43]/90 border border-white/10 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-white text-[#102A43] border-2 border-amber-400/80 flex items-center justify-center text-2xl font-black shadow-xl">
                    {initials}
                  </div>
                  <span
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 border-2 border-[#0B1F33] rounded-full flex items-center justify-center text-[10px] text-slate-900 font-bold shadow animate-pulse"
                    title="Online & Aktif"
                  >
                    ✓
                  </span>
                </div>

                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {isEditingName ? (
                      <div className="flex items-center gap-2 w-full max-w-xs">
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                          className="bg-[#0B1F33] border border-amber-400/60 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400 w-full"
                          placeholder="Masukkan nama..."
                          autoFocus
                        />
                        <button
                          onClick={handleSaveName}
                          className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold transition-all shrink-0"
                          title="Simpan"
                        >
                          <Check className="w-4 h-4 font-bold" />
                        </button>
                        <button
                          onClick={() => {
                            setNameInput(operatorName);
                            setIsEditingName(false);
                          }}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-all shrink-0"
                          title="Batal"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-bold text-white tracking-tight">
                          {operatorName}
                        </h4>
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-white/10 transition-all cursor-pointer"
                          title="Ubah Nama Panggilan"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <span className="inline-flex items-center gap-1.5 text-[11px] bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-400/40 font-semibold self-center sm:self-auto">
                      <BadgeCheck className="w-3.5 h-3.5 text-amber-400" />
                      Petugas Terverifikasi
                    </span>
                  </div>

                  <p className="text-xs text-amber-300 font-mono mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                    <Mail className="w-3 h-3" />
                    {operatorEmail}
                  </p>

                  <p className="text-xs text-blue-100 mt-2 font-medium">
                    {operatorRole}
                  </p>
                </div>
              </div>

              {/* Rincian Penugasan & Posko */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-blue-200/80 font-bold uppercase tracking-wider block mb-1">
                    Satuan Induk
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Building className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Polresta Bandar Lampung</span>
                  </div>
                  <span className="text-[11px] text-blue-200/70 block mt-0.5 ml-6">
                    Polda Lampung
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-blue-200/80 font-bold uppercase tracking-wider block mb-1">
                    Penempatan Tugas
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Radio className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Command Center SPKT</span>
                  </div>
                  <span className="text-[11px] text-blue-200/70 block mt-0.5 ml-6">
                    Piket Regu A (Operasi 24 Jam)
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-blue-200/80 font-bold uppercase tracking-wider block mb-1">
                    Lokasi Posko
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Ruang Komando SPKT</span>
                  </div>
                  <span className="text-[11px] text-blue-200/70 block mt-0.5 ml-6">
                    Jl. MT Haryono No. 15, Bandar Lampung
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-blue-200/80 font-bold uppercase tracking-wider block mb-1">
                    Hak Akses Sistem
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                    <Award className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Level Administrator SPKT</span>
                  </div>
                  <span className="text-[11px] text-blue-200/70 block mt-0.5 ml-6">
                    Dispatch Armada & Reset Darurat
                  </span>
                </div>
              </div>

              {/* Status Sesi & Koneksi */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-blue-100">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Sesi Aktif: <span className="text-white font-medium">{currentSessionTime}</span></span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[11px] bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/40 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                  ONLINE
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: TENTANG SAYA & SISTEM BEMS */
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Identitas Logo Siger BEMS */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-[#102A43] to-[#0B1F33] border border-white/10 text-center flex flex-col items-center">
                <img
                  src="/logo.png"
                  alt="Logo Siger Lampung"
                  className="h-20 w-auto object-contain filter drop-shadow-[0_4px_20px_rgba(251,191,36,0.45)] mb-3"
                />
                <h4 className="text-lg font-black text-white tracking-tight">
                  BANK EMERGENCY MONITORING SYSTEM (BEMS)
                </h4>
                <p className="text-xs text-amber-400 font-semibold mt-0.5">
                  Sistem Pemantauan Tombol Panik Bank & Pusat Komando Cepat Tanggap
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-amber-500/25 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/40 font-bold">
                    Versi 1.0-MVP Stable
                  </span>
                  <span className="text-[10px] font-mono bg-white/10 text-blue-200 px-2.5 py-0.5 rounded-full border border-white/10">
                    Tahun 2026
                  </span>
                </div>
              </div>

              {/* Deskripsi Tentang Sistem & Magang */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs leading-relaxed text-blue-100">
                <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Tentang Program Magang & Inovasi BEMS</span>
                </div>
                <p>
                  Aplikasi ini dikembangkan sebagai bagian dari proyek pengabdian dan magang integrasi teknologi kepolisian di <strong className="text-white">Polresta Bandar Lampung</strong>.
                </p>
                <p>
                  Sistem ini menghubungkan mikrokontroler tombol darurat fisik <strong className="text-amber-300">ESP32-C3 SuperMini</strong> di berbagai kantor cabang bank mitra langsung ke layar komando SPKT secara instan via jalur ganda (Real-time Cloud WebSocket dan koneksi cadangan USB Hardware Serial).
                </p>
              </div>

              {/* Arsitektur Teknologi */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <span className="text-[10px] text-blue-200/80 font-bold uppercase tracking-wider block">
                  Spesifikasi & Tumpukan Teknologi
                </span>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-[#0B1F33] border border-white/10 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">ESP32-C3 SuperMini</div>
                      <div className="text-[10px] text-blue-200/70">Wi-Fi 2.4GHz + Hardware UART</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0B1F33] border border-white/10 flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Supabase Realtime</div>
                      <div className="text-[10px] text-blue-200/70">WebSocket Latensi &lt; 500ms</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0B1F33] border border-white/10 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Next.js & TypeScript</div>
                      <div className="text-[10px] text-blue-200/70">App Router & Tailwind CSS</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0B1F33] border border-white/10 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Leaflet & OSRM Routing</div>
                      <div className="text-[10px] text-blue-200/70">Peta & Rute Taktis Polisi</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hak Cipta & Info Polresta */}
              <div className="p-3 text-center border-t border-police-900/60 text-[11px] text-slate-400">
                <p>© 2026 Kepolisian Resor Kota Bandar Lampung • Polda Lampung</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Seluruh hak cipta dilindungi undang-undang • SPKT Command Center Siaga 24/7
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-police-950 border-t border-police-800/80 flex items-center justify-between">
          <LogoutButton variant="default" className="text-xs" />
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-police-800 hover:bg-police-700 text-white font-semibold text-xs border border-police-700 transition-all cursor-pointer shadow-sm hover:shadow"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

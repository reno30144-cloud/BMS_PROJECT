'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ShieldCheck,
  AlertTriangle,
  Phone,
  MapPin,
  Radio,
  Building2,
  Navigation,
  ExternalLink,
  ShieldAlert,
  Car,
  Crosshair,
  Layers,
} from 'lucide-react';

// ============================================================================
// Perbaikan Default Icon Leaflet di Next.js (SSR / Webpack Asset Resolver)
// ============================================================================
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

import { POLRESTA_HQ_POSITION, calculateDistanceKm } from '@/lib/geo-utils';
export { POLRESTA_HQ_POSITION, calculateDistanceKm };

// ============================================================================
// Tipe Data & Dummy Bank
// ============================================================================
export type BankStatus = 'Aman' | 'Bahaya';
export type MapType = 'standard' | 'satellite' | 'terrain' | 'dark';

export interface BankMarkerData {
  id: string;
  name: string;
  code: string;
  branch: string;
  address: string;
  phone: string;
  status: BankStatus;
  position: [number, number]; // [Latitude, Longitude]
  deviceUid: string;
  policeSector: string;
  lastUpdate: string;
}

// Data awal bank resmi mitra Polresta Bandar Lampung
export const DUMMY_BANKS: BankMarkerData[] = [
  {
    id: 'bank-mandiri-tkk',
    name: 'BANK MANDIRI',
    branch: 'KCP Tanjungkarang Kartini',
    code: 'MANDIRI TKK',
    address: 'Jl. Kartini No.79, Tj. Karang, Kec. Tj. Karang Pusat, Kota Bandar Lampung',
    phone: '085783440436',
    status: 'Aman',
    position: [-5.424, 105.259],
    deviceUid: 'ESPC32-B',
    policeSector: 'Polsek Tanjung Karang Barat',
    lastUpdate: 'Baru saja',
  },
];

// ============================================================================
// Generator Custom Icon (Aman = Pin 3D Bank Biru, Bahaya = Merah Berdenyut / Pulsing)
// ============================================================================
const createBankIcon = (status: BankStatus) => {
  const isDanger = status === 'Bahaya';

  return L.divIcon({
    className: 'custom-bank-marker',
    html: `
      <div style="position: relative; display: flex; align-items: flex-end; justify-content: center; width: 44px; height: 48px;">
        ${
          isDanger
            ? `
            <div style="position: absolute; bottom: 0px; width: 44px; height: 44px; border-radius: 9999px; background-color: #ef4444; opacity: 0.85; animation: ping 0.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; top: -6px; right: -4px; z-index: 20; background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 9999px; border: 1.5px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.5); animation: bounce 1s infinite;">BAHAYA</div>
            `
            : ''
        }
        <img
          src="/bank-marker.png"
          alt="Pin Lokasi Bank"
          style="
            width: 44px;
            height: 44px;
            object-fit: contain;
            filter: ${
              isDanger
                ? 'hue-rotate(145deg) saturate(2.2) drop-shadow(0 0 14px rgba(239,68,68,0.95)) drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
                : 'drop-shadow(0 4px 10px rgba(0,0,0,0.35))'
            };
            transition: transform 0.2s ease;
          "
        />
      </div>
    `,
    iconSize: [44, 48],
    iconAnchor: [22, 48],
    popupAnchor: [0, -48],
  });
};

// Marker Khusus: Markas Komando Polresta Bandar Lampung (Bebas kotak hitam / frameless)
const createPoliceHqIcon = () => {
  return L.divIcon({
    className: 'custom-bank-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 48px; height: 48px;">
        <div style="position: absolute; width: 50px; height: 50px; border-radius: 9999px; background-color: #10b981; opacity: 0.35; animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <img
          src="/logo.png"
          alt="Mako Polresta Bandar Lampung"
          style="width: 44px; height: 44px; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.45)) drop-shadow(0 0 10px rgba(251,191,36,0.65));"
        />
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 44],
    popupAnchor: [0, -44],
  });
};

// ============================================================================
// Map Controller: Otomatis Menyesuaikan Rute & Kamera ke Titik Bahaya
// ============================================================================
const AutoRouteController: React.FC<{
  targetBank: BankMarkerData | null;
  hqPosition: [number, number];
}> = ({ targetBank, hqPosition }) => {
  const map = useMap();

  useEffect(() => {
    if (targetBank) {
      // Fokuskan kamera dan sesuaikan batas (fitBounds) agar Mako Polresta & Bank sasaran tampak sekaligus
      const bounds = L.latLngBounds([hqPosition, targetBank.position]);
      map.fitBounds(bounds, {
        padding: [80, 80],
        maxZoom: 15,
        animate: true,
        duration: 1.2,
      });
    }
  }, [map, targetBank, hqPosition]);

  return null;
};

interface MapDashboardProps {
  banks?: BankMarkerData[];
  height?: string;
  className?: string;
}

export const MapDashboard: React.FC<MapDashboardProps> = ({
  banks = DUMMY_BANKS,
  height = '580px',
  className = '',
}) => {
  const mapCenter = POLRESTA_HQ_POSITION;
  const zoomLevel = 12;

  // State untuk data batas GeoJSON
  const [geoData, setGeoData] = useState<any>(null);
  const [isLoadingGeo, setIsLoadingGeo] = useState<boolean>(true);

  // State Kontrol Layer Peta Interaktif (Google Maps Style)
  const [mapType, setMapType] = useState<MapType>('standard');
  const [showTraffic, setShowTraffic] = useState<boolean>(false);
  const [showKecamatan, setShowKecamatan] = useState<boolean>(true);
  const [showRadarRadius, setShowRadarRadius] = useState<boolean>(false);

  // Bank yang menjadi fokus rute navigasi (Otomatis prioritaskan yang berstatus 'Bahaya')
  const [selectedRouteBank, setSelectedRouteBank] = useState<BankMarkerData | null>(null);

  // Otomatis deteksi bank dalam kondisi 'Bahaya'
  const dangerBank = useMemo(() => {
    return banks.find((b) => b.status === 'Bahaya') || null;
  }, [banks]);

  // Otomatis aktifkan rute darurat saat ada insiden bahaya
  useEffect(() => {
    if (dangerBank) {
      setSelectedRouteBank(dangerBank);
    }
  }, [dangerBank]);

  // Bank aktif untuk rute (prioritaskan pilihan manual jika ada, atau dangerBank)
  const activeRouteTarget = selectedRouteBank || dangerBank;

  // Hitung jarak dan estimasi waktu tanggap darurat
  const routeStats = useMemo(() => {
    if (!activeRouteTarget) return null;
    const straightDist = calculateDistanceKm(POLRESTA_HQ_POSITION, activeRouteTarget.position);
    // Faktor jalan perkotaan Bandar Lampung (≈ 1.28x jarak lurus)
    const roadDistKm = Math.round(straightDist * 1.28 * 10) / 10;
    // Asumsi kecepatan unit patroli darurat Samapta ber-sirine ≈ 48 km/jam
    const etaMinutes = Math.max(2, Math.round((roadDistKm / 48) * 60));

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${POLRESTA_HQ_POSITION[0]},${POLRESTA_HQ_POSITION[1]}&destination=${activeRouteTarget.position[0]},${activeRouteTarget.position[1]}&travelmode=driving`;

    return {
      roadDistKm,
      etaMinutes,
      googleMapsUrl,
    };
  }, [activeRouteTarget]);

  // Ambil data batas wilayah dari /bandarlampung.json (folder public)
  useEffect(() => {
    let isMounted = true;

    fetch('/bandarlampung.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setGeoData(data);
          setIsLoadingGeo(false);
        }
      })
      .catch((err) => {
        console.error('Error saat memuat GeoJSON Bandar Lampung:', err);
        if (isMounted) setIsLoadingGeo(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Gaya (style) poligon kecamatan: adaptif sesuai tipe peta
  const geoJsonStyle = useMemo(() => {
    if (mapType === 'satellite') {
      return {
        fillColor: '#10B981',
        weight: 1.5,
        color: '#34d399',
        fillOpacity: 0.06,
        opacity: 0.8,
        dashArray: '4, 4',
      };
    }
    if (mapType === 'dark') {
      return {
        fillColor: '#059669',
        weight: 1,
        color: '#10B981',
        fillOpacity: 0.12,
        opacity: 0.7,
      };
    }
    return {
      fillColor: '#10B981',
      weight: 1,
      color: '#059669',
      fillOpacity: 0.16,
      opacity: 0.75,
    };
  }, [mapType]);

  // Tooltip nama kecamatan saat hover
  const onEachKecamatan = (feature: any, layer: any) => {
    if (feature.properties && feature.properties.NAMOBJ) {
      layer.bindTooltip(
        `<div style="font-family: inherit; font-size: 11px; font-weight: 600; color: #10B981;">
           KECAMATAN ${feature.properties.NAMOBJ}
         </div>`,
        {
          sticky: true,
          direction: 'top',
          className: 'bg-slate-900 border border-slate-700 text-white px-2 py-1 rounded shadow-lg',
        }
      );
    }
  };

  return (
    <div
      className={`relative z-0 isolate w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl ${className}`}
      style={{ height, isolation: 'isolate', zIndex: 0 }}
    >
      {/* Overlay Status Command Center */}
      <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-xl p-3 shadow-xl max-w-xs text-xs text-slate-200 pointer-events-auto">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-bold text-slate-100 tracking-wide">BEMS GIS RADAR</span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono border border-emerald-800/50">
            LIVE
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <img src="/bank-marker.png" alt="Aman" className="w-3.5 h-3.5 object-contain" />
            <span>Aman: {banks.filter((b) => b.status === 'Aman').length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-red-400 font-semibold">
              Bahaya: {banks.filter((b) => b.status === 'Bahaya').length}
            </span>
          </div>
        </div>
      </div>

      {/* Indikator Memuat GeoJSON */}
      {isLoadingGeo && (
        <div className="absolute top-4 right-4 z-20 bg-slate-900/80 backdrop-blur-sm border border-slate-800 text-[11px] text-slate-400 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
          <div className="w-3 h-3 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          Memuat Batas Kecamatan...
        </div>
      )}

      {/* FLOATING ACTION PANEL: RUTE RESPON CEPAT POLISI */}
      {activeRouteTarget && routeStats && (
        <div className="absolute bottom-5 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-md z-20 bg-slate-900/95 backdrop-blur-md border-2 border-red-500/80 rounded-2xl p-4 shadow-2xl text-white pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400 block">
                  {activeRouteTarget.status === 'Bahaya'
                    ? '🚨 RUTE DARURAT: TITIK BAHAYA AKTIF'
                    : 'NAVIGASI RUTE OPERASIONAL'}
                </span>
                <h4 className="text-sm font-bold text-white truncate max-w-[240px]">
                  {activeRouteTarget.name} ({activeRouteTarget.branch})
                </h4>
              </div>
            </div>

            <button
              onClick={() => setSelectedRouteBank(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded-md hover:bg-slate-800 transition-colors"
              title="Tutup Panel Rute"
            >
              ✕
            </button>
          </div>

          {/* Rincian Jarak & Estimasi Waktu */}
          <div className="grid grid-cols-2 gap-2 my-3 text-xs">
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-950 text-red-400 flex items-center justify-center shrink-0">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                  Jarak Tempuh
                </span>
                <span className="text-sm font-bold font-mono text-white">
                  {routeStats.roadDistKm} km
                </span>
              </div>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
                  Estimasi Tiba
                </span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  ~{routeStats.etaMinutes} menit
                </span>
              </div>
            </div>
          </div>

          {/* Tombol Aksi Langsung: Google Maps GPS Turn-by-Turn */}
          <div className="flex items-center gap-2 pt-1">
            <a
              href={routeStats.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Navigation className="w-4 h-4" />
              <span>Buka Rute Google Maps GPS</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-75" />
            </a>

            <button
              type="button"
              onClick={() => {
                alert(
                  `🚨 INSTRUKSI SAMAPTA: Regu Patroli Polresta Bandar Lampung diperintahkan meluncur ke ${activeRouteTarget.name} ${activeRouteTarget.branch} (Estimasi tiba ${routeStats.etaMinutes} menit). Sirene diaktifkan.`
                );
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors shrink-0"
              title="Kirim instruksi radio Samapta"
            >
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>Kerahkan Samapta</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* GOOGLE MAPS STYLE LAYER SWITCHER (Satelit, Medan, Lalu Lintas, Taktis) */}
      {/* ==================================================================== */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto flex items-end gap-2.5 max-w-[calc(100%-2rem)]">
        {/* Tombol Utama Satelit / Standar (Google Maps Style) */}
        <button
          type="button"
          onClick={() => setMapType((prev) => (prev === 'satellite' ? 'standard' : 'satellite'))}
          className={`group relative w-15 h-15 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 shadow-2xl transition-all duration-200 cursor-pointer flex flex-col justify-end p-1.5 shrink-0 active:scale-95 ${
            mapType === 'satellite'
              ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-500/30'
              : 'border-white hover:border-emerald-400'
          }`}
          title={mapType === 'satellite' ? 'Kembali ke Google Maps Standar' : 'Ganti ke Citra Satelit Asli Google'}
        >
          {/* Preview Background Citra Satelit Asli Google */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
            style={{
              backgroundImage:
                mapType === 'satellite'
                  ? 'url("https://mt1.google.com/vt/lyrs=m&x=410&y=261&z=9")'
                  : 'url("https://mt1.google.com/vt/lyrs=y&x=410&y=261&z=9")',
              backgroundColor: '#1e293b',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
          <span className="relative z-10 text-[10px] sm:text-[11px] font-bold text-white tracking-wide text-center leading-tight drop-shadow-md">
            {mapType === 'satellite' ? 'Standar' : 'Satelit'}
          </span>
        </button>

        {/* Panel Menu Opsi Layer (Sesuai Screenshot Google Maps Pengguna) */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-1.5 sm:p-2 shadow-2xl flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto">
          {/* 0. Standar (Peta Asli Google Maps) */}
          <button
            type="button"
            onClick={() => setMapType('standard')}
            className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all cursor-pointer shrink-0 ${
              mapType === 'standard'
                ? 'bg-blue-50 text-blue-800 ring-2 ring-blue-500 font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Tampilan Peta Jalan Asli Google Maps"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs relative flex items-center justify-center bg-slate-100 border border-slate-200">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <rect width="40" height="40" fill="#f8fafc" />
                <path d="M0 14 L40 14 M0 26 L40 26 M14 0 L14 40 M26 0 L26 40" stroke="#cbd5e1" strokeWidth="2.5" />
                <path d="M0 20 Q 20 16 40 22" stroke="#f59e0b" strokeWidth="3" fill="none" />
                <circle cx="20" cy="20" r="3" fill="#ef4444" />
              </svg>
              {mapType === 'standard' && (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-white" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold leading-tight">Standar</span>
          </button>
          {/* 1. Medan (Terrain) */}
          <button
            type="button"
            onClick={() => setMapType((prev) => (prev === 'terrain' ? 'standard' : 'terrain'))}
            className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all cursor-pointer shrink-0 ${
              mapType === 'terrain'
                ? 'bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500 font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Tampilan Topografi & Kontur Medan"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs relative flex items-center justify-center bg-[#8f9f87]">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <rect width="40" height="40" fill="#9db093" />
                <path d="M0 40 Q 15 22 25 30 T 40 18 L 40 40 Z" fill="#7a8f70" />
                <path d="M0 40 Q 10 28 20 34 T 40 26 L 40 40 Z" fill="#627759" />
                <path d="M-5 20 Q 12 14 22 26 T 45 12" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              {mapType === 'terrain' && (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold leading-tight">Medan</span>
          </button>

          {/* 2. Lalu Lintas (Traffic Overlay) */}
          <button
            type="button"
            onClick={() => setShowTraffic((prev) => !prev)}
            className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all cursor-pointer shrink-0 ${
              showTraffic
                ? 'bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500 font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Lapisan Realtime Kondisi Lalu Lintas (Hijau/Kuning/Merah)"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs relative flex items-center justify-center bg-slate-200">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <rect width="40" height="40" fill="#e2e8f0" />
                <rect x="15" y="0" width="10" height="40" fill="#94a3b8" />
                <rect x="0" y="15" width="40" height="10" fill="#94a3b8" />
                <path d="M20 0 L20 20 L0 20" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
                <path d="M20 20 L40 20" fill="none" stroke="#eab308" strokeWidth="3" strokeLinecap="round" />
                <path d="M20 20 L20 40" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
              </svg>
              {showTraffic && (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold leading-tight">
              {showTraffic ? 'Lalin (ON)' : 'Lalu lintas'}
            </span>
          </button>

          {/* 3. Taktis Polresta (Command Center Dark Mode) */}
          <button
            type="button"
            onClick={() => setMapType((prev) => (prev === 'dark' ? 'standard' : 'dark'))}
            className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all cursor-pointer shrink-0 ${
              mapType === 'dark'
                ? 'bg-police-950 text-emerald-400 ring-2 ring-emerald-500 font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Tampilan Peta Taktis Gelap (Command Center Dark)"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs relative flex items-center justify-center bg-slate-900 border border-slate-700">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <rect width="40" height="40" fill="#0f172a" />
                <path d="M0 16 L40 16 M0 28 L40 28 M16 0 L16 40" stroke="#334155" strokeWidth="2" />
                <circle cx="20" cy="20" r="12" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx="20" cy="20" r="3" fill="#10b981" />
              </svg>
              {mapType === 'dark' && (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold leading-tight">Taktis</span>
          </button>

          {/* Divider Pemisah */}
          <div className="h-9 w-px bg-slate-200 shrink-0" />

          {/* 4. Batas Wilayah Kecamatan */}
          <button
            type="button"
            onClick={() => setShowKecamatan((prev) => !prev)}
            className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all cursor-pointer shrink-0 ${
              showKecamatan
                ? 'bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500 font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Tampilkan / Sembunyikan Batas Wilayah Kecamatan"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs relative flex items-center justify-center bg-emerald-50 border border-emerald-200">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <rect width="40" height="40" fill="#ecfdf5" />
                <polygon points="8,10 32,8 36,30 18,34 6,24" fill="#a7f3d0" fillOpacity="0.7" stroke="#059669" strokeWidth="2" />
                <circle cx="20" cy="20" r="2" fill="#047857" />
              </svg>
              {showKecamatan && (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold leading-tight">
              {showKecamatan ? 'Batas (ON)' : 'Batas Wil.'}
            </span>
          </button>

          {/* 5. Radius Respon Patroli Mako */}
          <button
            type="button"
            onClick={() => setShowRadarRadius((prev) => !prev)}
            className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all cursor-pointer shrink-0 ${
              showRadarRadius
                ? 'bg-blue-50 text-blue-800 ring-2 ring-blue-500 font-bold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Tampilkan Radius Respon Samapta 3 km (5 menit) & 6 km (10 menit)"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs relative flex items-center justify-center bg-blue-50 border border-blue-200">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <rect width="40" height="40" fill="#eff6ff" />
                <circle cx="20" cy="20" r="16" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 2" />
                <circle cx="20" cy="20" r="8" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
                <circle cx="20" cy="20" r="2" fill="#1d4ed8" />
              </svg>
              {showRadarRadius && (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-white" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold leading-tight">
              {showRadarRadius ? 'Radius (ON)' : 'Radius'}
            </span>
          </button>
        </div>
      </div>

      {/* Map Container Leaflet */}
      <MapContainer
        center={mapCenter}
        zoom={zoomLevel}
        scrollWheelZoom={true}
        className="z-0"
        style={{ height: '100%', width: '100%', backgroundColor: '#0f172a', zIndex: 0 }}
      >
        {/* Kontroler Otomatis: Mengarahkan Kamera & Rute ke Titik Bahaya */}
        <AutoRouteController
          targetBank={activeRouteTarget}
          hqPosition={POLRESTA_HQ_POSITION}
        />

        {/* PETA DASAR BERDASARKAN TIPE PILIHAN */}
        {mapType === 'standard' && (
          <TileLayer
            key="google-standard"
            attribution='&copy; Google Maps | Polresta BEMS'
            url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            subdomains={['0', '1', '2', '3']}
            maxZoom={20}
          />
        )}

        {mapType === 'satellite' && (
          <TileLayer
            key="google-satellite"
            attribution='&copy; Google Satellite Imagery | Polresta BEMS'
            url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            subdomains={['0', '1', '2', '3']}
            maxZoom={20}
          />
        )}

        {mapType === 'terrain' && (
          <TileLayer
            key="google-terrain"
            attribution='&copy; Google Terrain | Polresta BEMS'
            url="https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
            subdomains={['0', '1', '2', '3']}
            maxZoom={20}
          />
        )}

        {mapType === 'dark' && (
          <>
            {/* Esri Dark Canvas - 100% Bersih Bebas Watermark API Key */}
            <TileLayer
              key="esri-dark-base"
              attribution='&copy; Esri &mdash; Polresta BEMS'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
            />
            <TileLayer
              key="esri-dark-ref"
              attribution=''
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
              zIndex={300}
            />
          </>
        )}

        {/* LAPISAN KONDISI LALU LINTAS REALTIME (Overlay Traffic Flow) */}
        {showTraffic && (
          <TileLayer
            key="traffic-flow"
            attribution='&copy; Google Real-Time Traffic'
            url="https://mt{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}"
            subdomains={['0', '1', '2', '3']}
            opacity={0.82}
            zIndex={450}
            maxZoom={20}
          />
        )}

        {/* Layer Batas Wilayah GeoJSON Bandar Lampung */}
        {showKecamatan && geoData && (
          <GeoJSON
            key={geoData.features ? `${geoData.features.length}-${mapType}` : 'geojson-bdl'}
            data={geoData}
            style={geoJsonStyle}
            onEachFeature={onEachKecamatan}
          />
        )}

        {/* LINGKARAN RADIUS RESPON PATROLI MAKO */}
        {showRadarRadius && (
          <>
            <Circle
              center={POLRESTA_HQ_POSITION}
              radius={3000}
              pathOptions={{
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: '4, 4',
              }}
            />
            <Circle
              center={POLRESTA_HQ_POSITION}
              radius={6000}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.04,
                weight: 1.5,
                dashArray: '6, 6',
              }}
            />
          </>
        )}

        {/* MARKER KHUSUS: MAKO POLRESTA BANDAR LAMPUNG (Pusat Komando) */}
        <Marker position={POLRESTA_HQ_POSITION} icon={createPoliceHqIcon()}>
          <Popup className="bems-popup" minWidth={240}>
            <div className="p-1 font-sans text-slate-800">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold mb-2 bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>PUSAT KOMANDO POLRESTA</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Mako Polresta Bandar Lampung
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Jl. MT Haryono No.15, Gotong Royong, Bandar Lampung
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                Pusat Komando & Penyiagaan Regu Samapta 24 Jam
              </p>
            </div>
          </Popup>
        </Marker>

        {/* GARIS RUTE NAVIGASI DARURAT (Mako Polresta -> Titik Bahaya / Sasaran) */}
        {activeRouteTarget && (
          <>
            {/* Glow Outline Line */}
            <Polyline
              positions={[POLRESTA_HQ_POSITION, activeRouteTarget.position]}
              pathOptions={{
                color: activeRouteTarget.status === 'Bahaya' ? '#b91c1c' : '#059669',
                weight: 8,
                opacity: 0.45,
              }}
            />
            {/* Pulsing Dash Response Line */}
            <Polyline
              positions={[POLRESTA_HQ_POSITION, activeRouteTarget.position]}
              pathOptions={{
                color: activeRouteTarget.status === 'Bahaya' ? '#ef4444' : '#10b981',
                weight: 4,
                opacity: 0.95,
                dashArray: '8, 8',
              }}
            />
          </>
        )}

        {/* Marker Bank dengan Status Aman & Bahaya */}
        {banks.map((bank) => {
          const isDanger = bank.status === 'Bahaya';
          const isSelected = activeRouteTarget?.id === bank.id;

          return (
            <Marker
              key={bank.id}
              position={bank.position}
              icon={createBankIcon(bank.status)}
              eventHandlers={{
                click: () => {
                  setSelectedRouteBank(bank);
                },
              }}
            >
              <Popup className="bems-popup" minWidth={270}>
                <div className="p-1 font-sans text-slate-800">
                  {/* Status Banner */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold mb-2.5 ${
                      isDanger
                        ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {isDanger ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                        <span>DARURAT / TRIGGERED</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                        <span>STATUS AMAN / STANDBY</span>
                      </>
                    )}
                  </div>

                  {/* Info Utama Bank */}
                  <div className="mb-2 flex items-start gap-2.5">
                    <img
                      src="/bank-marker.png"
                      alt="Bank Pin"
                      className="w-9 h-9 object-contain shrink-0 mt-0.5 filter drop-shadow-sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 uppercase">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {bank.code}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {bank.name}
                      </h4>
                      <p className="text-xs font-semibold text-slate-600">
                        {bank.branch}
                      </p>
                    </div>
                  </div>

                  {/* Detail Alamat & Kontak */}
                  <div className="space-y-1.5 text-[11px] border-t border-slate-100 pt-2 text-slate-600">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                      <span>{bank.address}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-slate-700">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <a
                        href={`tel:${bank.phone.split('/')[0].trim()}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {bank.phone}
                      </a>
                    </div>
                  </div>

                  {/* Rute Navigasi Action di Popup */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedRouteBank(bank)}
                      className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                        isSelected
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>{isSelected ? '✓ Rute Sedang Tampil' : 'Pilih & Tampilkan Rute'}</span>
                    </button>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${POLRESTA_HQ_POSITION[0]},${POLRESTA_HQ_POSITION[1]}&destination=${bank.position[0]},${bank.position[1]}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gmaps w-full py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 !text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/30 active:scale-95 cursor-pointer"
                      style={{ color: '#ffffff' }}
                    >
                      <Navigation className="w-3.5 h-3.5 text-white shrink-0" style={{ color: '#ffffff' }} />
                      <span className="text-white font-bold" style={{ color: '#ffffff' }}>
                        Buka Google Maps GPS
                      </span>
                      <ExternalLink className="w-3 h-3 text-white opacity-90 shrink-0" style={{ color: '#ffffff' }} />
                    </a>
                  </div>

                  {/* Info Teknis BEMS */}
                  <div className="mt-2 pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                      {bank.deviceUid}
                    </span>
                    <span>{bank.policeSector}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapDashboard;

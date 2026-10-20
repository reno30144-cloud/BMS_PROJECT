'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ShieldCheck, AlertTriangle, Phone, MapPin, Radio, Building2 } from 'lucide-react';

// ============================================================================
// Perbaikan Default Icon Leaflet di Next.js (SSR / Webpack Asset Resolver)
// ============================================================================
// Masalah umum di Next.js: webpack mengubah path image Leaflet sehingga icon pin default hilang/pecah.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ============================================================================
// Tipe Data & Dummy Bank
// ============================================================================
export type BankStatus = 'Aman' | 'Bahaya';

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

// 3 Marker Tiruan (Dummy) mewakili bank di Bandar Lampung dengan status Aman dan Bahaya
export const DUMMY_BANKS: BankMarkerData[] = [
  {
    id: 'bank-001',
    name: 'Bank Mandiri',
    branch: 'KC Tanjung Karang',
    code: 'MANDIRI-TJK',
    address: 'Jl. Raden Intan No. 55, Enggal, Bandar Lampung',
    phone: '0721-255123',
    status: 'Aman',
    position: [-5.4198, 105.2585],
    deviceUid: 'ESP32C3-BDL-001',
    policeSector: 'Polsek Tanjung Karang Barat',
    lastUpdate: 'Baru saja',
  },
  {
    id: 'bank-002',
    name: 'Bank BRI',
    branch: 'KC Teluk Betung',
    code: 'BRI-TB',
    address: 'Jl. Ikan Manyung No. 12, Teluk Betung Selatan, Bandar Lampung',
    phone: '0721-482210',
    status: 'Bahaya', // Status Darurat / Triggered
    position: [-5.4485, 105.2662],
    deviceUid: 'ESP32C3-BDL-002',
    policeSector: 'Polsek Teluk Betung Selatan',
    lastUpdate: '10:14:22 WIB',
  },
  {
    id: 'bank-003',
    name: 'Bank BCA',
    branch: 'KCU Malahayati',
    code: 'BCA-MLH',
    address: 'Jl. Yos Sudarso No. 100, Bumi Waras, Bandar Lampung',
    phone: '0721-488888',
    status: 'Aman',
    position: [-5.438, 105.275],
    deviceUid: 'ESP32C3-BDL-003',
    policeSector: 'Polsek Teluk Betung Utara',
    lastUpdate: 'Baru saja',
  },
];

// ============================================================================
// Generator Custom Icon (Aman = Hijau, Bahaya = Merah Berdenyut / Pulsing)
// ============================================================================
const createBankIcon = (status: BankStatus) => {
  const isDanger = status === 'Bahaya';

  return L.divIcon({
    className: 'custom-bank-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
        ${
          isDanger
            ? `<div style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background-color: #ef4444; opacity: 0.75; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ''
        }
        <div style="position: relative; width: 32px; height: 32px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.4); border: 2px solid #ffffff; background-color: ${
          isDanger ? '#dc2626' : '#10b981'
        }; color: #ffffff;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            ${
              isDanger
                ? '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
                : '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>'
            }
          </svg>
        </div>
        <div style="position: absolute; bottom: -2px; width: 8px; height: 8px; transform: rotate(45deg); background-color: ${
          isDanger ? '#dc2626' : '#10b981'
        };"></div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
};

interface MapDashboardProps {
  banks?: BankMarkerData[];
  height?: string;
  className?: string;
}

export const MapDashboard: React.FC<MapDashboardProps> = ({
  banks = DUMMY_BANKS,
  height = '560px',
  className = '',
}) => {
  // Titik tengah Kota Bandar Lampung
  const mapCenter: [number, number] = [-5.429, 105.261];
  const zoomLevel = 12;

  // State untuk data batas GeoJSON
  const [geoData, setGeoData] = useState<any>(null);
  const [isLoadingGeo, setIsLoadingGeo] = useState<boolean>(true);

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

  // Gaya (style) poligon kecamatan: hijau transparan
  const geoJsonStyle = useMemo(
    () => ({
      fillColor: '#10B981',
      weight: 1,
      color: '#059669', // Garis batas kecamatan
      fillOpacity: 0.2,
      opacity: 0.8,
    }),
    []
  );

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
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl ${className}`}
      style={{ height }}
    >
      {/* Overlay Status Command Center */}
      <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-xl p-3 shadow-xl max-w-xs text-xs text-slate-200 pointer-events-auto">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-bold text-slate-100 tracking-wide">BEMS GIS RADAR</span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono border border-emerald-800/50">
            LIVE
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]" />
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
        <div className="absolute top-4 right-4 z-[1000] bg-slate-900/80 backdrop-blur-sm border border-slate-800 text-[11px] text-slate-400 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
          <div className="w-3 h-3 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          Memuat Batas Kecamatan...
        </div>
      )}

      {/* Map Container Leaflet */}
      <MapContainer
        center={mapCenter}
        zoom={zoomLevel}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
      >
        {/* Peta Dasar OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Polresta BEMS'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Layer Batas Wilayah GeoJSON Bandar Lampung */}
        {geoData && (
          <GeoJSON
            key={geoData.features ? geoData.features.length : 'geojson-bdl'}
            data={geoData}
            style={geoJsonStyle}
            onEachFeature={onEachKecamatan}
          />
        )}

        {/* Marker Bank dengan Status Aman & Bahaya */}
        {banks.map((bank) => {
          const isDanger = bank.status === 'Bahaya';

          return (
            <Marker
              key={bank.id}
              position={bank.position}
              icon={createBankIcon(bank.status)}
            >
              <Popup className="bems-popup" minWidth={260}>
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
                  <div className="mb-2">
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

                  {/* Info Teknis BEMS */}
                  <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
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

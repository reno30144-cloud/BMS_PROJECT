'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { StatSummary } from '@/components/StatSummary';
import { BankCard } from '@/components/BankCard';
import { ResetModal } from '@/components/ResetModal';
import { IoTSimulatorModal } from '@/components/IoTSimulatorModal';
import { DirectoryView } from '@/components/DirectoryView';
import { IncidentHistoryView } from '@/components/IncidentHistoryView';
import { Device, EmergencyLog } from '@/types/bems';
import { alarmAudio } from '@/lib/audio-alert';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_DEVICES } from '@/lib/demo-data';
import { AlertTriangle, Filter, Search, Radio, LayoutGrid, Map as MapIcon, PlusCircle } from 'lucide-react';
import { MapWrapper } from '@/components/MapWrapper';
import { AddBankModal } from '@/components/AddBankModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { EmergencyAlertModal } from '@/components/EmergencyAlertModal';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'banks' | 'history' | 'simulator'>('monitoring');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [logs, setLogs] = useState<EmergencyLog[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'STANDBY' | 'TRIGGERED' | 'OFFLINE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [resetTargetDevice, setResetTargetDevice] = useState<Device | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [emergencyAlertTargetDevice, setEmergencyAlertTargetDevice] = useState<Device | null>(null);
  const [isEmergencyAlertOpen, setIsEmergencyAlertOpen] = useState(false);
  const [lastAlertedTriggerTime, setLastAlertedTriggerTime] = useState<string | null>(null);

  // Operator Auth State (Tugas 4: Ambil Data Operator via supabase.auth.getUser())
  const [operatorUser, setOperatorUser] = useState<{
    email: string;
    name: string;
  }>({
    email: 'operator@polresta-balam.go.id',
    name: 'Bripka Dimas Pratama',
  });

  // Ambil email dan data user dari Supabase Auth
  useEffect(() => {
    const fetchOperatorData = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user && !error) {
          const email = user.email || '';
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (email.includes('@')
              ? email
                  .split('@')[0]
                  .replace(/[._]/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase())
              : 'Operator SPKT');

          setOperatorUser({
            email,
            name: fullName,
          });
        }
      } catch (err) {
        console.error('Error fetching operator session:', err);
      }
    };

    fetchOperatorData();
  }, []);

  // Fetch device states from server API
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/devices?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.devices) {
          setDevices(json.data.devices);
        }
        if (json.data?.logs) {
          setLogs(json.data.logs);
        }
      }
    } catch {
      // Fallback gracefully to existing state in case of network glitch
    }
  }, []);

  // Supabase Realtime WebSocket subscription
  useEffect(() => {
    fetchStatus();

    const client = supabase;
    if (isSupabaseConfigured && client) {
      const channel = client
        .channel('realtime:devices_and_logs')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'banks' },
          () => {
            fetchStatus();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'devices' },
          () => {
            fetchStatus();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'emergency_logs' },
          () => {
            fetchStatus();
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } else {
      // Fallback polling interval 1.5s jika realtime belum terhubung
      const interval = setInterval(fetchStatus, 1500);
      return () => clearInterval(interval);
    }
  }, [fetchStatus]);

  // Audio siren trigger management
  const hasTriggered = useMemo(() => {
    return devices.some((d) => d.status === 'TRIGGERED');
  }, [devices]);

  useEffect(() => {
    if (hasTriggered) {
      alarmAudio.start();
    } else {
      alarmAudio.stop();
    }
  }, [hasTriggered]);

  // Otomatis Buka POPUP MERAH (EmergencyAlertModal) saat status TRIGGERED aktif
  useEffect(() => {
    const triggeredDev = devices.find((d) => d.status === 'TRIGGERED');
    if (triggeredDev) {
      const triggerTime = triggeredDev.lastTriggeredAt || (triggeredDev as any).updatedAt || 'triggered-event';
      if (triggerTime !== lastAlertedTriggerTime) {
        setEmergencyAlertTargetDevice(triggeredDev);
        setIsEmergencyAlertOpen(true);
        setLastAlertedTriggerTime(triggerTime);
      }
    }
  }, [devices, lastAlertedTriggerTime]);

  // Handle Trigger from Simulator or Card button
  const handleTriggerEmergency = async (deviceUid: string): Promise<number> => {
    const startTime = performance.now();
    const res = await fetch('/api/v1/emergency/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': 'b3m5-p0lr35t4-53cr3t-t0k3n',
      },
      body: JSON.stringify({ device_uid: deviceUid }),
    });
    const endTime = performance.now();
    await fetchStatus();

    // Buka POPUP MERAH langsung seketika
    const target = devices.find((d) => d.deviceUid === deviceUid);
    if (target) {
      setEmergencyAlertTargetDevice({ ...target, status: 'TRIGGERED' });
      setIsEmergencyAlertOpen(true);
    }

    return Math.round(endTime - startTime);
  };

  // Handle Heartbeat from Simulator
  const handleHeartbeat = async (deviceUid: string) => {
    await fetch('/api/v1/emergency/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': 'b3m5-p0lr35t4-53cr3t-t0k3n',
      },
      body: JSON.stringify({
        device_uid: deviceUid,
        rssi: -55,
        battery_level: 95,
      }),
    });
    await fetchStatus();
  };

  // Handle Reset from Operator Modal
  const handleConfirmReset = async (deviceUid: string, operatorName: string, notes: string) => {
    await fetch('/api/v1/emergency/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_uid: deviceUid,
        operator_name: operatorName,
        resolution_notes: notes,
      }),
    });
    await fetchStatus();
  };

  // Filtered & Sorted Devices (Triggered cards always pinned at top)
  const filteredDevices = useMemo(() => {
    let result = devices.filter((d) => {
      // Status filter
      if (selectedFilter !== 'ALL' && d.status !== selectedFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.bank.name.toLowerCase().includes(q) ||
          d.bank.branchName.toLowerCase().includes(q) ||
          d.bank.address.toLowerCase().includes(q) ||
          d.deviceUid.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Sort order: TRIGGERED first, then OFFLINE, then STANDBY
    result.sort((a, b) => {
      if (a.status === 'TRIGGERED' && b.status !== 'TRIGGERED') return -1;
      if (b.status === 'TRIGGERED' && a.status !== 'TRIGGERED') return 1;
      if (a.status === 'OFFLINE' && b.status !== 'OFFLINE') return -1;
      if (b.status === 'OFFLINE' && a.status !== 'OFFLINE') return 1;
      return a.bank.name.localeCompare(b.bank.name);
    });

    return result;
  }, [devices, selectedFilter, searchQuery]);

  const triggeredCount = devices.filter((d) => d.status === 'TRIGGERED').length;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar Hijau Gelap Kepolisian */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'simulator') {
            setIsSimulatorOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        triggeredCount={triggeredCount}
        operatorName={operatorUser.name}
        operatorRole={`Piket SPKT • ${operatorUser.email}`}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Header Bar */}
        <Header
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          hasActiveAlarm={hasTriggered}
        />

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {/* Tab: Ruang Pantau */}
            {activeTab === 'monitoring' && (
              <>
                {/* Active Emergency Alert Callout */}
                {triggeredCount > 0 && (
                  <div className="mb-6 p-4 rounded-2xl bg-red-600 text-white shadow-xl shadow-red-600/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-red-400 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white text-red-600 flex items-center justify-center font-bold shrink-0">
                        <AlertTriangle className="w-6 h-6 animate-bounce" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-wide">
                          PERINGATAN KRITIS: {triggeredCount} BANK MENGALAMI SITUASI DARURAT!
                        </h4>
                        <p className="text-xs text-red-100">
                          Sinyal kepanikan diterima dari tombol fisik. Lakukan tindakan konfirmasi telepon dan pengerahan regu patroli segera.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const dev = devices.find((d) => d.status === 'TRIGGERED');
                        if (dev) {
                          setEmergencyAlertTargetDevice(dev);
                          setIsEmergencyAlertOpen(true);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-white text-red-700 hover:bg-red-50 text-xs font-black shrink-0 transition-all shadow-md active:scale-95"
                    >
                      🚨 Buka Popup Merah
                    </button>
                  </div>
                )}

                {/* Stat Metric Cards */}
                <StatSummary
                  devices={devices}
                  selectedFilter={selectedFilter}
                  onSelectFilter={setSelectedFilter}
                />

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                      <Filter className="w-3.5 h-3.5" />
                      Filter:
                    </span>
                    {(['ALL', 'STANDBY', 'TRIGGERED', 'OFFLINE'] as const).map((filterKey) => (
                      <button
                        key={filterKey}
                        onClick={() => setSelectedFilter(filterKey)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                          selectedFilter === filterKey
                            ? 'bg-police-900 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {filterKey === 'ALL'
                          ? 'Semua Status'
                          : filterKey === 'STANDBY'
                          ? 'Aman (Standby)'
                          : filterKey === 'TRIGGERED'
                          ? '🚨 Bahaya'
                          : 'Terputus (Offline)'}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Tombol Tambah Bank Mitra */}
                    <button
                      onClick={() => setIsAddBankOpen(true)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-police-900 hover:bg-police-850 text-white text-xs font-semibold transition-all shadow-xs hover:shadow-md active:scale-95 whitespace-nowrap border border-emerald-500/30"
                      title="Tambah Bank Mitra Baru & Perangkat IoT"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-400" />
                      <span>Tambah Bank Mitra</span>
                    </button>

                    {/* View Mode Toggle: Grid vs Peta GIS */}
                    <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          viewMode === 'grid'
                            ? 'bg-police-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                        title="Tampilan Kartu Grid"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Grid</span>
                      </button>
                      <button
                        onClick={() => setViewMode('map')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          viewMode === 'map'
                            ? 'bg-police-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                        title="Tampilan Peta GIS Radar"
                      >
                        <MapIcon className="w-3.5 h-3.5" />
                        <span>Peta GIS</span>
                      </button>
                    </div>

                    <div className="relative flex-1 sm:w-60">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari lokasi bank..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700 shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* View Switch: Grid vs Peta GIS */}
                {viewMode === 'map' ? (
                  <div className="mb-6">
                    <MapWrapper 
                      banks={filteredDevices.map((device) => ({
                        id: device.id,
                        name: device.bank?.name || 'Bank Tidak Diketahui',
                        code: device.bank?.code || '-',
                        branch: device.bank?.branchName || '-',
                        address: device.bank?.address || '-',
                        phone: (device.bank as any)?.emergencyContact || '-',
                        status: device.status === 'TRIGGERED' ? 'Bahaya' : 'Aman',
                        // Ambil koordinat dari database. Jika kosong, letakkan di tengah Bandar Lampung
                        position: [
                          (device.bank as any)?.latitude ? parseFloat((device.bank as any).latitude) : -5.429, 
                          (device.bank as any)?.longitude ? parseFloat((device.bank as any).longitude) : 105.261
                        ] as [number, number], 
                        deviceUid: device.deviceUid,
                        policeSector: device.bank?.policeSector || "Polresta Bandar Lampung", 
                        lastUpdate: (device as any).lastHeartbeatAt 
                          ? new Date((device as any).lastHeartbeatAt).toLocaleTimeString('id-ID') + ' WIB'
                          : 'Belum ada data'
                      }))} 
                    />
                  </div>
                ) : filteredDevices.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
                    <p className="text-sm font-semibold text-slate-600">Tidak ada data bank yang cocok</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coba ubah filter status atau kata kunci pencarian Anda.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDevices.map((device) => (
                      <BankCard
                        key={device.id}
                        device={device}
                        onReset={(d) => setResetTargetDevice(d)}
                        onSimulateTrigger={(uid) => handleTriggerEmergency(uid)}
                        onRefresh={fetchStatus}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Tab: Direktori Bank */}
            {activeTab === 'banks' && <DirectoryView devices={devices} />}

            {/* Tab: Riwayat Log */}
            {activeTab === 'history' && <IncidentHistoryView logs={logs} />}
          </div>
        </main>
      </div>

      {/* Modal Tindak Lanjut / Reset */}
      <ResetModal
        device={resetTargetDevice}
        isOpen={Boolean(resetTargetDevice)}
        onClose={() => setResetTargetDevice(null)}
        onConfirm={handleConfirmReset}
        defaultOperatorName={operatorUser.name}
      />

      {/* Modal Simulator IoT ESP32-C3 */}
      <IoTSimulatorModal
        devices={devices}
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onTrigger={handleTriggerEmergency}
        onHeartbeat={handleHeartbeat}
        onEmergencyTriggered={(device) => {
          setEmergencyAlertTargetDevice(device);
          setIsEmergencyAlertOpen(true);
        }}
      />

      {/* Modal Registrasi Bank Mitra & Perangkat IoT */}
      <AddBankModal
        isOpen={isAddBankOpen}
        onClose={() => setIsAddBankOpen(false)}
        onSuccess={() => {
          fetchStatus();
        }}
      />

      {/* POPUP MERAH: Modal Peringatan Darurat Kritis */}
      <EmergencyAlertModal
        device={emergencyAlertTargetDevice}
        isOpen={isEmergencyAlertOpen}
        onClose={() => setIsEmergencyAlertOpen(false)}
        onOpenReset={(d) => {
          setIsEmergencyAlertOpen(false);
          setResetTargetDevice(d);
        }}
        onViewMap={() => {
          setIsEmergencyAlertOpen(false);
          setActiveTab('monitoring');
          setViewMode('map');
        }}
      />
    </div>
  );
}

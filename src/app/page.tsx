'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { StatSummary } from '@/components/StatSummary';
import { BankCard } from '@/components/BankCard';
import { ResetModal } from '@/components/ResetModal';
import { IoTSimulatorModal } from '@/components/IoTSimulatorModal';
import { DirectoryView } from '@/components/DirectoryView';
import { PolsekView } from '@/components/PolsekView';
import { IncidentHistoryView } from '@/components/IncidentHistoryView';
import { Device, EmergencyLog, PoliceStation } from '@/types/bems';
import { alarmAudio } from '@/lib/audio-alert';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_DEVICES } from '@/lib/demo-data';
import { INITIAL_POLSEKS } from '@/lib/polsek-store';
import { AlertTriangle, Filter, Search, Radio, LayoutGrid, Map as MapIcon, PlusCircle, Cable, Navigation, PhoneCall, ExternalLink, Car, Volume2, ShieldCheck, Menu, Building2, History } from 'lucide-react';
import { MapWrapper } from '@/components/MapWrapper';
import { AddBankModal } from '@/components/AddBankModal';
import { EmergencyAlertModal } from '@/components/EmergencyAlertModal';
import { POLRESTA_HQ_POSITION, calculateDistanceKm } from '@/lib/geo-utils';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'map' | 'banks' | 'polsek' | 'history' | 'simulator'>('monitoring');
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [logs, setLogs] = useState<EmergencyLog[]>([]);
  const [policeStations, setPoliceStations] = useState<PoliceStation[]>(INITIAL_POLSEKS);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'STANDBY' | 'TRIGGERED' | 'OFFLINE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal States
  const [resetTargetDevice, setResetTargetDevice] = useState<Device | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [emergencyAlertTargetDevice, setEmergencyAlertTargetDevice] = useState<Device | null>(null);
  const [isEmergencyAlertOpen, setIsEmergencyAlertOpen] = useState(false);
  const [lastAlertedTriggerTime, setLastAlertedTriggerTime] = useState<string | null>(null);

  // Kunci Status Darurat Aktif: Sirine TIDAK AKAN PERNAH BERHENTI sebelum admin menekan Reset
  const [activeEmergencyUids, setActiveEmergencyUids] = useState<string[]>([]);
  const activeEmergencyUidsRef = React.useRef<string[]>(activeEmergencyUids);
  React.useEffect(() => {
    activeEmergencyUidsRef.current = activeEmergencyUids;
  }, [activeEmergencyUids]);

  // Global Hardware USB Web Serial State & Telemetry
  const [isUsbConnected, setIsUsbConnected] = useState(false);
  const [usbButtonCount, setUsbButtonCount] = useState<number>(0);
  const [usbFeedbackStatus, setUsbFeedbackStatus] = useState<'NONE' | 'SUCCESS' | 'FAILED'>('NONE');
  const [lastRawUsbData, setLastRawUsbData] = useState<string>('-');
  const isReadingUsbRef = React.useRef(false);
  const serialPortRef = React.useRef<any>(null);
  const serialReaderRef = React.useRef<any>(null);
  const readableStreamClosedRef = React.useRef<Promise<void> | null>(null);

  // Operator Auth State (Tugas 4: Ambil Data Operator via supabase.auth.getUser())
  const [operatorUser, setOperatorUser] = useState<{
    email: string;
    name: string;
  }>({
    email: 'admin@polresta.id',
    name: 'Admin',
  });

  // Ambil email dan data user dari Supabase Auth & LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bems_operator_name');
      if (saved && !saved.toLowerCase().includes('bripka') && !saved.toLowerCase().includes('dimas')) {
        setOperatorUser((prev) => ({ ...prev, name: saved }));
      } else if (saved && (saved.toLowerCase().includes('bripka') || saved.toLowerCase().includes('dimas'))) {
        localStorage.removeItem('bems_operator_name');
        setOperatorUser((prev) => ({ ...prev, name: 'Admin' }));
      }
    }

    const fetchOperatorData = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user && !error) {
          const email = user.email || 'admin@polresta.id';
          const saved = typeof window !== 'undefined' ? localStorage.getItem('bems_operator_name') : null;
          const cleanSaved = saved && !saved.toLowerCase().includes('bripka') ? saved : null;
          const fullName =
            cleanSaved ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (email.includes('@')
              ? email
                  .split('@')[0]
                  .replace(/[._]/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase())
              : 'Admin');

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
          const incomingDevices: Device[] = json.data.devices;

          // Sinkronkan perangkat yang berstatus TRIGGERED dari server ke daftar aktif
          const serverTriggered = incomingDevices
            .filter((d) => d.status === 'TRIGGERED')
            .map((d) => d.deviceUid);

          if (serverTriggered.length > 0) {
            const combined = Array.from(
              new Set([
                ...activeEmergencyUidsRef.current.map((u) => u.toLowerCase()),
                ...serverTriggered.map((u) => u.toLowerCase()),
              ])
            );
            activeEmergencyUidsRef.current = combined;
            setActiveEmergencyUids(combined);
          }

          // Pertahankan status TRIGGERED untuk setiap UID yang sedang terkunci aktif
          // sehingga polling server tidak akan pernah mematikan status darurat sebelum admin me-reset
          setDevices(() => {
            const activeSet = new Set(activeEmergencyUidsRef.current.map((u) => u.toLowerCase()));
            return incomingDevices.map((d) => {
              if (activeSet.has(d.deviceUid.toLowerCase())) {
                return { ...d, status: 'TRIGGERED' as const };
              }
              return d;
            });
          });
        }
        if (json.data?.logs) {
          setLogs(json.data.logs);
        }
      }

      // Ambil daftar simpul server kantor polsek dari API
      try {
        const polsekRes = await fetch(`/api/v1/polsek?_t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (polsekRes.ok) {
          const polsekJson = await polsekRes.json();
          if (polsekJson.data && Array.isArray(polsekJson.data)) {
            setPoliceStations(polsekJson.data);
          }
        }
      } catch {
        // Fallback tetap menggunakan data polsek yang sudah ada
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

  // Audio siren trigger management: Berbunyi terus-menerus selagi masih ada bank berstatus darurat
  const hasTriggered = useMemo(() => {
    return activeEmergencyUids.length > 0 || devices.some((d) => d.status === 'TRIGGERED');
  }, [activeEmergencyUids, devices]);

  useEffect(() => {
    if (hasTriggered) {
      alarmAudio.start();
    } else {
      alarmAudio.stop();
    }
  }, [hasTriggered]);

  // Siren Continuous Watchdog: Memastikan sirine dijamin 100% berbunyi keras tanpa jeda sampai admin me-reset
  useEffect(() => {
    if (!hasTriggered) return;

    const watchdog = setInterval(() => {
      if (!alarmAudio.getIsPlaying() && !alarmAudio.getMuted()) {
        alarmAudio.start();
      } else {
        alarmAudio.resumeIfSuspended();
      }
    }, 1000);

    return () => clearInterval(watchdog);
  }, [hasTriggered]);

  // Reference to current devices to prevent stale closure in event listeners
  const devicesRef = React.useRef(devices);
  React.useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

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

  // Handle Trigger from Simulator, Card button, or USB Serial
  const handleTriggerEmergency = async (deviceUid: string): Promise<number> => {
    const startTime = performance.now();
    const cleanUid = (deviceUid || '').trim().toLowerCase();

    // 1. Identifikasi target perangkat yang mengalami situasi darurat
    const target =
      devicesRef.current.find((d) => d.deviceUid.toLowerCase() === cleanUid) ||
      INITIAL_DEVICES.find((d) => d.deviceUid.toLowerCase() === cleanUid) ||
      devicesRef.current[0] ||
      INITIAL_DEVICES[0];

    // 2. KUNCI UID ke activeEmergencyUids secara instan & sinkron agar sirine TIDAK PERNAH BERHENTI sebelum admin me-reset
    const targetUid = target.deviceUid.toLowerCase();
    if (!activeEmergencyUidsRef.current.some((u) => u.toLowerCase() === targetUid)) {
      const updated = [...activeEmergencyUidsRef.current, target.deviceUid];
      activeEmergencyUidsRef.current = updated;
      setActiveEmergencyUids(updated);
    }

    // 3. BUNYIKAN SIRINE KERAS SECARA INSTAN TANPA JEDA
    alarmAudio.start();

    // 4. Update status devices seketika di local state
    setDevices((prev) =>
      prev.map((d) =>
        d.deviceUid.toLowerCase() === target.deviceUid.toLowerCase()
          ? { ...d, status: 'TRIGGERED' as const, lastTriggeredAt: new Date().toISOString() }
          : d
      )
    );

    setIsSimulatorOpen(false);
    setEmergencyAlertTargetDevice({ ...target, status: 'TRIGGERED' });
    setIsEmergencyAlertOpen(true);

    // 5. Kirim sinyal ke server backend di background
    try {
      await fetch('/api/v1/emergency/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Token': 'b3m5-p0lr35t4-53cr3t-t0k3n',
        },
        body: JSON.stringify({ device_uid: target.deviceUid }),
      });
    } catch (err) {
      console.warn('Network notice during trigger:', err);
    }

    const endTime = performance.now();
    await fetchStatus();

    return Math.round(endTime - startTime);
  };

  // Global Hardware USB Web Serial Stream Reader
  const startSerialReader = useCallback(async (port: any) => {
    if (isReadingUsbRef.current) return;
    try {
      if (!port.readable) {
        await port.open({ baudRate: 115200 });
      }
      serialPortRef.current = port;
      setIsUsbConnected(true);
      isReadingUsbRef.current = true;
      setUsbFeedbackStatus('NONE');

      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      readableStreamClosedRef.current = readableStreamClosed;
      const reader = textDecoder.readable.getReader();
      serialReaderRef.current = reader;

      let streamBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          streamBuffer += value;
          const cleanVal = value.trim();
          if (cleanVal.length > 0) {
            setLastRawUsbData(cleanVal);
          }
          if (streamBuffer.length > 500) streamBuffer = streamBuffer.slice(-200);

          const upper = streamBuffer.toUpperCase();
          // Filter ketat pemicu tombol darurat: cegah false alarm dari teks boot
          const isTrigger =
            upper.includes('PANIC:ESPC32-B') ||
            upper.includes('PANIC:') ||
            upper.includes('[TOMBOL FISIK DITEKAN!]') ||
            upper.includes('TRIGGER:');

          if (isTrigger) {
            const match = streamBuffer.match(/PANIC:([A-Za-z0-9_-]+)/i) || streamBuffer.match(/TRIGGER:([A-Za-z0-9_-]+)/i);
            const targetUid = match ? match[1].trim() : 'ESPC32-B';
            streamBuffer = '';

            setUsbButtonCount((prev) => prev + 1);
            setUsbFeedbackStatus('SUCCESS');

            // LANGSUNG PICU POPUP MERAH KE LAYAR SEKETIKA (0 MILIDETIK)
            handleTriggerEmergency(targetUid);
          } else if (upper.includes('RESET:')) {
            streamBuffer = '';
          } else if (upper.includes('HEARTBEAT:')) {
            const match = streamBuffer.match(/HEARTBEAT:([A-Za-z0-9_-]+)/i);
            if (match) {
              handleHeartbeat(match[1].trim()).catch(() => {});
            }
            streamBuffer = '';
          }
        }
      }
    } catch (err: any) {
      console.warn('Web Serial global notice:', err?.message);
    } finally {
      setIsUsbConnected(false);
      isReadingUsbRef.current = false;
      serialPortRef.current = null;
      serialReaderRef.current = null;
      readableStreamClosedRef.current = null;
    }
  }, []);

  const handleConnectUsbGlobal = async () => {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      alert('Browser Anda belum mendukung Web Serial API. Gunakan browser Google Chrome atau Microsoft Edge terbaru.');
      return;
    }

    // Jika sedang terhubung, klik ini akan MELEPAS port agar Arduino IDE bisa upload tanpa error
    if (isUsbConnected) {
      try {
        if (serialReaderRef.current) {
          await serialReaderRef.current.cancel().catch(() => {});
        }
        if (readableStreamClosedRef.current) {
          await readableStreamClosedRef.current.catch(() => {});
        }
        if (serialPortRef.current) {
          await serialPortRef.current.close().catch(() => {});
        }
      } catch (err) {
        console.warn('Error releasing port:', err);
      } finally {
        setIsUsbConnected(false);
        isReadingUsbRef.current = false;
        serialPortRef.current = null;
        serialReaderRef.current = null;
        readableStreamClosedRef.current = null;
      }
      return;
    }

    try {
      // 1. Coba pakai port yang sudah pernah diizinkan sebelumnya agar langsung tersambung 1-klik
      const existingPorts = await (navigator as any).serial.getPorts().catch(() => []);
      let port = existingPorts && existingPorts.length > 0 ? existingPorts[0] : null;

      // 2. Jika belum ada port terdaftar, buka pemilih port browser
      if (!port) {
        port = await (navigator as any).serial.requestPort();
      }

      await startSerialReader(port);
    } catch (e: any) {
      console.warn('User cancelled port picker or port busy:', e?.message);
    }
  };

  // Koneksi port USB hanya dilakukan saat tombol Sambungkan USB diklik secara manual
  // agar port COM8 tidak terkunci saat pengguna ingin upload di Arduino IDE

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

  // Handle Reset from Operator Modal - SATU-SATUNYA TITIK PENGHENTIAN SIRINE OLEH ADMIN
  const handleConfirmReset = async (deviceUid: string, operatorName: string, notes: string) => {
    const cleanUid = (deviceUid || '').trim().toLowerCase();

    // 1. Lepaskan kunci dari daftar insiden aktif secara instan dan sinkron
    const remainingUids = activeEmergencyUidsRef.current.filter((u) => u.toLowerCase() !== cleanUid);
    activeEmergencyUidsRef.current = remainingUids;
    setActiveEmergencyUids(remainingUids);

    // 2. Periksa apakah masih ada perangkat lain yang statusnya TRIGGERED
    const remainingInDevices = devicesRef.current.some(
      (d) => d.status === 'TRIGGERED' && d.deviceUid.toLowerCase() !== cleanUid
    );

    // 3. Sirine HANYA berhenti jika SEMUA insiden darurat sudah di-reset oleh admin
    if (remainingUids.length === 0 && !remainingInDevices) {
      alarmAudio.stop();
    }

    // 4. Kembalikan status perangkat ke STANDBY di local state seketika
    setDevices((prev) =>
      prev.map((d) =>
        d.deviceUid.toLowerCase() === cleanUid
          ? { ...d, status: 'STANDBY' as const }
          : d
      )
    );

    // 4. Jika port USB sedang terhubung, kirim sinyal RESET ke hardware ESP32 agar LED mati
    if (serialPortRef.current?.writable) {
      try {
        const writer = serialPortRef.current.writable.getWriter();
        await writer.write(new TextEncoder().encode(`RESET:${deviceUid}\n`));
        writer.releaseLock();
      } catch (err) {
        console.warn('Gagal mengirim sinyal RESET ke USB serial:', err);
      }
    }

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

  // Membersihkan seluruh jejak audit log insiden
  const handleClearLogs = async () => {
    try {
      const res = await fetch('/api/v1/logs', {
        method: 'DELETE',
      });
      if (res.ok) {
        setLogs([]);
      }
    } catch (err) {
      console.error('Error clearing logs:', err);
    }
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
    <div className="relative flex h-screen bg-[#EEF2F6] text-slate-900 overflow-hidden font-sans animate-view-transition">
      {/* Fullscreen Red Strobe Flashing Emergency Alert (Layar Berkedip Merah Darurat) */}
      {hasTriggered && (
        <div
          className="fixed inset-0 pointer-events-none z-[85] border-[10px] sm:border-[16px] animate-screen-strobe transition-all"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Deep Navy & Amber Executive */}
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
        polsekCount={policeStations.length}
        operatorName={operatorUser.name}
        operatorRole={`Piket SPKT • ${operatorUser.email}`}
        operatorEmail={operatorUser.email}
        onUpdateName={(newName) => {
          setOperatorUser((prev) => ({ ...prev, name: newName }));
        }}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Header Bar */}
        <Header
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          hasActiveAlarm={hasTriggered}
          isUsbConnected={isUsbConnected}
          onConnectUsb={handleConnectUsbGlobal}
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Tab: Ruang Pantau */}
            {activeTab === 'monitoring' && (
              <div key="monitoring" className="animate-view-transition">
                {/* USB Reconnect Helper Alert if not connected */}
                {!isUsbConnected && (
                  <div className="mb-6 p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-police-800 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Cable className="w-5 h-5" />
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-white">Status Alat Fisik ESP32:</span>{' '}
                        <span className="text-slate-300">
                          Setelah cabut-pasang kabel USB / upload Arduino, klik tombol di samping agar browser mendengarkan port COM8 dan popup merah otomatis muncul saat tombol ditekan.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleConnectUsbGlobal}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-2 justify-center"
                    >
                      <Cable className="w-4 h-4" />
                      <span>Sambungkan COM8</span>
                    </button>
                  </div>
                )}

                {/* Active Emergency Alert Tactical Callout HUD */}
                {triggeredCount > 0 && (() => {
                  const primaryTriggered = devices.find((d) => d.status === 'TRIGGERED');
                  const bankLat = primaryTriggered?.bank?.latitude ?? -5.429;
                  const bankLng = primaryTriggered?.bank?.longitude ?? 105.261;
                  const straightDist = calculateDistanceKm(POLRESTA_HQ_POSITION, [bankLat, bankLng]);
                  const roadDistKm = Math.round(straightDist * 1.28 * 10) / 10;
                  const etaMinutes = Math.max(2, Math.round((roadDistKm / 48) * 60));
                  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${POLRESTA_HQ_POSITION[0]},${POLRESTA_HQ_POSITION[1]}&destination=${bankLat},${bankLng}&travelmode=driving`;

                  return (
                    <div className="mb-6 p-5 rounded-2xl bg-red-600 text-white shadow-xl shadow-red-600/25 border-2 border-red-500 relative overflow-hidden">
                      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Emergency Status & Bank Info */}
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white text-red-600 flex items-center justify-center shadow-md shrink-0">
                            <AlertTriangle className="w-6 h-6 text-red-600 animate-bounce" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-800 text-white shadow-xs flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-white"></span>
                                PERINGATAN DARURAT KRITIS: {triggeredCount} BANK MENGALAMI SITUASI BAHAYA
                              </span>
                              {primaryTriggered && (
                                <span className="text-[11px] font-mono font-bold text-red-100 bg-red-700 px-2 py-0.5 rounded border border-red-500">
                                  UID: {primaryTriggered.deviceUid}
                                </span>
                              )}
                            </div>

                            {primaryTriggered && (
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                <span className="font-extrabold text-base text-white">
                                  {primaryTriggered.bank.name} • {primaryTriggered.bank.branchName}
                                </span>
                                <span className="text-red-100 font-medium">
                                  {primaryTriggered.bank.address}
                                </span>
                              </div>
                            )}

                            {/* Telepon darurat & estimasi jarak */}
                            {primaryTriggered && (
                              <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                                <a
                                  href={`tel:${primaryTriggered.bank.emergencyContact.split('/')[0].trim()}`}
                                  className="inline-flex items-center gap-1.5 font-mono font-bold text-emerald-800 bg-white hover:bg-emerald-50 px-3 py-1 rounded-xl shadow-xs transition-all"
                                  title="Panggil langsung kontak darurat bank"
                                >
                                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{primaryTriggered.bank.emergencyContact}</span>
                                </a>
                                <span className="text-red-100 font-mono font-semibold flex items-center gap-1">
                                  <Car className="w-3.5 h-3.5 text-white" />
                                  <span>{roadDistKm} km dari Mako (~{etaMinutes} menit)</span>
                                </span>
                                <span className="text-red-200 text-[11px]">
                                  Sektor: <strong className="text-white">{primaryTriggered.bank.policeSector}</strong>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Sound Mode & Quick Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end lg:self-center">
                          {/* Siren Mode Switcher on Callout */}
                          <div className="flex items-center gap-1 bg-red-700/90 border border-red-500 p-1 rounded-xl text-xs">
                            <span className="text-[10px] text-red-100 font-bold px-1.5 flex items-center gap-1">
                              <Volume2 className="w-3 h-3 text-white" />
                              Sirine:
                            </span>
                            <button
                              type="button"
                              onClick={() => alarmAudio.setMode('wail')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                alarmAudio.getMode() === 'wail'
                                  ? 'bg-white text-red-700 shadow-xs'
                                  : 'text-red-100 hover:text-white'
                              }`}
                              title="Set mode sirine panjang (Wail ~6.7s)"
                            >
                              🚓 Wail
                            </button>
                            <button
                              type="button"
                              onClick={() => alarmAudio.setMode('yelp')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                alarmAudio.getMode() === 'yelp'
                                  ? 'bg-white text-red-700 shadow-xs'
                                  : 'text-red-100 hover:text-white'
                              }`}
                              title="Set mode sirine cepat (Yelp)"
                            >
                              🚨 Yelp
                            </button>
                          </div>

                          {/* Tombol Rute di Peta */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('map');
                            }}
                            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95 border border-slate-700 cursor-pointer"
                            title="Tampilkan peta rute taktis dari Mako ke lokasi bank"
                          >
                            <Navigation className="w-4 h-4 text-emerald-400" />
                            <span>Peta Radar</span>
                          </button>

                          {/* Tombol GPS Google Maps */}
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95 border border-slate-700"
                            title="Buka rute Google Maps GPS langsung"
                          >
                            <ExternalLink className="w-4 h-4 text-emerald-400" />
                            <span>GPS ({roadDistKm} km)</span>
                          </a>

                          {/* Tombol Detail SOP */}
                          <button
                            type="button"
                            onClick={() => {
                              if (primaryTriggered) {
                                setEmergencyAlertTargetDevice(primaryTriggered);
                                setIsEmergencyAlertOpen(true);
                              }
                            }}
                            className="px-4 py-2.5 rounded-xl bg-white text-red-700 hover:bg-red-50 text-xs font-black transition-all shadow-md active:scale-95"
                          >
                            🚨 SOP & Detail
                          </button>

                          {/* Tombol Cepat: Tangani & Reset Status */}
                          <button
                            type="button"
                            onClick={() => {
                              if (primaryTriggered) {
                                setResetTargetDevice(primaryTriggered);
                              }
                            }}
                            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                            title="Selesaikan dan reset status darurat bank ini"
                          >
                            <ShieldCheck className="w-4 h-4 text-slate-900" />
                            <span>Tangani & Reset</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

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
                    {/* Tombol Tambah Bank Mitra / Polsek */}
                    <button
                      onClick={() => setIsAddBankOpen(true)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-police-900 hover:bg-police-850 text-white text-xs font-semibold transition-all shadow-xs hover:shadow-md active:scale-95 whitespace-nowrap border border-emerald-500/30 cursor-pointer"
                      title="Tambah Bank Mitra Baru atau Kantor Polsek (Server)"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-400" />
                      <span>Tambah Bank / Polsek</span>
                    </button>

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

                {/* Grid Kartu Bank */}
                {filteredDevices.length === 0 ? (
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
              </div>
            )}

            {/* Tab: Peta GIS Radar */}
            {activeTab === 'map' && (
              <div key="map" className="space-y-6 animate-view-transition">
                {/* Header & Filter Peta */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#102A43] border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-md shrink-0">
                        <MapIcon className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Peta GIS Radar & Sebaran Bank Mitra</h3>
                        <p className="text-xs text-slate-500">
                          Monitoring geospasial titik lokasi teller bank dan rute armada respon cepat Polresta Bandar Lampung
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Filter Status Bank di Peta */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                      {(['ALL', 'TRIGGERED', 'STANDBY', 'OFFLINE'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setSelectedFilter(filter)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selectedFilter === filter
                              ? 'bg-white text-slate-950 shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-950'
                          }`}
                        >
                          {filter === 'ALL'
                            ? 'Semua'
                            : filter === 'STANDBY'
                            ? 'Standby'
                            : filter === 'TRIGGERED'
                            ? '🚨 Bahaya'
                            : 'Offline'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Komponen Peta GIS Interaktif */}
                <div className="relative z-0 isolate bg-white rounded-2xl border border-slate-200 p-2 shadow-xs overflow-hidden" style={{ isolation: 'isolate' }}>
                  <MapWrapper 
                    banks={filteredDevices.map((device) => ({
                      id: device.id,
                      name: device.bank?.name || 'Bank Tidak Diketahui',
                      code: device.bank?.code || '-',
                      branch: device.bank?.branchName || '-',
                      address: device.bank?.address || '-',
                      phone: device.bank?.emergencyContact || '-',
                      status: device.status === 'TRIGGERED' ? 'Bahaya' : 'Aman',
                      position: [
                        device.bank?.latitude ?? -5.418, 
                        device.bank?.longitude ?? 105.258,
                      ] as [number, number], 
                      deviceUid: device.deviceUid,
                      policeSector: device.bank?.policeSector || "Polresta Bandar Lampung", 
                      lastUpdate: device.lastHeartbeatAt 
                        ? new Date(device.lastHeartbeatAt).toLocaleTimeString('id-ID') + ' WIB'
                        : 'Belum ada data'
                    }))} 
                    policeStations={policeStations}
                  />
                </div>
              </div>
            )}

            {/* Tab: Direktori Bank Mitra */}
            {activeTab === 'banks' && (
              <div key="banks" className="animate-view-transition">
                <DirectoryView
                  devices={devices}
                  policeStations={policeStations}
                  onRefresh={fetchStatus}
                />
              </div>
            )}

            {/* Tab: Server Polsek */}
            {activeTab === 'polsek' && (
              <div key="polsek" className="animate-view-transition">
                <PolsekView
                  policeStations={policeStations}
                  onRefresh={fetchStatus}
                  onOpenAddPolsek={() => setIsAddBankOpen(true)}
                />
              </div>
            )}

            {/* Tab: Riwayat Log */}
            {activeTab === 'history' && (
              <div key="history" className="animate-view-transition">
                <IncidentHistoryView logs={logs} onClearLogs={handleClearLogs} />
              </div>
            )}
          </div>
        </main>

        {/* Sticky Mobile Bottom Navigation Bar (Gaya Navy & Warm Amber Executive) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#102A43]/95 backdrop-blur-md border-t border-[#0D2338] px-3 py-1.5 flex items-center justify-around gap-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.5)]">
          {/* Ruang Pantau */}
          <button
            type="button"
            onClick={() => setActiveTab('monitoring')}
            className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl flex-1 max-w-[84px] min-h-[52px] transition-all cursor-pointer active:scale-95 ${
              activeTab === 'monitoring'
                ? 'text-white font-bold bg-white/15 border border-white/25 shadow-xs'
                : 'text-blue-100/70 hover:text-white'
            }`}
          >
            <Radio className={`w-5 h-5 mb-0.5 ${activeTab === 'monitoring' ? 'text-amber-400' : ''}`} />
            <span className="text-[11px] tracking-tight">Pantau</span>
            {triggeredCount > 0 && (
              <span className="absolute top-1.5 right-3.5 w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse ring-2 ring-[#102A43]" />
            )}
          </button>

          {/* Peta GIS Radar */}
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl flex-1 max-w-[84px] min-h-[52px] transition-all cursor-pointer active:scale-95 ${
              activeTab === 'map'
                ? 'text-white font-bold bg-white/15 border border-white/25 shadow-xs'
                : 'text-blue-100/70 hover:text-white'
            }`}
          >
            <MapIcon className={`w-5 h-5 mb-0.5 ${activeTab === 'map' ? 'text-amber-400' : ''}`} />
            <span className="text-[11px] tracking-tight">Peta</span>
          </button>

          {/* Direktori Bank Mitra */}
          <button
            type="button"
            onClick={() => setActiveTab('banks')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl flex-1 max-w-[84px] min-h-[52px] transition-all cursor-pointer active:scale-95 ${
              activeTab === 'banks'
                ? 'text-white font-bold bg-white/15 border border-white/25 shadow-xs'
                : 'text-blue-100/70 hover:text-white'
            }`}
          >
            <Building2 className={`w-5 h-5 mb-0.5 ${activeTab === 'banks' ? 'text-amber-400' : ''}`} />
            <span className="text-[11px] tracking-tight">Bank</span>
          </button>

          {/* Server Polsek */}
          <button
            type="button"
            onClick={() => setActiveTab('polsek')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl flex-1 max-w-[84px] min-h-[52px] transition-all cursor-pointer active:scale-95 ${
              activeTab === 'polsek'
                ? 'text-white font-bold bg-white/15 border border-white/25 shadow-xs'
                : 'text-blue-100/70 hover:text-white'
            }`}
          >
            <ShieldCheck className={`w-5 h-5 mb-0.5 ${activeTab === 'polsek' ? 'text-amber-400' : ''}`} />
            <span className="text-[11px] tracking-tight">Polsek</span>
          </button>

          {/* Log Insiden & Riwayat */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl flex-1 max-w-[84px] min-h-[52px] transition-all cursor-pointer active:scale-95 ${
              activeTab === 'history'
                ? 'text-white font-bold bg-white/15 border border-white/25 shadow-xs'
                : 'text-blue-100/70 hover:text-white'
            }`}
          >
            <History className={`w-5 h-5 mb-0.5 ${activeTab === 'history' ? 'text-amber-400' : ''}`} />
            <span className="text-[11px] tracking-tight">Riwayat</span>
          </button>
        </nav>
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
          setIsSimulatorOpen(false); // Sembunyikan simulator secara bersih
          setEmergencyAlertTargetDevice(device);
          setIsEmergencyAlertOpen(true);
        }}
        isUsbConnected={isUsbConnected}
        onConnectUsb={handleConnectUsbGlobal}
        buttonCount={usbButtonCount}
        feedbackStatus={usbFeedbackStatus}
        lastRawData={lastRawUsbData}
        onResetButtonCount={() => {
          setUsbButtonCount(0);
          setUsbFeedbackStatus('NONE');
          setLastRawUsbData('-');
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
          setActiveTab('map');
        }}
      />
    </div>
  );
}

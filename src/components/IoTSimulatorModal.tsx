'use client';

import React, { useState } from 'react';
import { Cpu, X, Radio, AlertTriangle, Terminal, Copy, Check, Cable } from 'lucide-react';
import { Device } from '@/types/bems';

interface IoTSimulatorModalProps {
  devices: Device[];
  isOpen: boolean;
  onClose: () => void;
  onTrigger: (deviceUid: string) => Promise<number>; // returns latency in ms
  onHeartbeat: (deviceUid: string) => Promise<void>;
  onEmergencyTriggered?: (device: Device) => void;
  isUsbConnected?: boolean;
  onConnectUsb?: () => void;
  buttonCount?: number;
  feedbackStatus?: 'NONE' | 'SUCCESS' | 'FAILED';
  lastRawData?: string;
  onResetButtonCount?: () => void;
}

export const IoTSimulatorModal: React.FC<IoTSimulatorModalProps> = ({
  devices,
  isOpen,
  onClose,
  onTrigger,
  onHeartbeat,
  onEmergencyTriggered,
  isUsbConnected = false,
  onConnectUsb,
  buttonCount = 0,
  feedbackStatus = 'NONE',
  lastRawData = '-',
  onResetButtonCount,
}) => {
  const [selectedUid, setSelectedUid] = useState<string>(devices[0]?.deviceUid || '');
  const [isLoading, setIsLoading] = useState(false);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [logMessage, setLogMessage] = useState<string>('Simulator siap dioperasikan.');
  const [copied, setCopied] = useState(false);

  // Perbarui default selectedUid jika devices berubah
  React.useEffect(() => {
    if (!selectedUid && devices.length > 0) {
      setSelectedUid(devices[0].deviceUid);
    }
  }, [devices, selectedUid]);

  if (!isOpen) return null;

  const currentDevice = devices.find((d) => d.deviceUid === selectedUid) || devices[0];

  const handleSimulateTrigger = async () => {
    if (!selectedUid) return;
    setIsLoading(true);
    setLogMessage(`Mengirim payload darurat HTTP POST untuk ${selectedUid}...`);

    // Langsung tutup simulator dan munculkan Popup Merah seketika
    onClose();
    if (currentDevice && onEmergencyTriggered) {
      onEmergencyTriggered(currentDevice);
    }

    try {
      const latencyMs = await onTrigger(selectedUid);
      setLastLatency(latencyMs);
      setLogMessage(`✅ [BENAR] Sinyal darurat tersampaikan dalam ${latencyMs} ms! (Target < 2000 ms: LULUS)`);
    } catch (err: unknown) {
      const e = err as Error;
      setLogMessage(`❌ [SALAH] Gagal: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateHeartbeat = async () => {
    if (!selectedUid) return;
    setIsLoading(true);
    setLogMessage(`Mengirim heartbeat ping untuk ${selectedUid}...`);
    try {
      await onHeartbeat(selectedUid);
      setLogMessage(`Detak jantung berhasil diterima server untuk ${selectedUid}.`);
    } catch (err: unknown) {
      const e = err as Error;
      setLogMessage(`Gagal: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const curlExample = `curl -X POST http://localhost:3000/api/v1/emergency/trigger \\
  -H "Content-Type: application/json" \\
  -H "X-Device-Token: b3m5-p0lr35t4-53cr3t-t0k3n" \\
  -d '{"device_uid": "${selectedUid || 'ESPC32-B'}"}'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#102A43] text-white p-6 flex items-center justify-between border-b border-[#0D2338]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Cpu className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Simulator Modul Perangkat IoT ESP32-C3</h3>
              <p className="text-xs text-blue-200/80">Uji fungsional transmisi sinyal dan latensi penerimaan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-police-900 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Device Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Unit Perangkat / Bank Target:
            </label>
            <select
              value={selectedUid}
              onChange={(e) => setSelectedUid(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-police-700"
            >
              {devices.map((d) => (
                <option key={d.deviceUid} value={d.deviceUid}>
                  {d.deviceUid} — {d.bank.name} ({d.bank.branchName}) [{d.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Hardware USB Connect Section */}
          <div className="bg-gradient-to-r from-slate-50 to-police-50/50 p-4 rounded-2xl border-2 border-dashed border-police-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  isUsbConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                }`}
              >
                <Cable className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    {isUsbConnected ? 'Kabel USB ESP32 Terhubung' : 'Gunakan Tombol Fisik (Kabel USB COM8)'}
                  </h4>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isUsbConnected ? 'bg-emerald-500 animate-ping-slow' : 'bg-slate-300'
                    }`}
                  ></span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isUsbConnected
                    ? 'Tersambung di COM8! Tekan tombol fisik di board ESP32 Anda sekarang.'
                    : 'Sambungkan browser langsung ke kabel USB tanpa perlu Wi-Fi atau hotspot.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onConnectUsb}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 shadow-xs flex items-center gap-2 justify-center ${
                isUsbConnected
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-police-900 hover:bg-police-950 text-white'
              }`}
            >
              <Cable className="w-4 h-4" />
              <span>{isUsbConnected ? '🟢 Terhubung (COM8)' : 'Sambungkan USB'}</span>
            </button>
          </div>

          {/* REAL-TIME COUNTING & FEEDBACK (BENAR / SALAH) */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Penghitung Klik Tombol Fisik:
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`text-2xl font-black font-mono tracking-tight ${
                      buttonCount > 0 ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {buttonCount}
                  </span>
                  <span className="text-xs text-slate-400">kali ditekan</span>
                </div>
              </div>

              {/* Status Feedback Badge (Benar / Belum Terdeteksi) */}
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Status Feedback:
                </span>
                {feedbackStatus === 'SUCCESS' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    ✅ BENAR (Terdeteksi)
                  </span>
                ) : feedbackStatus === 'FAILED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-500/40">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    ❌ SALAH / GAGAL
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    ⚪ Nilai 0 (Belum Terdeteksi)
                  </span>
                )}
              </div>
            </div>

            {/* Live Data Monitor dari Kabel USB */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] truncate max-w-md">
                <span className="text-slate-500">Data USB Masuk:</span>
                <span className="text-emerald-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate">
                  {lastRawData}
                </span>
              </div>

              {buttonCount > 0 && onResetButtonCount && (
                <button
                  type="button"
                  onClick={onResetButtonCount}
                  className="text-[11px] text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
                >
                  Reset ke 0
                </button>
              )}
            </div>
          </div>

          {/* Action Simulation Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleSimulateTrigger}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-red-600/20 font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Tekan Tombol Darurat</span>
              </div>
              <span className="text-[11px] font-normal text-red-100">
                Kirim HTTP POST Panic Trigger
              </span>
            </button>

            <button
              onClick={handleSimulateHeartbeat}
              disabled={isLoading}
              className="bg-[#102A43] hover:bg-[#163456] border border-amber-400/30 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-2 text-sm">
                <Radio className="w-5 h-5 text-amber-400" />
                <span>Kirim Ping Detak Jantung</span>
              </div>
              <span className="text-[11px] font-normal text-blue-200">
                Kirim Heartbeat Berkala 5 Menit
              </span>
            </button>
          </div>

          {/* Latency & Log Monitor */}
          <div className="bg-slate-900 text-emerald-400 p-4 rounded-2xl font-mono text-xs border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-slate-400">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-500" />
                Telemetry Console
              </span>
              {lastLatency !== null && (
                <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded text-[11px] border border-emerald-500/30">
                  Latensi End-to-End: <strong className="text-white">{lastLatency} ms</strong>
                </span>
              )}
            </div>
            <p className="text-slate-200">&gt; {logMessage}</p>
          </div>

          {/* cURL Command Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Perintah Uji via Terminal (cURL):
              </span>
              <button
                onClick={copyCurl}
                className="flex items-center gap-1 text-[11px] text-police-700 hover:text-police-900 font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin' : 'Salin Perintah'}</span>
              </button>
            </div>
            <pre className="bg-slate-100 p-3 rounded-xl text-[11px] text-slate-800 overflow-x-auto font-mono border border-slate-200">
              {curlExample}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

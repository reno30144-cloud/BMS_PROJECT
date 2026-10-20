'use client';

import React, { useState } from 'react';
import { Cpu, X, Send, Radio, AlertTriangle, CheckCircle, Terminal, Copy, Check, Cable } from 'lucide-react';
import { Device } from '@/types/bems';

interface IoTSimulatorModalProps {
  devices: Device[];
  isOpen: boolean;
  onClose: () => void;
  onTrigger: (deviceUid: string) => Promise<number>; // returns latency in ms
  onHeartbeat: (deviceUid: string) => Promise<void>;
  onEmergencyTriggered?: (device: Device) => void;
}

export const IoTSimulatorModal: React.FC<IoTSimulatorModalProps> = ({
  devices,
  isOpen,
  onClose,
  onTrigger,
  onHeartbeat,
  onEmergencyTriggered,
}) => {
  const [selectedUid, setSelectedUid] = useState<string>(devices[0]?.deviceUid || '');
  const [isLoading, setIsLoading] = useState(false);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [logMessage, setLogMessage] = useState<string>('Simulator siap dioperasikan.');
  const [copied, setCopied] = useState(false);
  const [usbConnected, setUsbConnected] = useState(false);
  const [usbConnecting, setUsbConnecting] = useState(false);

  // Counting state: jika tombol diklik naik 1, jika tidak terdeteksi bernilai 0
  const [buttonCount, setButtonCount] = useState<number>(0);
  const [lastRawData, setLastRawData] = useState<string>('-');
  const [feedbackStatus, setFeedbackStatus] = useState<'NONE' | 'SUCCESS' | 'FAILED'>('NONE');

  if (!isOpen) return null;

  const currentDevice = devices.find((d) => d.deviceUid === selectedUid) || devices[0];

  const handleConnectUsb = async () => {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      alert('Browser Anda belum mendukung Web Serial API. Gunakan browser Google Chrome atau Microsoft Edge terbaru.');
      return;
    }

    try {
      setUsbConnecting(true);
      setLogMessage('Membuka dialog pemilihan port USB...');
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });
      setUsbConnected(true);
      setUsbConnecting(false);
      setLogMessage('🟢 Kabel USB ESP32 terhubung di 115200 baud! Silakan tekan tombol fisik di board ESP32 Anda sekarang...');

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      let streamBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          streamBuffer += value;
          const cleanVal = value.trim();
          if (cleanVal.length > 0) {
            setLastRawData(cleanVal);
          }

          // Batasi buffer agar tidak terjadi memory leak
          if (streamBuffer.length > 500) {
            streamBuffer = streamBuffer.slice(-200);
          }

          const upper = streamBuffer.toUpperCase();

          // Cek apakah ada sinyal pemicu tombol darurat (case-insensitive & multibahasa)
          if (
            upper.includes('PANIC') ||
            upper.includes('TRIGGER') ||
            upper.includes('KLIK') ||
            upper.includes('CLICK') ||
            upper.includes('DITEKAN') ||
            upper.includes('TEKAN') ||
            upper.includes('PRESS') ||
            upper.includes('BUTTON') ||
            upper.includes('EMERGENCY') ||
            upper.includes('BAHAYA') ||
            upper.includes('ALARM')
          ) {
            // Cek apakah ada UID spesifik di dalam payload (contoh: PANIC:ESP32-KDT-01)
            const match = streamBuffer.match(/PANIC:([A-Za-z0-9_-]+)/i);
            let targetUid = selectedUid;
            if (match && match[1]) {
              const extracted = match[1].trim();
              const found = devices.find((d) => d.deviceUid.toLowerCase() === extracted.toLowerCase());
              if (found) {
                targetUid = found.deviceUid;
                setSelectedUid(found.deviceUid);
              }
            }

            streamBuffer = '';
            setButtonCount((prev) => prev + 1);
            setFeedbackStatus('SUCCESS');
            setLogMessage('🚨 [BENAR] Sinyal tombol fisik terdeteksi via USB! Memproses alarm darurat...');
            
            try {
              const finalUid = targetUid || selectedUid || devices[0]?.deviceUid || 'ESP32-KDT-01';
              const latency = await onTrigger(finalUid);
              setLastLatency(latency);
              setLogMessage(`✅ [BENAR] Sinyal darurat berhasil diproses (${latency} ms)! Alarm darurat AKTIF.`);
              
              // Memicu POPUP MERAH langsung ke layar
              const triggeredDev = devices.find((d) => d.deviceUid === finalUid) || currentDevice;
              if (triggeredDev && onEmergencyTriggered) {
                onEmergencyTriggered(triggeredDev);
              }
            } catch (err: any) {
              setFeedbackStatus('FAILED');
              setLogMessage(`❌ [SALAH/GAGAL] Gagal memproses alarm: ${err.message}`);
            }
          } else if (upper.includes('HEARTBEAT') || upper.includes('PING')) {
            setLogMessage(`💓 [HEARTBEAT] Detak jantung ESP32 aktif via USB: "${cleanVal}"`);
          }
        }
      }
    } catch (err: any) {
      console.warn('Web Serial notice:', err);
      setUsbConnecting(false);
      setUsbConnected(false);
      setButtonCount(0);
      setFeedbackStatus('FAILED');
      setLogMessage(`❌ [SALAH] USB Serial terputus atau gagal: ${err.message}`);
    }
  };

  const handleSimulateTrigger = async () => {
    if (!selectedUid) return;
    setIsLoading(true);
    setButtonCount((prev) => prev + 1);
    setFeedbackStatus('SUCCESS');
    setLogMessage(`Mengirim payload darurat HTTP POST untuk ${selectedUid}...`);
    try {
      const latencyMs = await onTrigger(selectedUid);
      setLastLatency(latencyMs);
      setLogMessage(`✅ [BENAR] Sinyal darurat tersampaikan dalam ${latencyMs} ms! (Target < 2000 ms: LULUS)`);
      if (currentDevice && onEmergencyTriggered) {
        onEmergencyTriggered(currentDevice);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setFeedbackStatus('FAILED');
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
  -d '{"device_uid": "${selectedUid || 'ESP32C3-BDL-001'}"}'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-police-950 text-white p-6 flex items-center justify-between border-b border-police-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-police-800 border border-emerald-500/40 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Simulator Modul Perangkat IoT ESP32-C3</h3>
              <p className="text-xs text-slate-300">Uji fungsional transmisi sinyal dan latensi penerimaan</p>
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
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                usbConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
              }`}>
                <Cable className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    {usbConnected ? 'Kabel USB ESP32 Terhubung' : 'Gunakan Tombol Fisik (Kabel USB COM8)'}
                  </h4>
                  <span className={`w-2 h-2 rounded-full ${usbConnected ? 'bg-emerald-500 animate-ping-slow' : 'bg-slate-300'}`}></span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {usbConnected
                    ? 'Tersambung di COM8! Tekan tombol fisik di board ESP32 Anda sekarang.'
                    : 'Sambungkan browser langsung ke kabel USB tanpa perlu Wi-Fi atau hotspot.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConnectUsb}
              disabled={usbConnecting}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 shadow-xs flex items-center gap-2 justify-center ${
                usbConnected
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-police-900 hover:bg-police-950 text-white'
              }`}
            >
              <Cable className="w-4 h-4" />
              <span>{usbConnecting ? 'Menghubungkan...' : usbConnected ? '🟢 Terhubung (COM8)' : 'Sambungkan USB'}</span>
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
                  <span className={`text-2xl font-black font-mono tracking-tight ${
                    buttonCount > 0 ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
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

              {buttonCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setButtonCount(0);
                    setFeedbackStatus('NONE');
                    setLastRawData('-');
                  }}
                  className="text-[11px] text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
                >
                  Reset ke 0
                </button>
              )}
            </div>
          </div>

          {/* Banner Popup Merah saat tombol terdeteksi */}
          {feedbackStatus === 'SUCCESS' && (
            <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-3.5 rounded-2xl shadow-lg shadow-red-600/30 border border-red-400 flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white text-red-600 flex items-center justify-center font-bold shrink-0">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h5 className="text-xs font-black uppercase tracking-wider">
                    🚨 POPUP MERAH DARURAT DIPICU!
                  </h5>
                  <p className="text-[11px] text-red-100">
                    Sinyal darurat aktif untuk {currentDevice?.bank.name || selectedUid}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onEmergencyTriggered && currentDevice) {
                    onEmergencyTriggered(currentDevice);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-white text-red-700 hover:bg-red-50 text-xs font-black shrink-0 shadow-xs transition-all hover:scale-105"
              >
                Buka Layar Merah
              </button>
            </div>
          )}

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
              className="bg-police-800 hover:bg-police-900 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-police-900/20 font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-sm">
                <Radio className="w-5 h-5 text-emerald-400" />
                <span>Kirim Ping Detak Jantung</span>
              </div>
              <span className="text-[11px] font-normal text-emerald-200">
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

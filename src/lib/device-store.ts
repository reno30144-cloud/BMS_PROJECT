import { Device, DeviceStatus, EmergencyLog } from '@/types/bems';
import { INITIAL_DEVICES } from './demo-data';

// Singleton In-Memory State for Development & Live Demonstration
class DeviceStore {
  private devices: Device[] = [...INITIAL_DEVICES];
  private logs: EmergencyLog[] = [];
  private listeners: Set<(devices: Device[]) => void> = new Set();

  public getDevices(): Device[] {
    // Evaluasi status OFFLINE otomatis jika heartbeat > 10 menit
    const now = Date.now();
    return this.devices.map((device) => {
      const lastHb = new Date(device.lastHeartbeatAt).getTime();
      const diffMinutes = (now - lastHb) / (1000 * 60);

      if (diffMinutes > 10 && device.status !== 'TRIGGERED') {
        return { ...device, status: 'OFFLINE' as DeviceStatus };
      }
      return device;
    });
  }

  public getDeviceByUid(uid: string): Device | undefined {
    return this.devices.find((d) => d.deviceUid === uid);
  }

  public addDevice(newDevice: Device): void {
    // Hindari duplikasi jika sudah ada
    const existingIdx = this.devices.findIndex((d) => d.deviceUid === newDevice.deviceUid);
    if (existingIdx !== -1) {
      this.devices[existingIdx] = newDevice;
    } else {
      this.devices.unshift(newDevice);
    }
    this.notify();
  }

  public deleteBank(bankId: string): void {
    this.devices = this.devices.filter((d) => d.bankId !== bankId && d.bank.id !== bankId);
    this.notify();
  }

  public updateBank(bankId: string, updated: Partial<Device['bank']> & { deviceUid?: string }): void {
    const idx = this.devices.findIndex((d) => d.bankId === bankId || d.bank.id === bankId);
    if (idx !== -1) {
      const current = this.devices[idx];
      this.devices[idx] = {
        ...current,
        deviceUid: updated.deviceUid ? updated.deviceUid.toUpperCase() : current.deviceUid,
        bank: {
          ...current.bank,
          ...updated,
        },
      };
      this.notify();
    }
  }

  public triggerEmergency(deviceUid: string): { success: boolean; device?: Device; message: string } {
    const idx = this.devices.findIndex((d) => d.deviceUid === deviceUid);
    if (idx === -1) {
      return { success: false, message: `Device dengan UID ${deviceUid} tidak ditemukan.` };
    }

    const device = this.devices[idx];
    const nowIso = new Date().toISOString();

    const updatedDevice: Device = {
      ...device,
      status: 'TRIGGERED',
      lastTriggeredAt: nowIso,
    };

    this.devices[idx] = updatedDevice;

    // Catat log
    this.logs.unshift({
      id: `log-${Date.now()}`,
      deviceId: device.id,
      bankName: device.bank.name,
      branchName: device.bank.branchName,
      triggeredAt: nowIso,
    });

    this.notify();
    return { success: true, device: updatedDevice, message: 'Status bahaya berhasil dipicu.' };
  }

  public recordHeartbeat(
    deviceUid: string,
    rssi?: number,
    batteryLevel?: number
  ): { success: boolean; device?: Device; message: string } {
    const idx = this.devices.findIndex((d) => d.deviceUid === deviceUid);
    if (idx === -1) {
      return { success: false, message: `Device dengan UID ${deviceUid} tidak terdaftar.` };
    }

    const device = this.devices[idx];
    const updatedDevice: Device = {
      ...device,
      lastHeartbeatAt: new Date().toISOString(),
      rssi: rssi ?? device.rssi,
      batteryLevel: batteryLevel ?? device.batteryLevel,
      // Jika sebelumnya OFFLINE dan menerima ping baru, pulihkan ke STANDBY
      status: device.status === 'OFFLINE' ? 'STANDBY' : device.status,
    };

    this.devices[idx] = updatedDevice;
    this.notify();
    return { success: true, device: updatedDevice, message: 'Detak jantung tercatat.' };
  }

  public resetEmergency(
    deviceUid: string,
    operatorName: string,
    resolutionNotes: string
  ): { success: boolean; device?: Device; message: string } {
    const idx = this.devices.findIndex((d) => d.deviceUid === deviceUid);
    if (idx === -1) {
      return { success: false, message: `Device dengan UID ${deviceUid} tidak ditemukan.` };
    }

    const device = this.devices[idx];
    const nowIso = new Date().toISOString();

    const updatedDevice: Device = {
      ...device,
      status: 'STANDBY',
    };

    this.devices[idx] = updatedDevice;

    // Update log terbaru
    const pendingLog = this.logs.find((l) => l.deviceId === device.id && !l.resolvedAt);
    if (pendingLog) {
      pendingLog.resolvedAt = nowIso;
      pendingLog.operatorName = operatorName;
      pendingLog.resolutionNotes = resolutionNotes;
    }

    this.notify();
    return { success: true, device: updatedDevice, message: 'Status berhasil direset ke STANDBY.' };
  }

  public getLogs(): EmergencyLog[] {
    return this.logs;
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public subscribe(listener: (devices: Device[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const current = this.getDevices();
    this.listeners.forEach((fn) => fn(current));
  }
}

// Global declaration for Next.js hot reload persistence in dev mode
const globalForStore = globalThis as unknown as { bemsDeviceStore?: DeviceStore };
export const deviceStore = globalForStore.bemsDeviceStore || new DeviceStore();
if (deviceStore) {
  Object.setPrototypeOf(deviceStore, DeviceStore.prototype);
}
if (process.env.NODE_ENV !== 'production') globalForStore.bemsDeviceStore = deviceStore;

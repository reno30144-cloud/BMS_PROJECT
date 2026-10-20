export type DeviceStatus = 'STANDBY' | 'TRIGGERED' | 'OFFLINE';

export interface Bank {
  id: string;
  code: string;
  name: string;
  branchName: string;
  address: string;
  emergencyContact: string;
  branchManager: string;
  policeSector: string; // Polsek terdekat, misal: Polsek Tanjung Karang Barat
}

export interface Device {
  id: string;
  bankId: string;
  deviceUid: string;
  status: DeviceStatus;
  lastHeartbeatAt: string; // ISO string
  lastTriggeredAt?: string | null;
  rssi?: number;
  batteryLevel?: number; // Persentase baterai / daya
  bank: Bank;
}

export interface EmergencyLog {
  id: string;
  deviceId: string;
  bankName: string;
  branchName: string;
  triggeredAt: string;
  resolvedAt?: string | null;
  operatorName?: string | null;
  resolutionNotes?: string | null;
}

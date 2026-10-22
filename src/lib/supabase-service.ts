import { supabaseAdmin, isSupabaseConfigured } from './supabase';
import { deviceStore } from './device-store';
import { Device, DeviceStatus, EmergencyLog } from '@/types/bems';

interface RawDbBank {
  id: string;
  code: string;
  name: string;
  branch_name: string;
  address: string;
  emergency_contact: string;
  latitude?: number;
  longitude?: number;
}

interface RawDbDevice {
  id: string;
  bank_id: string;
  device_uid: string;
  status: DeviceStatus;
  last_heartbeat_at: string;
  last_triggered_at?: string | null;
  rssi?: number;
  battery_level?: number;
  banks?: RawDbBank | null;
}

export async function getDevicesWithFallback(): Promise<Device[]> {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return deviceStore.getDevices();
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('devices')
      .select('*, banks(*)');

    if (error || !data) {
      console.warn('Gagal membaca tabel devices Supabase, fallback ke in-memory store:', error?.message);
      return deviceStore.getDevices();
    }

    // Filter perangkat yang banknya valid (tidak null karena relasi terhapus)
    const validData = data.filter((d: any) => Boolean(d.banks));

    const now = Date.now();
    return validData.map((d: RawDbDevice) => {
      const lastHb = d.last_heartbeat_at ? new Date(d.last_heartbeat_at).getTime() : 0;
      const diffMinutes = (now - lastHb) / (1000 * 60);

      // Auto OFFLINE calculation jika > 10 menit tanpa ping dan bukan TRIGGERED
      let currentStatus: DeviceStatus = d.status || 'OFFLINE';
      if (diffMinutes > 10 && currentStatus !== 'TRIGGERED') {
        currentStatus = 'OFFLINE';
      }

      return {
        id: d.id,
        bankId: d.bank_id,
        deviceUid: d.device_uid,
        status: currentStatus,
        lastHeartbeatAt: d.last_heartbeat_at || new Date().toISOString(),
        lastTriggeredAt: d.last_triggered_at,
        rssi: d.rssi ?? -60,
        batteryLevel: d.battery_level ?? 95,
        bank: {
          id: d.banks?.id || d.bank_id,
          code: d.banks?.code || 'BANK',
          name: d.banks?.name || 'Bank Mitra',
          branchName: d.banks?.branch_name || 'Kantor Cabang',
          address: d.banks?.address || 'Bandar Lampung',
          emergencyContact: d.banks?.emergency_contact || '0721-110',
          branchManager: 'Pimpinan Cabang',
          policeSector: 'Polsek Wilayah',
          latitude: d.banks?.latitude ?? -5.429,
          longitude: d.banks?.longitude ?? 105.261,
        },
      };
    });
  } catch (err) {
    console.error('Error getDevicesWithFallback:', err);
    return deviceStore.getDevices();
  }
}

export async function triggerEmergencyWithFallback(deviceUid: string) {
  // Selalu update in-memory store untuk jaminan respons lokal
  deviceStore.triggerEmergency(deviceUid);

  if (!isSupabaseConfigured || !supabaseAdmin) {
    return { success: true };
  }

  try {
    const nowIso = new Date().toISOString();
    // 1. Ambil ID device
    const { data: device, error: devErr } = await supabaseAdmin
      .from('devices')
      .select('id, bank_id')
      .eq('device_uid', deviceUid)
      .single();

    if (devErr || !device) {
      console.warn('Perangkat tidak ditemukan di Supabase:', devErr?.message);
      return { success: false, message: devErr?.message };
    }

    // 2. Update status device ke TRIGGERED
    await supabaseAdmin
      .from('devices')
      .update({
        status: 'TRIGGERED',
        last_triggered_at: nowIso,
        updated_at: nowIso,
      })
      .eq('device_uid', deviceUid);

    // 3. Masukkan ke log insiden
    await supabaseAdmin
      .from('emergency_logs')
      .insert({
        device_id: device.id,
        triggered_at: nowIso,
      });

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error triggerEmergencyWithFallback:', error);
    return { success: false, message: error.message };
  }
}

export async function recordHeartbeatWithFallback(deviceUid: string, rssi?: number, batteryLevel?: number) {
  deviceStore.recordHeartbeat(deviceUid, rssi, batteryLevel);

  if (!isSupabaseConfigured || !supabaseAdmin) {
    return { success: true };
  }

  try {
    const nowIso = new Date().toISOString();
    await supabaseAdmin
      .from('devices')
      .update({
        last_heartbeat_at: nowIso,
        updated_at: nowIso,
        status: 'STANDBY',
      })
      .eq('device_uid', deviceUid);

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error recordHeartbeatWithFallback:', error);
    return { success: false, message: error.message };
  }
}

export async function resetEmergencyWithFallback(deviceUid: string, operatorName: string, resolutionNotes: string) {
  deviceStore.resetEmergency(deviceUid, operatorName, resolutionNotes);

  if (!isSupabaseConfigured || !supabaseAdmin) {
    return { success: true };
  }

  try {
    const nowIso = new Date().toISOString();

    // 1. Ambil ID device
    const { data: device } = await supabaseAdmin
      .from('devices')
      .select('id')
      .eq('device_uid', deviceUid)
      .single();

    // 2. Update status ke STANDBY
    await supabaseAdmin
      .from('devices')
      .update({
        status: 'STANDBY',
        updated_at: nowIso,
      })
      .eq('device_uid', deviceUid);

    // 3. Update emergency_logs
    if (device?.id) {
      await supabaseAdmin
        .from('emergency_logs')
        .update({
          resolved_at: nowIso,
          operator_name: operatorName,
          resolution_notes: resolutionNotes,
        })
        .eq('device_id', device.id)
        .is('resolved_at', null);
    }

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error resetEmergencyWithFallback:', error);
    return { success: false, message: error.message };
  }
}

export async function getLogsWithFallback(): Promise<EmergencyLog[]> {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return deviceStore.getLogs();
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('emergency_logs')
      .select('*, devices(device_uid, banks(name, branch_name))')
      .order('triggered_at', { ascending: false })
      .limit(20);

    if (error || !data) {
      return deviceStore.getLogs();
    }

    return data.map((l: any) => ({
      id: l.id,
      deviceId: l.device_id,
      bankName: l.devices?.banks?.name || 'Bank Mitra',
      branchName: l.devices?.banks?.branch_name || 'Cabang',
      triggeredAt: l.triggered_at,
      resolvedAt: l.resolved_at,
      operatorName: l.operator_name,
      resolutionNotes: l.resolution_notes,
    }));
  } catch {
    return deviceStore.getLogs();
  }
}

export async function clearLogsWithFallback(): Promise<{ success: boolean; message?: string }> {
  try {
    if (typeof (deviceStore as any).clearLogs === 'function') {
      (deviceStore as any).clearLogs();
    } else if ((deviceStore as any).logs) {
      (deviceStore as any).logs = [];
    }
  } catch (storeErr) {
    console.warn('DeviceStore clearLogs warning:', storeErr);
  }

  if (!isSupabaseConfigured || !supabaseAdmin) {
    return { success: true };
  }

  try {
    const { error } = await supabaseAdmin
      .from('emergency_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error clearing emergency_logs from Supabase:', error);
      return { success: false, message: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, message: error.message };
  }
}


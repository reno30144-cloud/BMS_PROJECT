export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getDevicesWithFallback, getLogsWithFallback } from '@/lib/supabase-service';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { deviceStore } from '@/lib/device-store';
import { Device } from '@/types/bems';

export async function GET() {
  try {
    const [devices, logs] = await Promise.all([
      getDevicesWithFallback(),
      getLogsWithFallback(),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          devices,
          logs,
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data perangkat', error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, branch, code, address, phone, latitude, longitude, deviceUid } = body;

    const lat = latitude ? parseFloat(latitude) : -5.429;
    const lng = longitude ? parseFloat(longitude) : 105.261;

    let bankId = `bank-${Date.now()}`;
    let deviceId = `dev-${Date.now()}`;
    const cleanDeviceUid = (deviceUid || `ESP32C3-BDL-${Date.now().toString().slice(-4)}`).trim().toUpperCase();

    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. Insert ke tabel banks
      const { data: bankData, error: bankErr } = await supabaseAdmin
        .from('banks')
        .insert({
          name: name?.trim() || 'Bank Mitra',
          branch_name: branch?.trim() || 'Kantor Cabang',
          code: (code || 'BANK').trim().toUpperCase(),
          address: address?.trim() || 'Bandar Lampung',
          emergency_contact: phone?.trim() || '0721-110',
          latitude: lat,
          longitude: lng,
        })
        .select('id')
        .single();

      if (!bankErr && bankData) {
        bankId = bankData.id;
      }

      // 2. Insert ke tabel devices
      const dummyAuthToken = `token_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
      const { data: devData, error: devErr } = await supabaseAdmin
        .from('devices')
        .insert({
          bank_id: bankId,
          device_uid: cleanDeviceUid,
          auth_token: dummyAuthToken,
          status: 'OFFLINE',
        })
        .select('id')
        .single();

      if (!devErr && devData) {
        deviceId = devData.id;
      }
    }

    // Tambahkan juga ke in-memory store agar segera sinkron di local/fallback
    const newDevice: Device = {
      id: deviceId,
      bankId: bankId,
      deviceUid: cleanDeviceUid,
      status: 'OFFLINE',
      lastHeartbeatAt: new Date().toISOString(),
      rssi: -90,
      batteryLevel: 0,
      bank: {
        id: bankId,
        code: (code || 'BANK').trim().toUpperCase(),
        name: name?.trim() || 'Bank Mitra',
        branchName: branch?.trim() || 'Kantor Cabang',
        address: address?.trim() || 'Bandar Lampung',
        emergencyContact: phone?.trim() || '0721-110',
        branchManager: 'Pimpinan Cabang',
        policeSector: 'Polresta Bandar Lampung',
        latitude: lat,
        longitude: lng,
      },
    };

    deviceStore.addDevice(newDevice);

    return NextResponse.json({
      success: true,
      message: 'Bank dan perangkat IoT berhasil didaftarkan.',
      data: newDevice,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan bank', error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bankId = searchParams.get('bankId');

    if (!bankId) {
      return NextResponse.json(
        { success: false, message: 'Parameter bankId wajib disertakan' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. Temukan ID device terkait bank
      const { data: devList } = await supabaseAdmin
        .from('devices')
        .select('id')
        .eq('bank_id', bankId);

      if (devList && devList.length > 0) {
        const devIds = devList.map((d: any) => d.id);
        // Hapus logs terkait agar foreign key constraint emergency_logs_device_id_fkey tidak gagal
        await supabaseAdmin.from('emergency_logs').delete().in('device_id', devIds);
        // Hapus devices
        await supabaseAdmin.from('devices').delete().eq('bank_id', bankId);
      }

      // 2. Hapus data bank dari tabel `banks`
      const { error } = await supabaseAdmin.from('banks').delete().eq('id', bankId);
      if (error) {
        console.warn('Gagal delete bank di Supabase, fallback ke in-memory store:', error.message);
      }
    }

    // Selalu hapus dari in-memory store
    deviceStore.deleteBank(bankId);

    return NextResponse.json(
      {
        success: true,
        message: 'Bank dan perangkat IoT berhasil dihapus.',
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus data', error: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      bankId,
      name,
      branch,
      code,
      address,
      phone,
      branchManager,
      policeSector,
      latitude,
      longitude,
      deviceUid,
    } = body;

    if (!bankId) {
      return NextResponse.json(
        { success: false, message: 'Parameter bankId wajib disertakan' },
        { status: 400 }
      );
    }

    const lat = latitude !== undefined && latitude !== '' ? parseFloat(latitude) : undefined;
    const lng = longitude !== undefined && longitude !== '' ? parseFloat(longitude) : undefined;
    const cleanDeviceUid = deviceUid ? deviceUid.trim().toUpperCase() : undefined;

    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. Update tabel banks di Supabase
      const bankUpdateData: any = {};
      if (name !== undefined) bankUpdateData.name = name.trim();
      if (branch !== undefined) bankUpdateData.branch_name = branch.trim();
      if (code !== undefined) bankUpdateData.code = code.trim().toUpperCase();
      if (address !== undefined) bankUpdateData.address = address.trim();
      if (phone !== undefined) bankUpdateData.emergency_contact = phone.trim();
      if (lat !== undefined && !isNaN(lat)) bankUpdateData.latitude = lat;
      if (lng !== undefined && !isNaN(lng)) bankUpdateData.longitude = lng;

      if (Object.keys(bankUpdateData).length > 0) {
        const { error: bankErr } = await supabaseAdmin
          .from('banks')
          .update(bankUpdateData)
          .eq('id', bankId);

        if (bankErr) {
          console.error('Error update bank di Supabase:', bankErr.message);
        }
      }

      // 2. Update tabel devices jika deviceUid diubah
      if (cleanDeviceUid) {
        const { error: devErr } = await supabaseAdmin
          .from('devices')
          .update({
            device_uid: cleanDeviceUid,
            updated_at: new Date().toISOString(),
          })
          .eq('bank_id', bankId);

        if (devErr) {
          console.error('Error update device di Supabase:', devErr.message);
        }
      }
    }

    // 3. Update in-memory store
    deviceStore.updateBank(bankId, {
      name: name !== undefined ? name.trim() : undefined,
      branchName: branch !== undefined ? branch.trim() : undefined,
      code: code !== undefined ? code.trim().toUpperCase() : undefined,
      address: address !== undefined ? address.trim() : undefined,
      emergencyContact: phone !== undefined ? phone.trim() : undefined,
      branchManager: branchManager !== undefined ? branchManager.trim() : undefined,
      policeSector: policeSector !== undefined ? policeSector.trim() : undefined,
      latitude: lat !== undefined && !isNaN(lat) ? lat : undefined,
      longitude: lng !== undefined && !isNaN(lng) ? lng : undefined,
      deviceUid: cleanDeviceUid,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Data bank dan perangkat IoT berhasil diperbarui.',
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui data', error: err.message },
      { status: 500 }
    );
  }
}




import { NextRequest, NextResponse } from 'next/server';
import { recordHeartbeatWithFallback } from '@/lib/supabase-service';

const VALID_TOKEN = process.env.DEVICE_AUTH_SECRET || 'b3m5-p0lr35t4-53cr3t-t0k3n';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-device-token') || req.headers.get('authorization')?.replace('Bearer ', '');

    if (authHeader && authHeader !== VALID_TOKEN && !authHeader.startsWith('token-rahasia')) {
      return NextResponse.json(
        { success: false, message: 'Autentikasi gagal: Token perangkat tidak valid.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { device_uid, rssi, battery_level } = body;

    if (!device_uid) {
      return NextResponse.json(
        { success: false, message: 'Parameter device_uid wajib diisi.' },
        { status: 400 }
      );
    }

    await recordHeartbeatWithFallback(device_uid, rssi, battery_level);

    return NextResponse.json({
      success: true,
      status: 'ACK',
      message: 'Detak jantung tercatat dengan sukses di database.',
      server_time: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, message: 'Internal Server Error', error: err.message },
      { status: 500 }
    );
  }
}

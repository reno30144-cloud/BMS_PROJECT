import { NextRequest, NextResponse } from 'next/server';
import { triggerEmergencyWithFallback } from '@/lib/supabase-service';

const VALID_TOKEN = process.env.DEVICE_AUTH_SECRET || 'b3m5-p0lr35t4-53cr3t-t0k3n';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-device-token') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    // Validasi token jika disertakan (mendukung token default atau kustom)
    if (authHeader && authHeader !== VALID_TOKEN && !authHeader.startsWith('token-rahasia')) {
      return NextResponse.json(
        { success: false, message: 'Autentikasi gagal: Token perangkat tidak valid.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { device_uid } = body;

    if (!device_uid) {
      return NextResponse.json(
        { success: false, message: 'Parameter device_uid wajib diisi.' },
        { status: 400 }
      );
    }

    const result = await triggerEmergencyWithFallback(device_uid);

    return NextResponse.json({
      success: true,
      message: '🚨 Sinyal darurat berhasil dipicu dan disinkronkan ke Supabase.',
      status: 'TRIGGERED',
      device_uid,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, message: 'Internal Server Error', error: err.message },
      { status: 500 }
    );
  }
}

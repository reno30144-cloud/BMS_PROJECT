import { NextRequest, NextResponse } from 'next/server';
import { resetEmergencyWithFallback } from '@/lib/supabase-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { device_uid, operator_name, resolution_notes } = body;

    if (!device_uid) {
      return NextResponse.json(
        { success: false, message: 'Parameter device_uid wajib disertakan.' },
        { status: 400 }
      );
    }

    const operator = operator_name || 'Petugas SPKT Polresta';
    const notes = resolution_notes || 'Telah ditindaklanjuti dan situasi dipastikan aman.';

    await resetEmergencyWithFallback(device_uid, operator, notes);

    return NextResponse.json({
      success: true,
      message: 'Status darurat berhasil direset kembali ke STANDBY (Aman).',
      status: 'STANDBY',
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

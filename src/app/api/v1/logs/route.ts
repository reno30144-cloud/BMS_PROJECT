export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getLogsWithFallback, clearLogsWithFallback } from '@/lib/supabase-service';
import { verifyAdminRequest } from '@/lib/rbac';

export async function GET() {
  try {
    const logs = await getLogsWithFallback();
    return NextResponse.json(
      { success: true, data: { logs } },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil log', error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const authCheck = await verifyAdminRequest(req);
    if (!authCheck.allowed) {
      return NextResponse.json(
        { success: false, message: authCheck.message },
        { status: 403 }
      );
    }

    const result = await clearLogsWithFallback();
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message || 'Gagal membersihkan log' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Semua catatan log insiden berhasil dibersihkan.' },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, message: 'Gagal membersihkan log', error: err.message },
      { status: 500 }
    );
  }
}

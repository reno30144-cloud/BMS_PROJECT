export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { polsekStore, INITIAL_POLSEKS } from '@/lib/polsek-store';
import { PoliceStation } from '@/types/bems';

export async function GET() {
  try {
    let polseks: PoliceStation[] = polsekStore.getPolseks();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data: dbPolseks, error } = await supabaseAdmin
          .from('banks')
          .select('*')
          .eq('branch_name', 'SERVER_POLSEK');

        if (!error && dbPolseks && dbPolseks.length > 0) {
          const mapped: PoliceStation[] = dbPolseks.map((b: any) => ({
            id: b.id,
            name: b.name,
            address: b.address,
            latitude: b.latitude ? parseFloat(b.latitude) : -5.4012,
            longitude: b.longitude ? parseFloat(b.longitude) : 105.2425,
            code: b.code,
            isServerNode: true,
            createdAt: b.created_at,
          }));

          // Gabungkan data Supabase dengan Polsek default (hindari duplikasi berdasarkan nama)
          const nameMap = new Map<string, PoliceStation>();
          INITIAL_POLSEKS.forEach((p) => nameMap.set(p.name.toLowerCase().trim(), p));
          mapped.forEach((p) => nameMap.set(p.name.toLowerCase().trim(), p));

          polseks = Array.from(nameMap.values());
          polsekStore.setPolseks(polseks);
        }
      } catch (dbErr) {
        console.warn('Gagal memuat polsek dari Supabase, menggunakan polsekStore:', dbErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: polseks,
        total: polseks.length,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data kantor polsek', error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, address, latitude, longitude } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Nama Polsek wajib diisi.' },
        { status: 400 }
      );
    }

    if (!address || !address.trim()) {
      return NextResponse.json(
        { success: false, message: 'Alamat Polsek wajib diisi.' },
        { status: 400 }
      );
    }

    const lat = latitude ? parseFloat(latitude) : -5.4012;
    const lng = longitude ? parseFloat(longitude) : 105.2425;

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { success: false, message: 'Koordinat Latitude dan Longitude harus berupa angka yang valid.' },
        { status: 400 }
      );
    }

    let polsekId = `polsek-${Date.now()}`;
    const cleanName = name.trim();
    const cleanAddress = address.trim();
    const cleanCode = `POLSEK-${(cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'POL').toUpperCase()}-${Date.now().toString().slice(-4)}`;

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data: dbData, error: dbErr } = await supabaseAdmin
          .from('banks')
          .insert({
            name: cleanName,
            branch_name: 'SERVER_POLSEK',
            code: cleanCode,
            address: cleanAddress,
            emergency_contact: '110',
            latitude: lat,
            longitude: lng,
          })
          .select('id, created_at')
          .single();

        if (!dbErr && dbData) {
          polsekId = dbData.id;
        } else if (dbErr) {
          console.warn('Gagal menyimpan polsek ke Supabase:', dbErr.message);
        }
      } catch (err) {
        console.warn('Error Supabase insert polsek:', err);
      }
    }

    const newPolsek: PoliceStation = {
      id: polsekId,
      name: cleanName,
      address: cleanAddress,
      latitude: lat,
      longitude: lng,
      code: cleanCode,
      isServerNode: true,
      createdAt: new Date().toISOString(),
    };

    polsekStore.addPolsek(newPolsek);

    return NextResponse.json({
      success: true,
      message: `Kantor ${cleanName} berhasil didaftarkan sebagai Server Wilayah.`,
      data: newPolsek,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan kantor polsek', error: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, address, latitude, longitude } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID Polsek wajib disertakan.' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Nama Polsek wajib diisi.' },
        { status: 400 }
      );
    }

    if (!address || !address.trim()) {
      return NextResponse.json(
        { success: false, message: 'Alamat Polsek wajib diisi.' },
        { status: 400 }
      );
    }

    const lat = latitude ? parseFloat(latitude) : -5.4012;
    const lng = longitude ? parseFloat(longitude) : 105.2425;

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { success: false, message: 'Koordinat Latitude dan Longitude harus berupa angka yang valid.' },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanAddress = address.trim();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin
          .from('banks')
          .update({
            name: cleanName,
            address: cleanAddress,
            latitude: lat,
            longitude: lng,
          })
          .eq('id', id);
      } catch (err) {
        console.warn('Gagal update polsek di Supabase:', err);
      }
    }

    polsekStore.updatePolsek(id, {
      name: cleanName,
      address: cleanAddress,
      latitude: lat,
      longitude: lng,
    });

    return NextResponse.json({
      success: true,
      message: `Data ${cleanName} berhasil diperbarui.`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui kantor polsek', error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID Polsek wajib disertakan.' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('banks').delete().eq('id', id);
      } catch (err) {
        console.warn('Gagal menghapus polsek dari Supabase:', err);
      }
    }

    polsekStore.deletePolsek(id);

    return NextResponse.json({
      success: true,
      message: 'Kantor Polsek berhasil dihapus.',
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus kantor polsek', error: err.message },
      { status: 500 }
    );
  }
}


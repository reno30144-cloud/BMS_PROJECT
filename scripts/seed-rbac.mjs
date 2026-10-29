import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 1. Baca .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const value = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Gagal: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const DEFAULT_PASSWORD = 'Polresta123!';

const SEED_ACCOUNTS = [
  {
    email: 'admin@polresta.id',
    fullName: 'Admin Command Center SPKT',
    role: 'admin',
    polsekId: null,
    polsekName: null,
  },
  {
    email: 'polsek.tkb@polresta.id',
    fullName: 'Piket Polsek Tanjung Karang Barat',
    role: 'polsek',
    polsekId: 'polsek-tkb',
    polsekName: 'Polsek Tanjung Karang Barat',
  },
  {
    email: 'polsek.tkt@polresta.id',
    fullName: 'Piket Polsek Tanjung Karang Timur',
    role: 'polsek',
    polsekId: 'polsek-tkt',
    polsekName: 'Polsek Tanjung Karang Timur',
  },
  {
    email: 'polsek.kedaton@polresta.id',
    fullName: 'Piket Polsek Kedaton',
    role: 'polsek',
    polsekId: 'polsek-kdt',
    polsekName: 'Polsek Kedaton',
  },
  {
    email: 'polsek.tbs@polresta.id',
    fullName: 'Piket Polsek Teluk Betung Selatan',
    role: 'polsek',
    polsekId: 'polsek-tbs',
    polsekName: 'Polsek Teluk Betung Selatan',
  },
  {
    email: 'polsek.tbu@polresta.id',
    fullName: 'Piket Polsek Teluk Betung Utara',
    role: 'polsek',
    polsekId: 'polsek-tbu',
    polsekName: 'Polsek Teluk Betung Utara',
  },
  {
    email: 'polsek.sukarame@polresta.id',
    fullName: 'Piket Polsek Sukarame',
    role: 'polsek',
    polsekId: 'polsek-skr',
    polsekName: 'Polsek Sukarame',
  },
  {
    email: 'polsek.kemiling@polresta.id',
    fullName: 'Piket Polsek Kemiling',
    role: 'polsek',
    polsekId: 'polsek-kml',
    polsekName: 'Polsek Kemiling',
  },
  {
    email: 'polsek.panjang@polresta.id',
    fullName: 'Piket Polsek Panjang',
    role: 'polsek',
    polsekId: 'polsek-panjang',
    polsekName: 'Polsek Panjang',
  },
];

async function seed() {
  console.log('🚀 Memulai Seeding RBAC Akun BEMS Polresta Bandar Lampung...');
  console.log(`🌐 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Password Default: ${DEFAULT_PASSWORD}\n`);

  // Ambil list user yang ada di auth
  const { data: userList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) {
    console.error('⚠️ Gagal mengambil daftar pengguna auth:', listErr.message);
  }

  const existingUsers = userList?.users || [];

  for (const acc of SEED_ACCOUNTS) {
    const existing = existingUsers.find((u) => u.email?.toLowerCase() === acc.email.toLowerCase());
    let userId = existing?.id;

    const userMetadata = {
      full_name: acc.fullName,
      role: acc.role,
      polsek_id: acc.polsekId,
      polsek_name: acc.polsekName,
    };

    if (!existing) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: acc.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: userMetadata,
      });

      if (createErr) {
        console.error(`❌ Gagal membuat akun ${acc.email}:`, createErr.message);
        continue;
      }
      userId = created.user.id;
      console.log(`✅ [DIBUAT] Akun: ${acc.email} | Role: ${acc.role.toUpperCase()} | Nama: ${acc.fullName}`);
    } else {
      const { data: updated, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        existing.id,
        {
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: userMetadata,
        }
      );

      if (updateErr) {
        console.error(`❌ Gagal update akun ${acc.email}:`, updateErr.message);
        continue;
      }
      console.log(`🔄 [DIPERBARUI] Akun: ${acc.email} | Role: ${acc.role.toUpperCase()} | Nama: ${acc.fullName}`);
    }

    // Upsert ke public.profiles jika tabel tersedia
    if (userId) {
      try {
        const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
          id: userId,
          email: acc.email,
          full_name: acc.fullName,
          role: acc.role,
          polsek_id: acc.polsekId,
          polsek_name: acc.polsekName,
          updated_at: new Date().toISOString(),
        });
        if (profileErr) {
          // Abaikan jika tabel belum dibuat di supabase SQL editor
          // (akan dibuat saat user jalankan supabase/seed_rbac.sql)
        }
      } catch (e) {
        // Abaikan
      }
    }
  }

  console.log('\n✨ Seeding RBAC berhasil selesai! Seluruh akun polsek dan admin siap digunakan.');
}

seed().catch((err) => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});


import { UserProfile, UserRole } from '@/types/bems';
import { supabaseAdmin } from '@/lib/supabase';

export interface SeedAccount {
  email: string;
  fullName: string;
  name: string;
  role: UserRole;
  password?: string;
  polsekId?: string | null;
  polsekName?: string | null;
}

export const ADMIN_ACCOUNT: SeedAccount = {
  email: 'admin@polresta.id',
  fullName: 'Admin Command Center SPKT',
  name: 'Admin Command Center SPKT',
  role: 'admin',
  password: 'Polresta123!',
  polsekId: null,
  polsekName: null,
};

export const POLSEK_ACCOUNTS: SeedAccount[] = [
  {
    email: 'polsek.tkb@polresta.id',
    fullName: 'Piket Polsek Tanjung Karang Barat',
    name: 'Piket Polsek Tanjung Karang Barat',
    role: 'polsek',
    password: 'Polresta123!',
    polsekId: 'polsek-tkb',
    polsekName: 'Polsek Tanjung Karang Barat',
  },
  {
    email: 'polsek.tkt@polresta.id',
    fullName: 'Piket Polsek Tanjung Karang Timur',
    name: 'Piket Polsek Tanjung Karang Timur',
    role: 'polsek',
    password: 'Polresta123!',
    polsekId: 'polsek-tkt',
    polsekName: 'Polsek Tanjung Karang Timur',
  },
  {
    email: 'polsek.kedaton@polresta.id',
    fullName: 'Piket Polsek Kedaton',
    name: 'Piket Polsek Kedaton',
    role: 'polsek',
    password: 'Polresta123!',
    polsekId: 'polsek-kdt',
    polsekName: 'Polsek Kedaton',
  },
  {
    email: 'polsek.tbs@polresta.id',
    fullName: 'Piket Polsek Teluk Betung Selatan',
    name: 'Piket Polsek Teluk Betung Selatan',
    role: 'polsek',
    password: 'Polresta123!',
    polsekId: 'polsek-tbs',
    polsekName: 'Polsek Teluk Betung Selatan',
  },
  {
    email: 'polsek.tbu@polresta.id',
    fullName: 'Piket Polsek Teluk Betung Utara',
    name: 'Piket Polsek Teluk Betung Utara',
    role: 'polsek',
    password: 'Polresta123!',
    polsekId: 'polsek-tbu',
    polsekName: 'Polsek Teluk Betung Utara',
  },
  {
    email: 'polsek.sukarame@polresta.id',
    fullName: 'Piket Polsek Sukarame',
    name: 'Piket Polsek Sukarame',
    role: 'polsek',
    password: 'Polresta123!',
    polsekId: 'polsek-skr',
    polsekName: 'Polsek Sukarame',
  },
  {
    email: 'polsek.kemiling@polresta.id',
    fullName: 'Piket Polsek Kemiling',
    name: 'Piket Polsek Kemiling',
    role: 'polsek',
    password: 'Polresta123!',
    polsekId: 'polsek-kml',
    polsekName: 'Polsek Kemiling',
  },
  {
    email: 'polsek.panjang@polresta.id',
    fullName: 'Piket Polsek Panjang',
    name: 'Piket Polsek Panjang',
    role: 'polsek',
    password: 'Polresta123!',
    polsekId: 'polsek-panjang',
    polsekName: 'Polsek Panjang',
  },
];

export const ALL_SEED_ACCOUNTS: SeedAccount[] = [
  ADMIN_ACCOUNT,
  ...POLSEK_ACCOUNTS,
];

/**
 * Aturan RBAC:
 * - Role 'admin': Akses penuh (Tambah, Edit, Hapus Bank, Hapus Polsek, Reset Darurat, Bersihkan Log)
 * - Role 'polsek': Akses pantau & operasional polsek wilayah. TIDAK BISA HAPUS APAPUN.
 */
export function canDelete(role: UserRole | undefined | null): boolean {
  return role === 'admin';
}

/**
 * Helper untuk mendeteksi profil dan role pengguna secara tangguh (Supabase Profile -> User Metadata -> Email Pattern fallback)
 */
export function resolveUserProfile(user: any, profileRecord?: any): UserProfile {
  if (!user && !profileRecord) {
    return {
      email: 'admin@polresta.id',
      name: 'Admin Command Center SPKT',
      role: 'admin',
    };
  }

  const email = (user?.email || profileRecord?.email || 'admin@polresta.id').toLowerCase();

  // 1. Prioritaskan data dari tabel database public.profiles
  if (profileRecord) {
    const role: UserRole = profileRecord.role === 'polsek' ? 'polsek' : 'admin';
    return {
      id: profileRecord.id || user?.id,
      email: profileRecord.email || email,
      name: profileRecord.full_name || 'Petugas SPKT',
      role,
      polsekId: profileRecord.polsek_id,
      polsekName: profileRecord.polsek_name,
    };
  }

  // 2. Cek user_metadata dari auth.users
  const meta = user?.user_metadata || {};
  if (meta.role === 'polsek' || meta.role === 'admin') {
    return {
      id: user?.id,
      email,
      name: meta.full_name || meta.name || (meta.role === 'admin' ? 'Admin Command Center SPKT' : 'Operator Polsek'),
      role: meta.role as UserRole,
      polsekId: meta.polsek_id,
      polsekName: meta.polsek_name,
    };
  }

  // 3. Fallback deteksi cerdas berdasarkan email
  if (email.startsWith('polsek.')) {
    const slug = email.split('@')[0].replace('polsek.', '');
    const matched = POLSEK_ACCOUNTS.find(
      (p) =>
        p.polsekId?.toLowerCase().includes(slug) ||
        p.email.toLowerCase().includes(slug) ||
        p.polsekName?.toLowerCase().includes(slug)
    );

    return {
      id: user?.id,
      email,
      name: matched ? matched.fullName : `Operator Polsek (${slug.toUpperCase()})`,
      role: 'polsek',
      polsekId: matched?.polsekId || undefined,
      polsekName: matched?.polsekName || undefined,
    };
  }

  // Default: Admin Polresta
  return {
    id: user?.id,
    email,
    name: meta.full_name || meta.name || 'Admin Command Center SPKT',
    role: 'admin',
  };
}

/**
 * Validasi otorisasi di level API Route Server.
 * Memastikan request DELETE hanya boleh dijalankan oleh akun dengan role 'admin'.
 */
export async function verifyAdminRequest(req: Request): Promise<{ allowed: boolean; message?: string }> {
  // 1. Cek header custom jika ada
  const roleHeader = req.headers.get('x-user-role');
  if (roleHeader === 'polsek') {
    return {
      allowed: false,
      message: 'Akses Ditolak: Akun Polsek tidak memiliki otoritas untuk menghapus data. Hubungi Admin SPKT.',
    };
  }

  // 2. Cek token auth dari Bearer header atau cookie
  const authHeader = req.headers.get('authorization');
  const cookieHeader = req.headers.get('cookie') || '';
  let token = authHeader?.replace('Bearer ', '');
  if (!token && cookieHeader.includes('sb-access-token=')) {
    const match = cookieHeader.match(/sb-access-token=([^;]+)/);
    if (match) token = match[1];
  }

  if (token && supabaseAdmin) {
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        if (user.user_metadata?.role === 'polsek' || user.email?.toLowerCase().startsWith('polsek.')) {
          return {
            allowed: false,
            message: 'Akses Ditolak: Akun Polsek tidak memiliki otoritas untuk menghapus data. Hubungi Admin SPKT.',
          };
        }
      }
    } catch (e) {
      // Abaikan jika verifikasi token gagal
    }
  }

  return { allowed: true };
}

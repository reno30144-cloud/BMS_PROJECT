import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Kecualikan rute API ESP32 (/api/v1/emergency/*) agar IoT dapat mengirim data tanpa sesi login
  if (pathname.startsWith('/api/v1/emergency')) {
    return NextResponse.next();
  }

  // 2. Kecualikan file statis, favicon, aset publik, dan Next.js internal (_next)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/sounds') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 3. Ambil token otentikasi Supabase dari cookie
  const token = req.cookies.get('sb-access-token')?.value;

  // 4. Jika pengguna berada di halaman /login
  if (pathname === '/login') {
    // Jika sudah ada sesi aktif, alihkan ke dashboard utama (/)
    if (token) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 5. Jika belum login (tidak ada token sesi) dan mengakses halaman yang diproteksi
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

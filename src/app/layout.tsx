import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SystemBootSplash } from '@/components/SystemBootSplash';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'BEMS - Bank Emergency Monitoring System | Polresta Bandar Lampung',
  description:
    'Sistem Pemantauan Keamanan Real-Time Bank & Command Center Polresta Bandar Lampung dengan Perangkat IoT ESP32-C3',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">
        <SystemBootSplash />
        {children}
      </body>
    </html>
  );
}

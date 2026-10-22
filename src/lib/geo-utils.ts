// Geolocation & Route Calculation Utilities for Polresta Bandar Lampung
// File terpisah tanpa ketergantungan Leaflet DOM/window agar aman di-render di SSR Next.js

export const POLRESTA_HQ_POSITION: [number, number] = [-5.422580839765763, 105.25378881116067];

/**
 * Menghitung jarak geodesik menggunakan rumus Haversine (km)
 */
export const calculateDistanceKm = (pos1: [number, number], pos2: [number, number]): number => {
  const R = 6371;
  const dLat = ((pos2[0] - pos1[0]) * Math.PI) / 180;
  const dLon = ((pos2[1] - pos1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pos1[0] * Math.PI) / 180) *
      Math.cos((pos2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

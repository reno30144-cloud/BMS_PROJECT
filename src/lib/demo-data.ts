import { Device } from '@/types/bems';

const now = Date.now();
const minutesAgo = (mins: number) => new Date(now - mins * 60 * 1000).toISOString();

export const INITIAL_DEVICES: Device[] = [
  {
    id: '88ca26f7-0a4c-4a82-b47c-a00d12bbc450',
    bankId: '5f239045-4a4a-41df-aa44-0de85f0b95db',
    deviceUid: 'ESPC32-B',
    status: 'STANDBY',
    lastHeartbeatAt: minutesAgo(1),
    rssi: -55,
    batteryLevel: 98,
    bank: {
      id: '5f239045-4a4a-41df-aa44-0de85f0b95db',
      code: 'MANDIRI TKK',
      name: 'BANK MANDIRI',
      branchName: 'KCP Tanjungkarang Kartini',
      address: 'Jl. Kartini No.79, Tj. Karang, Kec. Tj. Karang Pusat, Kota Bandar Lampung',
      emergencyContact: '085783440436',
      branchManager: 'Pimpinan Cabang',
      policeSector: 'Polsek Tanjung Karang Barat',
      latitude: -5.424,
      longitude: 105.259,
    },
  },
];

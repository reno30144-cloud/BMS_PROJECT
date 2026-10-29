import { PoliceStation } from '@/types/bems';

export const INITIAL_POLSEKS: PoliceStation[] = [
  {
    id: 'polsek-tkb',
    name: 'Polsek Tanjung Karang Barat',
    address: 'Jl. Imam Bonjol No. 12, Kel. Gedong Air, Kec. Tanjung Karang Barat, Kota Bandar Lampung',
    latitude: -5.4012,
    longitude: 105.2425,
    code: 'POLSEK-TKB',
    isServerNode: true,
  },
  {
    id: 'polsek-tkt',
    name: 'Polsek Tanjung Karang Timur',
    address: 'Jl. Raden Intan No. 24, Kec. Tanjung Karang Timur, Kota Bandar Lampung',
    latitude: -5.4180,
    longitude: 105.2750,
    code: 'POLSEK-TKT',
    isServerNode: true,
  },
  {
    id: 'polsek-kdt',
    name: 'Polsek Kedaton',
    address: 'Jl. Teuku Umar No. 1, Kedaton, Kec. Kedaton, Kota Bandar Lampung',
    latitude: -5.3789,
    longitude: 105.2635,
    code: 'POLSEK-KDT',
    isServerNode: true,
  },
  {
    id: 'polsek-tbs',
    name: 'Polsek Teluk Betung Selatan',
    address: 'Jl. Basuki Rahmat No. 1, Teluk Betung, Kec. Teluk Betung Selatan, Kota Bandar Lampung',
    latitude: -5.4480,
    longitude: 105.2680,
    code: 'POLSEK-TBS',
    isServerNode: true,
  },
  {
    id: 'polsek-tbu',
    name: 'Polsek Teluk Betung Utara',
    address: 'Jl. Warsito No. 15, Kec. Teluk Betung Utara, Kota Bandar Lampung',
    latitude: -5.4345,
    longitude: 105.2610,
    code: 'POLSEK-TBU',
    isServerNode: true,
  },
  {
    id: 'polsek-skr',
    name: 'Polsek Sukarame',
    address: 'Jl. Ryacudu No. 8, Kec. Sukarame, Kota Bandar Lampung',
    latitude: -5.3850,
    longitude: 105.3020,
    code: 'POLSEK-SKR',
    isServerNode: true,
  },
  {
    id: 'polsek-kml',
    name: 'Polsek Kemiling',
    address: 'Jl. Pramuka No. 10, Kec. Kemiling, Kota Bandar Lampung',
    latitude: -5.3920,
    longitude: 105.2210,
    code: 'POLSEK-KML',
    isServerNode: true,
  },
  {
    id: 'polsek-panjang',
    name: 'Polsek Panjang',
    address: 'Jl. Yos Sudarso No. 45, Panjang, Kota Bandar Lampung',
    latitude: -5.4720,
    longitude: 105.3150,
    code: 'POLSEK-PANJANG',
    isServerNode: true,
  },
];

class PolsekStore {
  private polseks: PoliceStation[] = [...INITIAL_POLSEKS];

  public getPolseks(): PoliceStation[] {
    return [...this.polseks];
  }

  public getPolsekById(id: string): PoliceStation | undefined {
    return this.polseks.find((p) => p.id === id);
  }

  public addPolsek(polsek: PoliceStation): void {
    const existingIdx = this.polseks.findIndex(
      (p) => p.id === polsek.id || (polsek.name && p.name.toLowerCase() === polsek.name.toLowerCase())
    );
    if (existingIdx !== -1) {
      this.polseks[existingIdx] = polsek;
    } else {
      this.polseks.unshift(polsek);
    }
  }

  public updatePolsek(id: string, updated: Partial<PoliceStation>): void {
    const idx = this.polseks.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.polseks[idx] = {
        ...this.polseks[idx],
        ...updated,
      };
    }
  }

  public deletePolsek(id: string): void {
    this.polseks = this.polseks.filter((p) => p.id !== id);
  }

  public setPolseks(list: PoliceStation[]): void {
    this.polseks = list;
  }
}

export const polsekStore = new PolsekStore();


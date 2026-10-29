import { PoliceStation } from '@/types/bems';

/**
 * Data awal Polsek dikosongkan agar pengguna dapat menambahkan data server Polsek sendiri.
 */
export const INITIAL_POLSEKS: PoliceStation[] = [];

class PolsekStore {
  private polseks: PoliceStation[] = [];

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

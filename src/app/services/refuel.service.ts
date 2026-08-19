import { Injectable, signal, computed } from '@angular/core';
import { RefuelRecord } from '../models/refuel.model';
import { SupabaseService } from './supabase.service';

const STORAGE_KEY = 'repostation_records_v1';
const MIN_DATE_STRING = '2026-08-01';
const MIN_MONTH_KEY = '2026-08';

export interface MonthOption {
  key: string;   // YYYY-MM
  label: string; // e.g. "Agosto 2026"
}

@Injectable({
  providedIn: 'root'
})
export class RefuelService {
  records = signal<RefuelRecord[]>([]);
  selectedMonthKey = signal<string>(MIN_MONTH_KEY);

  selectedMonthRecords = computed(() => {
    const key = this.selectedMonthKey();
    return this.records().filter(r => r.fecha && r.fecha.startsWith(key));
  });

  monthlyTotalExpense = computed(() => {
    return this.selectedMonthRecords().reduce((sum, r) => sum + r.total, 0);
  });

  monthlyTotalLiters = computed(() => {
    return this.selectedMonthRecords().reduce((sum, r) => sum + r.litros, 0);
  });

  monthlyAvgPricePerLiter = computed(() => {
    const totalLitres = this.monthlyTotalLiters();
    if (totalLitres === 0) return 0;
    return this.monthlyTotalExpense() / totalLitres;
  });

  monthlyRefuelCount = computed(() => {
    return this.selectedMonthRecords().length;
  });

  selectedMonthLabel = computed(() => {
    const key = this.selectedMonthKey();
    const [year, month] = key.split('-');
    const monthsNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthIndex = parseInt(month, 10) - 1;
    const monthName = monthsNames[monthIndex] || month;
    return `${monthName} ${year}`;
  });

  availableMonths = computed<MonthOption[]>(() => {
    const monthsNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const monthSet = new Set<string>();

    this.records().forEach(r => {
      if (r.fecha && r.fecha >= MIN_DATE_STRING) {
        const key = r.fecha.slice(0, 7);
        if (key >= MIN_MONTH_KEY) {
          monthSet.add(key);
        }
      }
    });

    if (monthSet.size === 0) {
      monthSet.add(MIN_MONTH_KEY);
    }

    const sortedKeys = Array.from(monthSet).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map(key => {
      const [year, month] = key.split('-');
      const monthIndex = parseInt(month, 10) - 1;
      const name = monthsNames[monthIndex] || month;
      return {
        key,
        label: `${name} ${year}`
      };
    });
  });

  constructor(private supabaseService: SupabaseService) {
    this.initRecords();
  }

  async initRecords() {
    if (this.supabaseService.isConfigured()) {
      await this.fetchFromSupabase();
    } else {
      this.records.set(this.loadInitialLocalRecords());
    }

    const available = this.availableMonths();
    if (available.length > 0 && !available.some(m => m.key === this.selectedMonthKey())) {
      this.selectedMonthKey.set(available[0].key);
    }
  }

  async fetchFromSupabase() {
    const client = this.supabaseService.client;
    if (!client) return;

    try {
      const { data, error } = await client
        .from('repostajes')
        .select('*')
        .gte('fecha', MIN_DATE_STRING)
        .order('fecha', { ascending: false });

      if (error) {
        console.error('Error fetching repostajes from Supabase:', error);
        this.records.set(this.loadInitialLocalRecords());
        return;
      }

      if (data) {
        const mapped: RefuelRecord[] = data.map(item => ({
          id: item.id,
          fecha: item.fecha,
          precioPorLitro: Number(item.precio_por_litro),
          litros: Number(item.litros),
          total: Number(item.total),
          gasolinera: item.gasolinera
        }));
        this.records.set(mapped);
      }
    } catch (err) {
      console.error('Exception fetching from Supabase:', err);
      this.records.set(this.loadInitialLocalRecords());
    }
  }

  async addRecord(data: Omit<RefuelRecord, 'id'>): Promise<{ success: boolean; message?: string }> {
    if (!data.fecha || data.fecha < MIN_DATE_STRING) {
      return { 
        success: false, 
        message: 'No se guardó el registro. Solo se permiten repostajes a partir de Agosto de 2026.' 
      };
    }

    const client = this.supabaseService.client;
    const user = this.supabaseService.currentUser();

    if (client && user) {
      try {
        const { data: inserted, error } = await client
          .from('repostajes')
          .insert([{
            user_id: user.id,
            fecha: data.fecha,
            precio_por_litro: data.precioPorLitro,
            litros: data.litros,
            total: data.total,
            gasolinera: data.gasolinera
          }])
          .select();

        if (error) {
          console.error('Error inserting to Supabase:', error);
          return { success: false, message: 'Error de Supabase: ' + error.message };
        }

        if (inserted && inserted.length > 0) {
          const item = inserted[0];
          const newRecord: RefuelRecord = {
            id: item.id,
            fecha: item.fecha,
            precioPorLitro: Number(item.precio_por_litro),
            litros: Number(item.litros),
            total: Number(item.total),
            gasolinera: item.gasolinera
          };
          const updated = [newRecord, ...this.records()];
          this.records.set(updated);
        }
      } catch (err: any) {
        return { success: false, message: 'Error de red con Supabase: ' + err.message };
      }
    } else {
      const newRecord: RefuelRecord = {
        ...data,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6)
      };
      const updated = [newRecord, ...this.records()];
      this.records.set(updated);
      this.saveToLocalStorage(updated);
    }

    const recordMonthKey = data.fecha.slice(0, 7);
    this.selectedMonthKey.set(recordMonthKey);

    return { success: true };
  }

  async deleteRecord(id: string) {
    const client = this.supabaseService.client;

    if (client && this.supabaseService.currentUser()) {
      try {
        const { error } = await client
          .from('repostajes')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting from Supabase:', error);
        }
      } catch (err) {
        console.error('Error deleting record from Supabase:', err);
      }
    }

    const updated = this.records().filter(r => r.id !== id);
    this.records.set(updated);
    this.saveToLocalStorage(updated);

    const available = this.availableMonths();
    if (available.length > 0 && !available.some(m => m.key === this.selectedMonthKey())) {
      this.selectedMonthKey.set(available[0].key);
    }
  }

  private loadInitialLocalRecords(): RefuelRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: RefuelRecord[] = JSON.parse(stored);
        const valid = parsed.filter(r => r.fecha && r.fecha >= MIN_DATE_STRING);
        this.saveToLocalStorage(valid);
        return valid;
      }
    } catch (e) {
      console.error('Error al leer de localStorage:', e);
    }

    const defaultData: RefuelRecord[] = [
      {
        id: '1',
        fecha: '2026-08-15',
        precioPorLitro: 1.489,
        litros: 42.5,
        total: 63.28,
        gasolinera: 'Costco - Gasolina'
      },
      {
        id: '2',
        fecha: '2026-08-08',
        precioPorLitro: 1.519,
        litros: 40.0,
        total: 60.76,
        gasolinera: 'Farruco - Diésel'
      },
      {
        id: '3',
        fecha: '2026-08-02',
        precioPorLitro: 1.549,
        litros: 38.2,
        total: 59.17,
        gasolinera: 'Ballenoil - Gasolina'
      }
    ];

    this.saveToLocalStorage(defaultData);
    return defaultData;
  }

  private saveToLocalStorage(records: RefuelRecord[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Error al guardar en localStorage:', e);
    }
  }
}

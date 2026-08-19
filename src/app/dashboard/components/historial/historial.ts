import { Component, signal, computed } from '@angular/core';
import { CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RefuelService } from '../../../services/refuel.service';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, DatePipe, FormsModule],
  templateUrl: './historial.html',
  styleUrls: ['./historial.css']
})
export class HistorialComponent {
  searchTerm = signal('');
  filterScope = signal<'all' | 'selected'>('all');

  filteredRecords = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const scope = this.filterScope();
    let records = scope === 'selected' 
      ? this.refuelService.selectedMonthRecords() 
      : this.refuelService.records();

    // Ordenar por fecha descendente
    records = [...records].sort((a, b) => b.fecha.localeCompare(a.fecha));

    if (!term) return records;

    return records.filter(r => 
      r.fecha.includes(term) || 
      (r.gasolinera && r.gasolinera.toLowerCase().includes(term)) ||
      r.total.toString().includes(term) ||
      r.litros.toString().includes(term)
    );
  });

  constructor(public refuelService: RefuelService) {}

  getGasolineraName(gasolineraStr?: string): string {
    if (!gasolineraStr) return 'Costco';
    return gasolineraStr.split(' - ')[0] || gasolineraStr;
  }

  getTipoCombustible(gasolineraStr?: string): string {
    if (!gasolineraStr) return 'Gasolina';
    const parts = gasolineraStr.split(' - ');
    return parts[1] || 'Gasolina';
  }

  onDelete(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este registro de repostaje?')) {
      this.refuelService.deleteRecord(id);
    }
  }
}

import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RefuelService } from '../../../services/refuel.service';

@Component({
  selector: 'app-ingreso-datos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ingreso-datos.html',
  styleUrls: ['./ingreso-datos.css']
})
export class IngresoDatosComponent {
  precioPorLitro = signal<number | null>(null);
  litros = signal<number | null>(null);
  total = signal<number | null>(null);
  fecha = signal<string>(this.getTodayString());
  gasolinera = signal<string>('Costco');
  tipoCombustible = signal<string>('Gasolina');

  showForm = signal(false);
  successMessage = signal<string>('');
  errorMessage = signal<string>('');

  constructor(private refuelService: RefuelService) {}

  toggleForm() {
    this.showForm.set(!this.showForm());
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  onPrecioChange(val: number | null) {
    this.precioPorLitro.set(val);
    this.recalculateTotal();
  }

  onLitrosChange(val: number | null) {
    this.litros.set(val);
    this.recalculateTotal();
  }

  private recalculateTotal() {
    const p = this.precioPorLitro();
    const l = this.litros();
    if (p !== null && p > 0 && l !== null && l > 0) {
      const computedTotal = Number((p * l).toFixed(2));
      this.total.set(computedTotal);
    }
  }

  async onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    const p = this.precioPorLitro();
    const l = this.litros();
    const t = this.total();
    const f = this.fecha();

    if (!p || p <= 0 || !l || l <= 0 || !t || t <= 0 || !f) {
      this.errorMessage.set('Por favor completa todos los campos con valores válidos mayores a cero.');
      return;
    }

    if (f < '2026-08-01') {
      this.errorMessage.set('No se permite registrar repostajes anteriores a Agosto de 2026.');
      return;
    }

    const stationName = this.gasolinera() || 'Costco';
    const fuelType = this.tipoCombustible() || 'Gasolina';
    const combinedStation = `${stationName} - ${fuelType}`;

    const result = await this.refuelService.addRecord({
      fecha: f,
      precioPorLitro: p,
      litros: l,
      total: t,
      gasolinera: combinedStation
    });

    if (!result.success) {
      this.errorMessage.set(result.message || 'Error al guardar el registro.');
      return;
    }

    this.successMessage.set('¡Repostaje registrado correctamente!');
    this.showForm.set(false);

    // Resetear formulario
    this.precioPorLitro.set(null);
    this.litros.set(null);
    this.total.set(null);

    setTimeout(() => {
      this.successMessage.set('');
    }, 3000);
  }

  private getTodayString(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    return dateStr < '2026-08-01' ? '2026-08-01' : dateStr;
  }
}

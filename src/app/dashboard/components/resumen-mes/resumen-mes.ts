import { Component } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RefuelService } from '../../../services/refuel.service';

@Component({
  selector: 'app-resumen-mes',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, FormsModule],
  templateUrl: './resumen-mes.html',
  styleUrls: ['./resumen-mes.css']
})
export class ResumenMesComponent {
  constructor(public refuelService: RefuelService) {}

  onMonthChange(monthKey: string) {
    this.refuelService.selectedMonthKey.set(monthKey);
  }
}

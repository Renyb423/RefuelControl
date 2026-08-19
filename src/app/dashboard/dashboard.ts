import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IngresoDatosComponent } from './components/ingreso-datos/ingreso-datos';
import { ResumenMesComponent } from './components/resumen-mes/resumen-mes';
import { HistorialComponent } from './components/historial/historial';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [IngresoDatosComponent, ResumenMesComponent, HistorialComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent {
  constructor(public supabaseService: SupabaseService, private router: Router) {}

  getUserName(): string {
    const user = this.supabaseService.currentUser();
    if (!user) return 'Usuario';

    const metaName = user.user_metadata?.['name'];
    if (metaName && typeof metaName === 'string' && metaName.trim()) {
      return metaName.trim();
    }

    if (user.email) {
      const prefix = user.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }

    return 'Usuario';
  }

  async onLogout() {
    await this.supabaseService.signOut();
    this.router.navigate(['/login']);
  }
}

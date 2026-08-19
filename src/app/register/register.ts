import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  email: string = '';
  name: string = '';
  password: string = '';
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async onRegister() {
    this.errorMessage = '';
    this.successMessage = '';

    const inputEmail = this.email.trim();
    const inputName = this.name.trim();
    const inputPassword = this.password.trim();

    if (!inputEmail || !inputPassword) {
      this.errorMessage = 'Por favor completa todos los campos requeridos.';
      return;
    }

    if (this.supabaseService.isConfigured()) {
      try {
        await this.supabaseService.signUp(inputEmail, inputPassword, inputName);
        this.successMessage = '¡Registro exitoso! Redirigiendo al inicio de sesión...';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      } catch (err: any) {
        console.error('Error en Supabase signUp:', err);
        this.errorMessage = err.message || 'Error al registrar el usuario en Supabase.';
      }
    } else {
      this.errorMessage = 'Supabase no está configurado correctamente en environment.ts.';
    }
  }
}
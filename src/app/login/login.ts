import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],  
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async onLogin() {
    this.errorMessage = '';
    const inputEmail = this.email.trim();
    const inputPassword = this.password.trim();

    if (!inputEmail || !inputPassword) {
      this.errorMessage = 'Por favor ingresa tu email y contraseña.';
      return;
    }

    if (this.supabaseService.isConfigured()) {
      try {
        await this.supabaseService.signIn(inputEmail, inputPassword);
        this.router.navigate(['/dashboard']);
      } catch (err: any) {
        console.error('Error en Supabase signIn:', err);
        this.errorMessage = err.message || 'Error al iniciar sesión.';
      }
    } else {
      this.errorMessage = 'Supabase no está configurado en environment.ts.';
    }
  }
}
import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient | null = null;
  currentUser = signal<User | null>(null);

  constructor() {
    this.initSupabase();
  }

  private initSupabase() {
    const url = environment.supabaseUrl;
    const key = environment.supabaseKey;

    if (url && key && !url.includes('TU_PROYECTO')) {
      try {
        this.supabase = createClient(url, key);

        this.supabase.auth.onAuthStateChange((_event, session) => {
          this.currentUser.set(session?.user ?? null);
        });

        this.supabase.auth.getUser().then(({ data }) => {
          this.currentUser.set(data.user ?? null);
        });
      } catch (e) {
        console.error('Error al inicializar cliente de Supabase:', e);
      }
    }
  }

  get client(): SupabaseClient | null {
    return this.supabase;
  }

  isConfigured(): boolean {
    return !!this.supabase;
  }

  async signUp(email: string, password: string, name?: string) {
    if (!this.supabase) {
      throw new Error('Supabase no está configurado. Por favor agrega tu URL y Anon Key en src/environments/environment.ts.');
    }
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    if (!this.supabase) {
      throw new Error('Supabase no está configurado. Por favor agrega tu URL y Anon Key en src/environments/environment.ts.');
    }
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    if (this.supabase) {
      await this.supabase.auth.signOut();
    }
    this.currentUser.set(null);
  }
}

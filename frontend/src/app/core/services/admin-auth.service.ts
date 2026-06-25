import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { AuthSession, AdminUser } from '../models';
import { ApiClientService } from './api-client.service';

const sessionKey = 'dgac_admin_session';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiClientService);
  private readonly sessionState = signal<AuthSession | null>(this.readSession());

  readonly session = computed(() => this.sessionState());
  readonly isAuthenticated = computed(() => !!this.sessionState()?.token);
  readonly currentUser = computed(() => this.sessionState()?.user ?? null);
  readonly isSuperAdmin = computed(() => this.sessionState()?.user.role === 'super_admin');

  async login(username: string, password: string) {
    const session = await firstValueFrom(
      this.http.post<AuthSession>(this.api.endpoint('/auth/login'), { username, password })
    );

    this.persistSession(session);
    return session;
  }

  async verifySession() {
    const session = this.sessionState();

    if (!session?.token) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ user: AdminUser }>(this.api.endpoint('/auth/me'), {
          headers: this.buildAuthHeaders(session.token)
        })
      );

      this.persistSession({ token: session.token, user: response.user });
      return response.user;
    } catch {
      this.clearSession();
      return null;
    }
  }

  logout() {
    this.clearSession();
  }

  async changePassword(newPassword: string) {
    const headers = this.authHeaders();

    if (!headers) {
      throw new Error('Sesion no disponible.');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ user: AdminUser }>(
          this.api.endpoint('/auth/change-password'),
          { newPassword },
          { headers }
        )
      );

      const session = this.sessionState();

      if (!session) {
        throw new Error('Sesion no disponible.');
      }

      this.persistSession({
        token: session.token,
        user: response.user
      });

      return response.user;
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'error' in error &&
        typeof (error as { error?: { message?: string } }).error?.message === 'string'
          ? (error as { error: { message: string } }).error.message
          : 'No fue posible actualizar la contrasena.';

      throw new Error(message);
    }
  }

  authHeaders() {
    const token = this.sessionState()?.token;
    return token ? this.buildAuthHeaders(token) : undefined;
  }

  private buildAuthHeaders(token: string) {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  private persistSession(session: AuthSession) {
    this.sessionState.set(session);
    localStorage.setItem(sessionKey, JSON.stringify(session));
  }

  private clearSession() {
    this.sessionState.set(null);
    localStorage.removeItem(sessionKey);
  }

  private readSession() {
    const raw = localStorage.getItem(sessionKey);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      localStorage.removeItem(sessionKey);
      return null;
    }
  }
}

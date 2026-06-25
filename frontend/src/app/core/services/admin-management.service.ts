import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { AdminRole, ManagedAdminUser } from '../models';
import { ApiClientService } from './api-client.service';
import { AdminAuthService } from './admin-auth.service';

interface DeleteAdminResponse {
  admin: ManagedAdminUser;
  mode: 'deleted' | 'deactivated';
}

@Injectable({ providedIn: 'root' })
export class AdminManagementService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiClientService);
  private readonly auth = inject(AdminAuthService);

  async listAdmins() {
    return firstValueFrom(
      this.http.get<ManagedAdminUser[]>(this.api.endpoint('/admin/users'), {
        headers: this.requiredHeaders()
      })
    );
  }

  async createAdmin(input: {
    username?: string;
    loginName: string;
    email?: string | null;
    displayName?: string | null;
    role: AdminRole;
  }) {
    return firstValueFrom(
      this.http.post<ManagedAdminUser>(this.api.endpoint('/admin/users'), input, {
        headers: this.requiredHeaders()
      })
    );
  }

  async updateAdmin(
    id: number,
    input: {
      username?: string;
      loginName: string;
      email?: string | null;
      displayName?: string | null;
      role: AdminRole;
      active: boolean;
    }
  ) {
    return firstValueFrom(
      this.http.put<ManagedAdminUser>(this.api.endpoint(`/admin/users/${id}`), input, {
        headers: this.requiredHeaders()
      })
    );
  }

  async deleteAdmin(id: number) {
    return firstValueFrom(
      this.http.delete<DeleteAdminResponse>(this.api.endpoint(`/admin/users/${id}`), {
        headers: this.requiredHeaders()
      })
    );
  }

  private requiredHeaders() {
    const headers = this.auth.authHeaders();

    if (!headers) {
      throw new Error('Sesion no disponible.');
    }

    return headers;
  }
}

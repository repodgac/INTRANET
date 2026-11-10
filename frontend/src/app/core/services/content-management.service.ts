import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ManagedContentSnapshot } from '../models';
import { AdminAuthService } from './admin-auth.service';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class ContentManagementService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AdminAuthService);
  private readonly api = inject(ApiClientService);

  list() {
    return firstValueFrom(
      this.http.get<ManagedContentSnapshot>(this.api.endpoint('/admin/content'), {
        headers: this.auth.authHeaders()
      })
    );
  }

  uploadDocument(input: {
    kind: 'form' | 'spec';
    title: string;
    description: string;
    area: string;
    file: File;
  }) {
    const data = new FormData();
    data.append('kind', input.kind);
    data.append('title', input.title);
    data.append('description', input.description);
    data.append('area', input.area);
    data.append('file', input.file);

    return firstValueFrom(
      this.http.post(this.api.endpoint('/admin/documents'), data, {
        headers: this.auth.authHeaders()
      })
    );
  }

  createLink(input: { title: string; description: string; url: string }) {
    return firstValueFrom(
      this.http.post(this.api.endpoint('/admin/links'), input, {
        headers: this.auth.authHeaders()
      })
    );
  }

  deleteDocument(id: number) {
    return firstValueFrom(
      this.http.delete<{ mode: 'deleted' | 'deactivated' }>(
        this.api.endpoint(`/admin/documents/${id}`),
        { headers: this.auth.authHeaders() }
      )
    );
  }

  deleteLink(id: number) {
    return firstValueFrom(
      this.http.delete<{ mode: 'deleted' }>(this.api.endpoint(`/admin/links/${id}`), {
        headers: this.auth.authHeaders()
      })
    );
  }
}

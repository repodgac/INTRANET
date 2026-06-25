import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { AdminDashboardSnapshot } from '../models';
import { ApiClientService } from './api-client.service';
import { AdminAuthService } from './admin-auth.service';

const visitorKey = 'dgac_visitor_id';
const visitSessionKey = 'dgac_visit_recorded';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiClientService);
  private readonly auth = inject(AdminAuthService);

  trackVisit(path: string) {
    if (sessionStorage.getItem(visitSessionKey) === '1') {
      return;
    }

    sessionStorage.setItem(visitSessionKey, '1');

    void firstValueFrom(
      this.http.post(this.api.endpoint('/analytics/visit'), {
        visitorId: this.getVisitorId(),
        path,
        referrer: document.referrer || null
      })
    ).catch(() => {
      sessionStorage.removeItem(visitSessionKey);
    });
  }

  trackDownload(input: {
    documentId: string;
    title: string;
    filePath: string;
    fileType: string;
    area?: string | null;
  }) {
    void firstValueFrom(
      this.http.post(this.api.endpoint('/analytics/download'), {
        visitorId: this.getVisitorId(),
        ...input
      })
    ).catch(() => undefined);
  }

  async getDashboard() {
    const headers = this.auth.authHeaders();

    return firstValueFrom(
      this.http.get<AdminDashboardSnapshot>(this.api.endpoint('/admin/dashboard'), { headers })
    );
  }

  private getVisitorId() {
    const existing = localStorage.getItem(visitorKey);

    if (existing) {
      return existing;
    }

    const generated =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    localStorage.setItem(visitorKey, generated);
    return generated;
  }
}

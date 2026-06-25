import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly baseUrl = '/api';

  endpoint(path: string) {
    return `${this.baseUrl}${path}`;
  }
}

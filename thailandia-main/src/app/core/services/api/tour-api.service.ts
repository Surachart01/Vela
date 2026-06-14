import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TourApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tours`;

  listTours(filters?: { city?: string; country?: string; search?: string; limit?: number; page?: number }) {
    let params = new HttpParams();
    if (filters?.city) params = params.set('city', filters.city);
    if (filters?.country) params = params.set('country', filters.country);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit.toString());
    if (filters?.page) params = params.set('page', filters.page.toString());
    return this.http.get<{ data: any[]; total: number }>(this.apiUrl, { params });
  }

  getTour(id: string | number) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createTour(data: any) {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateTour(id: string | number, data: any) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteTour(id: string | number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}

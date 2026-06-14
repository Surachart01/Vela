import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HotelApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/hotels`;

  listHotels(filters?: { city?: string; country?: string; search?: string; limit?: number; page?: number }) {
    let params = new HttpParams();
    if (filters?.city) params = params.set('city', filters.city);
    if (filters?.country) params = params.set('country', filters.country);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit.toString());
    if (filters?.page) params = params.set('page', filters.page.toString());
    return this.http.get<{ data: any[]; total: number }>(this.apiUrl, { params });
  }

  getCities() {
    return this.http.get<string[]>(`${this.apiUrl}/cities`);
  }

  getHotel(id: string | number) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createHotel(data: any) {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateHotel(id: string | number, data: any) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteHotel(id: string | number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}

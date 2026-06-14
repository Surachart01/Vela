import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TripApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/trips`;

  listTrips(status?: 'approved' | 'pending') {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<any[]>(this.apiUrl, { params });
  }

  getTrip(id: string | number) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createTrip(data: any) {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateTrip(id: string | number, data: any) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  updateTripStatus(id: string | number, status: string) {
    return this.http.put<any>(`${this.apiUrl}/${id}/status`, { status });
  }

  deleteTrip(id: string | number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  convertToBooking(id: string | number) {
    return this.http.put<any>(`${this.apiUrl}/${id}/convert`, {});
  }
}

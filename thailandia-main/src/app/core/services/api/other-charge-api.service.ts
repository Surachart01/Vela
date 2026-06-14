import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OtherChargeApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/other-charges`;

  listOtherCharges() {
    return this.http.get<any[]>(this.apiUrl);
  }

  getOtherCharge(id: string | number) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createOtherCharge(data: any) {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateOtherCharge(id: string | number, data: any) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteOtherCharge(id: string | number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}

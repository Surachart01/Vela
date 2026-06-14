import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/payments`;

  listPayments() {
    return this.http.get<any[]>(this.apiUrl);
  }

  updatePayment(id: string | number, data: any) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  generateInvoice(id: string | number) {
    return this.http.get(`${this.apiUrl}/${id}/invoice`, { responseType: 'blob' });
  }

  generateTaxInvoice(id: string | number) {
    return this.http.get(`${this.apiUrl}/${id}/tax-invoice`, { responseType: 'blob' });
  }
}

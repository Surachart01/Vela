import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupplierApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/suppliers`;


  listSuppliers() {
    return this.http.get<any[]>(this.apiUrl);
  }

  getSupplier(id: string | number) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createSupplier(data: any) {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateSupplier(id: string | number, data: any) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }


  deleteSupplier(id: string | number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }


}

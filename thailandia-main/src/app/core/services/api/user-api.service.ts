import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  listUsers() {
    return this.http.get<any[]>(this.apiUrl);
  }

  getUser(id: string | number) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createUser(data: any) {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateUser(id: string | number, data: any) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteUser(id: string | number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}

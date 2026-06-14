import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MarkupApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/markups`;

  listMarkups() {
    return this.http.get<any[]>(this.apiUrl);
  }

  getMarkupGroups() {
    return this.http.get<any[]>(`${this.apiUrl}/groups`);
  }

  getMarkup(id: string | number) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createMarkup(data: any) {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateMarkup(id: string | number, data: any) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteMarkup(id: string | number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}

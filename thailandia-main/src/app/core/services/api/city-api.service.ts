import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CityApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/cities`;

  listCities(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  addCity(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateCity(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteCity(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}

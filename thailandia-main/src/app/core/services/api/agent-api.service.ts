import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AgentApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/agents`;

  listAgents() {
    return this.http.get<any[]>(this.apiUrl);
  }

  /** ดึง Markup ของ Agent ที่ผูกกับ user ที่ login อยู่ */
  getMyMarkup() {
    return this.http.get<any>(`${this.apiUrl}/my-markup`);
  }

  /** ดึง Markup ของ Agent ตาม ID (สำหรับ admin ที่ต้องการดู markup ของ agent ที่เลือก) */
  getAgentMarkup(id: string | number) {
    return this.http.get<any>(`${this.apiUrl}/${id}/markup`);
  }

  createAgent(data: any) {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateAgent(id: string | number, data: any) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteAgent(id: string | number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}

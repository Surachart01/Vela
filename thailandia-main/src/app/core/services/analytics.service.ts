import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface DashboardMetrics {
  totalQuotations: { value: number, change: string };
  confirmedBookings: { value: number, change: string };
  conversionRate: { value: number, change: string };
  averageDealSize: { value: number, change: string };
  avgCloseTime: { value: number, change: string };
  winRate: { value: number, change: string };
  
  monthlyRevenue: { value: number, change: string };
  collectionRate: { value: number, change: string };
  quotationsPerWeek: { value: number, change: string };
  outstandingAmount: { value: number, change: string };
  
  repeatCustomerRate: { value: number, change: string };
  totalUniqueClients: { value: number, change: string };
  highValueBookings: { value: number, change: string };
  mediumValueBookings: { value: number, change: string };
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/analytics`;

  public metrics = signal<DashboardMetrics | null>(null);
  public trends = signal<any[]>([]);
  public isLoading = signal<boolean>(false);

  async refreshData() {
    this.isLoading.set(true);
    try {
      const [metrics, trends] = await Promise.all([
        firstValueFrom(this.http.get<DashboardMetrics>(`${this.apiUrl}/metrics`)),
        firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/trends`))
      ]);
      this.metrics.set(metrics);
      this.trends.set(trends);
    } catch (err) {
      console.error('Failed to refresh analytics data:', err);
    } finally {
      this.isLoading.set(false);
    }
  }
}

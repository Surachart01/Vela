import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics.service';
import { TranslationService } from '../../core/services/translation.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalyticsComponent implements OnInit {
  public analyticsService = inject(AnalyticsService);
  public translationService = inject(TranslationService);
  public t = this.translationService.translations;

  periodType = signal<string>('Single Month');
  trendType = signal<string>('Quotations');
  months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  ngOnInit() {
    this.analyticsService.refreshData();
  }

  onRefresh() {
    this.analyticsService.refreshData();
  }

  getTrendValue(trend: any): number {
    switch(this.trendType()) {
      case 'Quotations': return parseInt(trend.quotations) || 0;
      case 'Bookings': return parseInt(trend.bookings) || 0;
      case 'Revenue': return parseFloat(trend.revenue) || 0;
      default: return 0;
    }
  }

  getMaxTrendValue(): number {
    const values = this.analyticsService.trends().map(t => this.getTrendValue(t));
    const max = Math.max(...values, 10); // at least 10 for scale
    return max;
  }
}

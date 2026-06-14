import { Component, inject, signal, computed, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { TourApiService } from '../../../core/services/api/tour-api.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-tours',
  templateUrl: './tours.html',
  styleUrls: ['./tours.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToursComponent implements OnInit {
  private translationService = inject(TranslationService);
  private tourApiService = inject(TourApiService);
  private cd = inject(ChangeDetectorRef);
  public authService = inject(AuthService);
  public t = this.translationService.translations;

  // State
  public toursList = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  
  // Search & Pagination State
  public searchQuery = signal<string>('');
  public currentPage = signal<number>(1);
  public itemsPerPage = signal<number>(25);
  public totalItems = signal<number>(0);

  // Computed
  public totalPages = computed(() => Math.ceil(this.totalItems() / this.itemsPerPage()));
  public startIndex = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage() + 1);
  public endIndex = computed(() => Math.min(this.currentPage() * this.itemsPerPage(), this.totalItems()));

  constructor() {
    // Re-fetch when page or limit changes
    effect(() => {
      this.currentPage();
      this.itemsPerPage();
      this.loadTours();
    });
  }

  ngOnInit() {
    this.loadTours();
  }

  onSearch() {
    this.currentPage.set(1);
    this.loadTours();
  }

  loadTours() {
    this.isLoading.set(true);
    const filters = {
      search: this.searchQuery(),
      limit: this.itemsPerPage(),
      page: this.currentPage()
    };

    this.tourApiService.listTours(filters).subscribe({
      next: (res) => {
        this.toursList.set(res.data);
        this.totalItems.set(res.total);
        this.isLoading.set(false);
        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('Error loading tours:', err);
        this.isLoading.set(false);
        this.cd.markForCheck();
      }
    });
  }

  // Pagination Helpers
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push(-1); // Ellipsis
      
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (current < total - 2) pages.push(-1); // Ellipsis
      pages.push(total);
    }
    return pages;
  }

  formatValidDays(validDays: any): string {
    if (!validDays) return 'N/A';
    
    let days: any = validDays;
    if (typeof validDays === 'string') {
      try {
        days = JSON.parse(validDays);
      } catch (e) {
        return validDays; 
      }
    }
    
    const dayLabels: any = {
      mon: 'Mon',
      tue: 'Tue',
      wed: 'Wed',
      thu: 'Thu',
      fri: 'Fri',
      sat: 'Sat',
      sun: 'Sun'
    };
    
    const activeDays = Object.keys(dayLabels)
      .filter(key => days[key] === true)
      .map(key => dayLabels[key]);
      
    return activeDays.length > 0 ? activeDays.join(', ') : 'None';
  }

  deleteTour(id: string | number) {
    if (confirm('Are you sure you want to delete this tour?')) {
      this.tourApiService.deleteTour(id).subscribe(() => {
        this.loadTours();
      });
    }
  }
}

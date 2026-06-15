import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { HotelApiService } from '../../../core/services/api/hotel-api.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-hotels',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './hotels.html',
  styleUrl: './hotels.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HotelsComponent implements OnInit {
  private translationService = inject(TranslationService);
  private hotelApiService = inject(HotelApiService);
  public masterData = inject(MasterDataService);
  public authService = inject(AuthService);
  public t = this.translationService.translations;

  // Helpers for filter persistence
  private getSavedFilter(key: string, defaultValue: string): string {
    const saved = sessionStorage.getItem(`cp_hotels_${key}`);
    return saved !== null ? saved : defaultValue;
  }

  private getSavedFilterNum(key: string, defaultValue: number): number {
    const saved = sessionStorage.getItem(`cp_hotels_${key}`);
    return saved !== null ? Number(saved) : defaultValue;
  }

  // State
  public hotelsList = signal<any[]>([]);
  public isLoading = signal<boolean>(false);

  // Filter State
  public filterCity = signal<string>(this.getSavedFilter('city', ''));
  public filterCountry = signal<string>(this.getSavedFilter('country', ''));

  // Search & Pagination State
  public searchQuery = signal<string>(this.getSavedFilter('search', ''));
  public currentPage = signal<number>(this.getSavedFilterNum('page', 1));
  public itemsPerPage = signal<number>(this.getSavedFilterNum('limit', 25));
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
      this.loadHotels();
    });
  }

  ngOnInit() {
    this.masterData.refresh().subscribe();
    this.loadHotels();
  }

  onSearch() {
    this.currentPage.set(1);
    this.loadHotels();
  }

  clearFilters() {
    sessionStorage.removeItem('cp_hotels_city');
    sessionStorage.removeItem('cp_hotels_country');
    sessionStorage.removeItem('cp_hotels_search');
    sessionStorage.removeItem('cp_hotels_page');
    this.filterCity.set('');
    this.filterCountry.set('');
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadHotels();
  }

  loadHotels() {
    this.isLoading.set(true);
    const search = this.searchQuery();
    const city = this.filterCity();
    const country = this.filterCountry();
    const limit = this.itemsPerPage();
    const page = this.currentPage();

    // Save filters to sessionStorage
    sessionStorage.setItem('cp_hotels_search', search);
    sessionStorage.setItem('cp_hotels_city', city);
    sessionStorage.setItem('cp_hotels_country', country);
    sessionStorage.setItem('cp_hotels_limit', String(limit));
    sessionStorage.setItem('cp_hotels_page', String(page));

    const filters: { city?: string; country?: string; search?: string; limit: number; page: number } = {
      search: search || undefined,
      city: city || undefined,
      country: country || undefined,
      limit,
      page
    };

    this.hotelApiService.listHotels(filters).subscribe({
      next: (res) => {
        this.hotelsList.set(res.data);
        this.totalItems.set(res.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading hotels:', err);
        this.isLoading.set(false);
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

  deleteHotel(id: number | string) {
    if (confirm('Are you sure you want to delete this hotel?')) {
      this.hotelApiService.deleteHotel(id).subscribe(() => {
        this.loadHotels();
      });
    }
  }
}

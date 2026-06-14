import { Component, ChangeDetectionStrategy, signal, inject, OnInit, ChangeDetectorRef, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { ExcursionApiService } from '../../../core/services/api/excursion-api.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { MasterDataService } from '../../../core/services/master-data.service';

@Component({
  selector: 'app-excursions',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './excursions.html',
  styleUrl: './excursions.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExcursionsComponent implements OnInit {
  private translationService = inject(TranslationService);
  private excursionApiService = inject(ExcursionApiService);
  private cd = inject(ChangeDetectorRef);
  public authService = inject(AuthService);
  public masterData = inject(MasterDataService);
  public t = this.translationService.translations;

  // State
  public excursionsList = signal<any[]>([]);
  public isLoading = signal<boolean>(false);
  
  // Search & Pagination State
  public searchQuery = signal<string>('');
  public filterCountry = signal<string>('');
  public filterCity = signal<string>('');
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
      this.loadExcursions();
    });
  }

  ngOnInit() {
    this.masterData.refresh().subscribe();
    this.loadExcursions();
  }

  onSearch() {
    this.currentPage.set(1);
    this.loadExcursions();
  }

  loadExcursions() {
    this.isLoading.set(true);
    const filters = {
      search: this.searchQuery(),
      country: this.filterCountry(),
      city: this.filterCity(),
      limit: this.itemsPerPage(),
      page: this.currentPage()
    };

    this.excursionApiService.listExcursions(filters).subscribe({
      next: (res) => {
        this.excursionsList.set(res.data);
        this.totalItems.set(res.total);
        this.isLoading.set(false);
        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('Error loading excursions:', err);
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

  deleteExcursion(id: string | number) {
    if (confirm(`Delete excursion?`)) {
      this.excursionApiService.deleteExcursion(id).subscribe(() => {
        this.loadExcursions();
      });
    }
  }
}

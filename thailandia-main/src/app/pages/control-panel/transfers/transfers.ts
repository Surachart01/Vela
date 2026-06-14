import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { TransferApiService } from '../../../core/services/api/transfer-api.service';
import { PdfService } from '../../../core/services/pdf.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { MasterDataService } from '../../../core/services/master-data.service';

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './transfers.html',
  styleUrl: './transfers.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransfersComponent implements OnInit {
  private translationService = inject(TranslationService);
  private transferApiService = inject(TransferApiService);
  private pdfService = inject(PdfService);
  private router = inject(Router);
  public authService = inject(AuthService);
  public masterData = inject(MasterDataService);
  public t = this.translationService.translations;

  // State
  public transfersList = signal<any[]>([]);
  public isLoading = signal<boolean>(false);

  // Filter State (matching home page pattern)
  public countryFilter = signal<string>('');
  public cityFilter = signal<string>('');
  public searchQuery = signal<string>('');
  public typeFilter = signal<string>('');
  // Use masterData.cities so newly added cities from Countries page appear here
  public cities = this.masterData.cities;

  // Pagination State
  public currentPage = signal<number>(1);
  public itemsPerPage = signal<number>(25);
  public totalItems = signal<number>(0);

  // Computed
  public totalPages = computed(() => Math.ceil(this.totalItems() / this.itemsPerPage()));
  public startIndex = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage() + 1);
  public endIndex = computed(() => Math.min(this.currentPage() * this.itemsPerPage(), this.totalItems()));

  constructor() {
    // Re-fetch when page, limit, or type-filter changes
    effect(() => {
      this.currentPage();
      this.itemsPerPage();
      this.typeFilter();
      this.loadTransfers();
    });
  }

  ngOnInit() {
    // Always refresh so newly added cities appear in the filter dropdown
    this.masterData.refresh().subscribe();
    this.loadTransfers();
  }

  onSearch() {
    this.currentPage.set(1);
    this.loadTransfers();
  }

  loadTransfers() {
    this.isLoading.set(true);
    const filters = {
      country: this.countryFilter(),
      city: this.cityFilter(),
      search: this.searchQuery(),
      type: this.typeFilter(),
      limit: this.itemsPerPage(),
      page: this.currentPage()
    };

    this.transferApiService.listTransfers(filters).subscribe({
      next: (res) => {
        this.transfersList.set(res.data);
        this.totalItems.set(res.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading transfers:', err);
        this.isLoading.set(false);
      }
    });
  }

  viewItem(item: any) {
    this.router.navigate(['/home/view/transfer', item.id], { queryParams: { mode: 'view' } });
  }

  printItemPdf(item: any) {
    this.transferApiService.getTransfer(item.id).subscribe(full => {
      const pdfItem = {
        id: full.id,
        name: full.name,
        city: full.city,
        transfer_type: full.transfer_type,
        departure: full.departure,
        arrival: full.arrival,
        description: full.description,
        sic_price_adult: full.sic_price_adult,
        sic_price_child: full.sic_price_child,
        prices: (full.pricing || []).map((p: any) => ({
          dateFrom: p.start_date,
          dateTo: p.end_date,
          pax: p.pax,
          price: p.price,
          cost: p.cost
        }))
      };
      this.pdfService.generateItemPdf(pdfItem, 'transfers');
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
      if (current > 3) pages.push(-1);
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push(-1);
      pages.push(total);
    }
    return pages;
  }

  deleteTransfer(id: number | string) {
    if (confirm('Are you sure you want to delete this transfer?')) {
      this.transferApiService.deleteTransfer(id).subscribe(() => {
        this.loadTransfers();
      });
    }
  }
}

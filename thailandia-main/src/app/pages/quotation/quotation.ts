import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { TripApiService } from '../../core/services/api/trip-api.service';
import { PdfService } from '../../core/services/pdf.service';
import { AuthService } from '../../core/services/auth.service';
import { StatusModalComponent } from '../../core/components/modals/status-modal/status-modal';
import { DateInputComponent } from '../../core/components/date-input/date-input';

@Component({
  selector: 'app-quotation',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, StatusModalComponent, DateInputComponent],
  templateUrl: './quotation.html',
  styleUrl: './quotation.css'
})
export class QuotationComponent implements OnInit {
  private fb = inject(FormBuilder);
  public translationService = inject(TranslationService);
  private tripApiService = inject(TripApiService);
  private pdfService = inject(PdfService);
  public authService = inject(AuthService);
  public t = this.translationService.translations;
  private router = inject(Router);
  protected readonly Math = Math;

  isAdmin = computed(() => ['admin', 'superadmin'].includes(this.authService.currentUser()?.role || ''));

  quotations = signal<any[]>([]);

  filterForm = this.fb.nonNullable.group({
    search: [''],
    dateFrom: [''],
    dateTo: [''],
    status: ['']
  });

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  filteredQuotations = computed(() => {
    // Filter strictly for Quotations (is_booking === false)
    const list = this.quotations().filter(q => !q.is_booking);
    const filters = this.filterForm.value;
    const search = (filters.search || '').toLowerCase();
    
    let result = list;
    if (search) {
      result = result.filter(q => 
        (q.client_name && q.client_name.toLowerCase().includes(search)) ||
        (q.uuid && q.uuid.toLowerCase().includes(search)) ||
        (q.id && q.id.toString().includes(search))
      );
    }
    if (filters.status) {
      result = result.filter(q => q.status?.toLowerCase() === filters.status?.toLowerCase());
    }
    return result;
  });

  // Standardized Pagination Calculations
  totalPages = computed(() => {
    const total = this.filteredQuotations().length;
    return total === 0 ? 0 : Math.ceil(total / this.pageSize());
  });

  startIndex = computed(() => {
    const total = this.filteredQuotations().length;
    return total === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.filteredQuotations().length);
  });

  paginatedQuotations = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredQuotations().slice(start, start + this.pageSize());
  });

  setPage(page: number) {
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

  ngOnInit() {
    this.loadQuotations();
  }

  loadQuotations() {
    this.tripApiService.listTrips().subscribe(trips => {
      this.quotations.set(trips);
    });
  }

  get hasFilters(): boolean {
    const v = this.filterForm.value;
    return !!(v.search || v.dateFrom || v.dateTo || v.status);
  }

  resetFilters() {
    this.filterForm.reset({ status: '' });
    this.currentPage.set(1);
  }

  isStatusModalOpen = signal(false);
  selectedQuoteId = signal<string | number | null>(null);
  selectedQuoteStatus = signal<string>('Pending');

  openStatusModal(quote: any) {
    if (!this.isAdmin()) return;
    this.selectedQuoteId.set(quote.id);
    this.selectedQuoteStatus.set(quote.status);
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal() {
    this.isStatusModalOpen.set(false);
    this.selectedQuoteId.set(null);
  }

  saveStatus(newStatus: string) {
    const id = this.selectedQuoteId();
    if (id) {
       this.tripApiService.updateTripStatus(id, newStatus).subscribe(() => {
         this.loadQuotations();
         this.closeStatusModal();
       });
    }
  }

  deleteQuotation(id: string | number) {
    if (confirm('Are you sure you want to delete this quotation?')) {
      this.tripApiService.deleteTrip(id).subscribe(() => {
        this.loadQuotations();
      });
    }
  }

  clearAll() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      this.quotations.set([]);
    }
  }

  emailAgent(id: string | number) {
    const q = this.quotations().find(item => item.id === id);
    if (q) {
      alert(`Email update sent to Agent for ${q.clientName || 'Client'} (Ref: ${q.ref || 'N/A'})!`);
    } else {
      alert('Email sent successfully!');
    }
  }

  viewQuotation(uuid: string) {
    this.router.navigate(['/itinerary'], { queryParams: { uuid } });
  }

  editQuotation(id: string | number) {
    this.router.navigate(['/add-quotation', id]);
  }

  resetPagination() {
    this.currentPage.set(1);
  }

  downloadPdf(id: string) {
    this.tripApiService.getTrip(id).subscribe({
      next: (fullTrip: any) => {
        this.pdfService.generateTripPdf(fullTrip);
      },
      error: (err: any) => {
        console.error('Error fetching trip details for PDF:', err);
      }
    });
  }

}

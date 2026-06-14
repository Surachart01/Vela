import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, from, of } from 'rxjs';
import { concatMap, toArray, catchError, map } from 'rxjs/operators';
import { DateInputComponent } from '../../../core/components/date-input/date-input';
import { TranslationService } from '../../../core/services/translation.service';
import { TripApiService } from '../../../core/services/api/trip-api.service';
import { PdfService } from '../../../core/services/pdf.service';

import { TransferApiService } from '../../../core/services/api/transfer-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { EmailApiService } from '../../../core/services/api/email-api.service';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, DateInputComponent],
  templateUrl: './bookings.html',
  styleUrl: './bookings.css'
})
export class BookingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  public translationService = inject(TranslationService);
  public authService = inject(AuthService);
  public t = this.translationService.translations;
  private tripApiService = inject(TripApiService);
  private pdfService = inject(PdfService);
  private toastService = inject(ToastService);
  private emailApiService = inject(EmailApiService);
  protected readonly Math = Math;

  selectedBookingIds = signal<Set<number>>(new Set());

  isAdmin = computed(() => ['admin', 'superadmin'].includes(this.authService.currentUser()?.role || ''));

  bookings = signal<any[]>([]);
  currentPage = signal<number>(1);
  pageSize = signal<number>(25);

  filterForm = this.fb.nonNullable.group({
    search: [''],
    dateFrom: [''],
    dateTo: [''],
    status: ['All Status']
  });

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.tripApiService.listTrips().subscribe(trips => {
      this.bookings.set(trips);
      // Clear selection after load
      this.selectedBookingIds.set(new Set());
    });
  }

  get hasFilters(): boolean {
    return this.filterForm.value.search !== '' ||
           this.filterForm.value.dateFrom !== '' ||
           this.filterForm.value.dateTo !== '' ||
           this.filterForm.value.status !== 'All Status';
  }

  resetFilters() {
    this.filterForm.reset({
      search: '',
      dateFrom: '',
      dateTo: '',
      status: 'All Status'
    });
    this.currentPage.set(1);
  }

  filteredBookings = computed(() => {
    const filters = this.filterForm.value;
    // Filter strictly for Bookings (is_booking === true)
    const all = this.bookings().filter(b => b.is_booking);
    
    return all.filter(b => {
      const searchMatch = !filters.search || 
        b.client_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        b.uuid?.toLowerCase().includes(filters.search.toLowerCase()) ||
        b.id?.toString().includes(filters.search);
        
      const statusMatch = filters.status === 'All Status' || 
        (filters.status === 'Declined' && b.declined) ||
        (filters.status === 'OnProcess' && b.status === 'OnProcess') ||
        (filters.status === 'InProgress' && !b.declined && b.status !== 'Confirm Booking' && b.status !== 'Approved' && b.status !== 'OnProcess') ||
        (filters.status === 'Confirm Booking' && (b.status === 'Confirm Booking' || b.status === 'Approved'));
        
      return searchMatch && statusMatch;
    });
  });

  // Pagination Calculations
  totalPages = computed(() => {
    const total = this.filteredBookings().length;
    return total === 0 ? 0 : Math.ceil(total / this.pageSize());
  });

  startIndex = computed(() => {
    const total = this.filteredBookings().length;
    return total === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.filteredBookings().length);
  });

  paginatedBookings = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredBookings().slice(start, start + this.pageSize());
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

  resetPagination() {
    this.currentPage.set(1);
  }

  // Multi-selection logic
  toggleSelection(id: number) {
    this.selectedBookingIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  isAllSelectedOnPage() {
    const currentItems = this.paginatedBookings();
    if (currentItems.length === 0) return false;
    return currentItems.every(b => this.selectedBookingIds().has(b.id));
  }

  togglePageSelection() {
    const currentItems = this.paginatedBookings();
    const allSelected = this.isAllSelectedOnPage();
    
    this.selectedBookingIds.update(set => {
      const newSet = new Set(set);
      currentItems.forEach(b => {
        if (allSelected) {
          newSet.delete(b.id);
        } else {
          newSet.add(b.id);
        }
      });
      return newSet;
    });
  }

  confirmSelected() {
    const ids = Array.from(this.selectedBookingIds());
    if (ids.length === 0) return;

    if (confirm(`Are you sure you want to confirm and send email for ${ids.length} booking(s)?`)) {
      this.executeBulkConfirm(ids);
    }
  }

  private executeBulkConfirm(ids: number[]) {
    from(ids).pipe(
      concatMap(id => {
        // 1. Update status
        return this.tripApiService.updateTripStatus(id, 'Confirm Booking').pipe(
          // 2. Fetch full trip details
          concatMap(() => this.tripApiService.getTrip(id)),
          // 3. Send email with full details
          concatMap((fullTrip) => {
            const emailData = {
              ...fullTrip,
              agentEmail: fullTrip.user_email || fullTrip.client_email,
              status: 'Confirm Booking'
            };
            return this.emailApiService.sendAgentBookingNotification(id, emailData);
          }),
          catchError(err => {
            console.error(`Failed for ID ${id}:`, err);
            return of({ error: true, id });
          })
        );
      }),
      toArray()
    ).subscribe({
      next: (results) => {
        const successCount = results.filter((r: any) => !r?.error).length;
        this.toastService.success(`Successfully confirmed and sent emails for ${successCount} booking(s)`);
        this.loadBookings();
      },
      error: (err) => {
        console.error('Bulk confirmation error:', err);
        this.toastService.error('An error occurred during bulk confirmation.');
        this.loadBookings();
      }
    });
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

  isSendingEmail = signal<string | null>(null);

  emailAgent(booking: any) {
    if (!this.isAdmin()) return;
    
    const id = booking.id; // Use numeric ID
    this.isSendingEmail.set(id.toString());
    
    // 1. Update status to Confirm Booking
    this.tripApiService.updateTripStatus(id, 'Confirm Booking').subscribe({
      next: () => {
        // 2. Fetch full trip details to ensure email has everything
        this.tripApiService.getTrip(id).subscribe({
          next: (fullTrip) => {
            // 3. Send email with full data
            const emailData = {
              ...fullTrip,
              agentEmail: fullTrip.user_email || fullTrip.client_email,
              status: 'Confirm Booking'
            };

            this.emailApiService.sendAgentBookingNotification(id, emailData).subscribe({
              next: () => {
                this.toastService.success('Booking confirmed and full details sent to Agent!');
                this.isSendingEmail.set(null);
                this.loadBookings();
              },
              error: (err) => {
                console.error('Failed to send email:', err);
                this.toastService.warning('Status updated, but failed to send email.');
                this.isSendingEmail.set(null);
                this.loadBookings();
              }
            });
          },
          error: (err) => {
            console.error('Failed to fetch full trip details:', err);
            this.toastService.warning('Status updated, but could not fetch details for email.');
            this.isSendingEmail.set(null);
            this.loadBookings();
          }
        });
      },
      error: (err) => {
        console.error('Failed to update status:', err);
        this.toastService.error('Failed to update booking status.');
        this.isSendingEmail.set(null);
      }
    });
  }
}

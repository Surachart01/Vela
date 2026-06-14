import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DateInputComponent } from '../../core/components/date-input/date-input';
import { TranslationService } from '../../core/services/translation.service';
import { PaymentApiService } from '../../core/services/api/payment-api.service';
import { TripApiService } from '../../core/services/api/trip-api.service';
import { PdfService } from '../../core/services/pdf.service';
import { PaymentModalComponent } from '../../core/components/modals/payment-modal/payment-modal';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DateInputComponent, PaymentModalComponent],
  templateUrl: './payment.html',
  styleUrl: './payment.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentComponent implements OnInit {
  public translationService = inject(TranslationService);
  private paymentApiService = inject(PaymentApiService);
  private tripApiService = inject(TripApiService);
  private pdfService = inject(PdfService);
  private route = inject(ActivatedRoute);
  public t = this.translationService.translations;

  searchQuery = signal('');
  dateFrom = signal('');
  dateTo = signal('');
  // ID of trip just converted — used to highlight/scroll to it after redirect
  highlightTripId = signal<string | null>(null);

  hasActiveFilters = signal(false);
  paymentsList = signal<any[]>([]);

  isModalOpen = signal(false);
  selectedPayment = signal<any>(null);

  ngOnInit() {
    // Read query params first, THEN load — so the search filter is ready before data arrives
    const params = this.route.snapshot.queryParams;
    if (params['tripId']) {
      const tripId = params['tripId'].toString();
      this.searchQuery.set(tripId);
      this.highlightTripId.set(tripId);
      this.hasActiveFilters.set(true);
    }
    this.loadPayments();
  }

  loadPayments() {
    this.paymentApiService.listPayments().subscribe({
      next: (payments) => {
        const mapped = payments.map((p: any) => {
          const finalCost = Number(p.final_amount) || 0;
          const amtPaid = Number(p.amount_paid) || 0;
          const penalty = Number(p.penalty_cost) || 0;
          return {
            ...p,
            id: p.id,
            agent: p.agent_name,
            bookingRef: p.booking_reference,
            startDate: p.trip_start_date,
            finalCost: finalCost,
            amtPaid: amtPaid,
            balance: finalCost - amtPaid + penalty,
            pmtDate: p.updated_at,
            penalty: penalty,
            paymentReference: p.remarks
          };
        });
        this.paymentsList.set(mapped);
      },
      error: (err) => {
        console.error('Error loading payments:', err);
      }
    });
  }

  filteredPayments = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const highlight = this.highlightTripId();

    // If coming from Convert redirect, show exact match first by ID/UUID
    if (highlight) {
      const exact = this.paymentsList().filter((p: any) =>
        (p.id && p.id.toString() === highlight) ||
        (p.uuid && p.uuid === highlight)
      );
      if (exact.length > 0) return exact;
    }

    if (!query) return this.paymentsList();

    return this.paymentsList().filter((p: any) =>
      (p.bookingRef && p.bookingRef.toLowerCase().includes(query)) ||
      (p.agent && p.agent.toLowerCase().includes(query)) ||
      (p.client_name && p.client_name.toLowerCase().includes(query)) ||
      (p.uuid && p.uuid.toLowerCase().includes(query)) ||
      (p.id && p.id.toString() === query)  // exact match only for ID
    );
  });

  checkFilters() {
    this.hasActiveFilters.set(
      this.searchQuery().trim() !== '' ||
      this.dateFrom() !== '' ||
      this.dateTo() !== ''
    );
  }

  resetFilters() {
    this.searchQuery.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.highlightTripId.set(null);
    this.hasActiveFilters.set(false);
  }

  onSearch() {
    this.highlightTripId.set(null); // Clear redirect highlight when user manually searches
    this.checkFilters();
  }

  onUpdate(payment: any) {
    this.selectedPayment.set(payment);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedPayment.set(null);
  }

  savePayment(paymentData: any) {
    const current = this.selectedPayment();
    if (!current) return;

    this.paymentApiService.updatePayment(current.id, paymentData).subscribe({
      next: () => {
        this.loadPayments();
        this.closeModal();
      },
      error: (err) => {
        console.error('Error updating payment:', err);
        alert('Failed to update payment');
      }
    });
  }

  downloadInvoice(payment: any) {
    this.tripApiService.getTrip(payment.uuid || payment.id).subscribe({
      next: (fullTrip: any) => {
        this.pdfService.generateInvoicePdf(fullTrip, payment);
      },
      error: (err: any) => {
        console.error('Error fetching trip for invoice:', err);
        alert('Failed to generate invoice PDF.');
      }
    });
  }

  downloadTaxInvoice(id: string | number) {
    this.paymentApiService.generateTaxInvoice(id).subscribe();
  }
}

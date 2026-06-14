import { Injectable, signal } from '@angular/core';

export interface Payment {
  id: string; // Trip ID
  agent: string;
  bookingRef: string;
  startDate: string;
  finalCost: number;
  amtPaid: number;
  balance: number;
  pmtDate: string;
  paymentReference: string;
  penalty: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  public payments = signal<Payment[]>([
    {
      id: '349',
      agent: 'Oltremare/ Caleidoscopio Tour Operator',
      bookingRef: 'B2026AUG0026',
      startDate: '10/08/2026',
      finalCost: 9400.00,
      amtPaid: 0.00,
      balance: 9400.00,
      pmtDate: '',
      paymentReference: '',
      penalty: 0.00
    }
  ]);

  updatePayment(updatedPayment: Payment) {
    this.payments.update(pmts => 
      pmts.map(p => p.id === updatedPayment.id ? updatedPayment : p)
    );
  }

  savePayment(newPayment: Payment) {
    this.payments.update(pmts => [newPayment, ...pmts]);
  }
}

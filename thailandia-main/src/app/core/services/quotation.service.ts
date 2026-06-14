import { Injectable, signal, computed, effect } from '@angular/core';

export interface Quotation {
  id: string;
  ref: string;
  agent: string;
  clientName: string;
  bookingDate: string;
  tripStartDate: string;
  pax: number;
  telephone: string;
  email: string;
  bookingRef: string;
  status: 'Pending' | 'Approved' | 'Cancelled' | 'InProgress' | 'Declined';
  totalPrice: number;
  finalPrice: number;
  discount: number;
  assistanceFee: number;
  remark: string;
  services: {
    flights: any[];
    transfers: any[];
    hotels: any[];
    excursions: any[];
    tours: any[];
    other: any[];
  };
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class QuotationService {
  private readonly STORAGE_KEY = 'thailandia_quotations';
  
  private _quotations = signal<Quotation[]>(this.loadFromStorage());
  
  public quotations = this._quotations.asReadonly();

  constructor() {
    // Save to storage whenever signal changes
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._quotations()));
    });
  }

  private loadFromStorage(): Quotation[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  addQuotation(quotation: Omit<Quotation, 'id' | 'createdAt'>) {
    const newQuotation: Quotation = {
      ...quotation,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    
    this._quotations.update(items => [newQuotation, ...items]);
    return newQuotation;
  }

  getQuotationById(id: string): Quotation | undefined {
    return this._quotations().find(q => q.id === id);
  }

  updateQuotation(id: string, quotation: Partial<Quotation>) {
    this._quotations.update(items =>
      items.map(q => q.id === id ? { ...q, ...quotation } : q)
    );
  }

  deleteQuotation(id: string) {
    this._quotations.update(items => items.filter(q => q.id !== id));
  }

  clearAll() {
    this._quotations.set([]);
  }

  generateRef(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = now.getDate();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `Q${year}${month}${day}${random}`;
  }
}

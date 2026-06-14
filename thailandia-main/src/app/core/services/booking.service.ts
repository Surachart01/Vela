import { Injectable, signal } from '@angular/core';

export interface Booking {
  agent: string;
  quotationRef: string;
  clientName: string;
  bookingDate: string;
  tripStartDate: string;
  pax: number;
  telephone: string;
  bookingRef: string;
  status: string;
  finalCost: number | string;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private bookingsSignal = signal<Booking[]>([
    {
      agent: 'Fantasia Asia Travel Service',
      quotationRef: 'Q2025MAR22OKLX',
      clientName: 'Ms. VINCI FEDERICA',
      bookingDate: '22/03/2025',
      tripStartDate: '25/04/2025',
      pax: 1,
      telephone: '',
      bookingRef: 'B2025APR0001',
      status: 'InProgress',
      finalCost: 25000
    },
    {
      agent: 'Asian Trails Thailand',
      quotationRef: 'Q2025OCT07L35N',
      clientName: 'Mr. COLA GIANLUCA / Ms. S',
      bookingDate: '07/10/2025',
      tripStartDate: '15/11/2025',
      pax: 2,
      telephone: '00000',
      bookingRef: 'B2025NOV0021',
      status: 'InProgress',
      finalCost: 45800
    }
  ]);

  readonly bookings = this.bookingsSignal.asReadonly();

  addBooking(booking: Booking) {
    this.bookingsSignal.update(currentBookings => [booking, ...currentBookings]);
  }

  getBookingById(ref: string): Booking | undefined {
    return this.bookingsSignal().find(b => b.bookingRef === ref);
  }
}

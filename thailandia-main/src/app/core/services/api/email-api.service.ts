import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmailApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/emails`;

  sendHotelBookingEmail(hotelId: number, bookingData: any) {
    return this.http.post<any>(`${this.apiUrl}/send-hotel-booking`, {
      hotel_id: hotelId,
      bookingData: bookingData
    });
  }

  sendAgentBookingNotification(tripId: string | number, data: any) {
    return this.http.post<any>(`${this.apiUrl}/send-agent-notification`, {
      trip_id: tripId,
      ...data
    });
  }
}
